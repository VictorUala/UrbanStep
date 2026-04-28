# UrbanStep — Documentación Técnica del Sistema de Atención Automatizada

---

## 1. Descripción General y Propósito Comercial

El **Agente Conversacional UrbanStep** es un sistema automatizado que procesa interacciones de clientes provenientes de Telegram y formularios web (n8n Forms), incluyendo encuestas NPS.

Su propósito comercial es:

- Reducir la carga del equipo de ventas y atención al cliente
- Detectar en tiempo real oportunidades de compra, quejas y clientes recurrentes
- Calificar automáticamente a cada cliente según su intención y etapa del funnel
- Ejecutar acciones automáticas (alertas, deals en HubSpot, seguimientos, promos)
- Mantener trazabilidad completa de todas las conversaciones e interacciones

El sistema trabaja con **arquitectura paralela (prompt dual)**: una rama responde al cliente en tiempo real y otra analiza la conversación completa junto con contexto comercial enriquecido.

---

## 2. Arquitectura del Sistema

El sistema fue construido íntegramente en **n8n** (plataforma de automatización low-code) desplegado en Railway, con las siguientes integraciones:

| Servicio | Rol |
|---|---|
| **n8n** (Railway) | Motor de orquestación — 101 nodos en 1 workflow unificado |
| **Supabase** | Base de datos principal: clientes, mensajes, conversaciones, logs, assets |
| **OpenAI / OpenRouter** | Dos modelos de IA en cadena (gpt-4o-mini + gpt-4o) |
| **HubSpot CRM** | Contactos, deals, propiedades custom de IA y notas de engagement |
| **Telegram Bot** | Canal de entrada y salida con el cliente |
| **Slack** | Alertas internas (#alertas-ventas, #quejas-urgentes) |
| **Gmail** | Confirmaciones de compra y seguimiento por email |

El workflow contiene cuatro cadenas independientes activadas por triggers distintos: Telegram, n8n Form, NPS Form y Schedule (seguimiento automático diario).

---

## 3. Cómo Interactúa el Agente con los Clientes

1. El cliente escribe por Telegram o completa un formulario web / NPS
2. Se identifica o crea el cliente en Supabase usando `telegram_id` o `email`
3. Se guarda el mensaje entrante y se recupera el historial completo
4. Se consulta la **última compra** del cliente para enriquecer el contexto analítico
5. El AI Agent Conversacional (gpt-4o-mini) genera una respuesta natural en español rioplatense
6. La respuesta se envía inmediatamente al cliente vía Telegram
7. En paralelo, si el agente detecta intención comercial, se ejecuta el análisis profundo

El cliente recibe respuestas rápidas y humanas, mientras el sistema analiza y actúa en segundo plano.

Los clientes que llegan solo por Telegram reciben un email interno (`telegram-{id}@urbanstep.bot`) para que HubSpot pueda operar sin un email real. Cuando el cliente lo provea en la conversación, el sistema lo detecta automáticamente y actualiza el registro.

---

## 4. Lógica de Análisis Conversacional

**Rama 1 (Conversacional):** Prompt orientado a empatía y profesionalismo. Responde siempre en tiempo real e incluye `TRIGGER_ANALISIS:SI/NO` al final para señalizar si hay intención comercial.

**Rama 2 (Análisis):** Solo se ejecuta cuando `TRIGGER_ANALISIS:SI`. Usa GPT-4o via OpenRouter (Temperature 0.0) con un Structured Output Parser que garantiza siempre un JSON válido. La combinación de Temperature 0.7 (conversacional) y 0.0 (analítico) garantiza respuestas naturales y clasificaciones deterministas al mismo tiempo.

**Formularios:** Se tratan igual que un mensaje de Telegram, con campos estructurados que enriquecen el contexto desde el primer momento.

**NPS:** Caso especial que incluye puntuación y detecta automáticamente el tipo de encuestado para personalizar la respuesta.

---

## 5. Criterios de Calificación de Clientes

El análisis siempre devuelve los siguientes campos:

| Campo | Valores posibles | Uso principal |
|---|---|---|
| `sentimiento` | positivo / neutro / negativo | Priorización |
| `intencion` | alta / media / baja | Decisión de acción |
| `etapa_funnel` | awareness / consideracion / decision / post-venta / nps | Ruta del router |
| `objecion_principal` | precio / stock / talle / envio / confianza / ninguna / otra | Manejo de objeciones |
| `resumen` | máximo 100 caracteres | Resumen rápido para el equipo |
| `prioridad` | alta / media / baja | Escalado (Slack) |
| `accion_recomendada` | máximo 150 caracteres | Guía para el equipo humano |
| `tipo_nps` | promotor / sugerencia_leve / experiencia_neutra / friccion_postventa / reclamo_fuerte | Sub-router NPS |

---

## 6. Módulo NPS

Cuando llega una encuesta NPS, el campo `tipo_nps` clasifica al encuestado y activa una acción específica:

| tipo_nps | Puntaje | Acción automática |
|---|---|---|
| promotor | 9-10 | Telegram: beneficio + invitación a referral |
| sugerencia_leve | 8 | Telegram: agradecimiento al feedback |
| experiencia_neutra | 7 | Telegram: seguimiento suave |
| friccion_postventa | 5-6 | Telegram: compensación (envío gratis en próximo pedido) |
| reclamo_fuerte | 0-4 | Slack #quejas-urgentes: alerta urgente al equipo |

---

## 7. Acciones que Ejecuta el Sistema

Según la decisión del Router, el sistema ejecuta:

| Situación | Acciones |
|---|---|
| **Queja urgente** | Alerta Slack #quejas-urgentes + Log |
| **Compra inmediata** | Deal en HubSpot + confirmación Gmail/Telegram + Slack ventas |
| **Cliente recurrente** | Telegram fidelización + Foto Promo (desde Supabase) |
| **Nurturing / Exploratorio** | Telegram promo + Foto Catálogo (desde Supabase) |
| **NPS** | Mensaje personalizado por tipo + Nota en HubSpot |
| **Post-venta / Fallback** | Log |

Todas las acciones dejan registro en HubSpot (notas de engagement) y en la tabla `logs` de Supabase.

---

## 8. CRM: HubSpot como Fuente de Verdad Comercial

Cada conversación con intención comercial actualiza automáticamente el contacto en HubSpot con 8 propiedades custom:

`etapa_funnel_ia · sentimiento_ia · intencion_ia · objecion_principal_ia · prioridad_ia · tipo_nps_ia · resumen_ia · accion_recomendada_ia`

Esto permite al equipo comercial ver en tiempo real el estado de cada lead sin necesidad de leer la conversación completa.

---

## 9. Gestión de Errores y Logging

- **Logging desde el primer mensaje**: cada ejecución genera mínimo una entrada en `logs` con canal, trigger y tokens consumidos, independientemente de si hay intención comercial
- **Reintentos automáticos**: los nodos de IA tienen 3 reintentos con 5 segundos entre intentos, más un modelo de fallback (GLM via OpenRouter)
- **Continuidad ante fallos**: los nodos de integraciones externas (HubSpot, Telegram, Slack) no detienen el flujo si fallan — el proceso principal siempre termina
- **Estados**: la tabla `logs` registra `exito`, `error` o `fallback` por rama

---

## 10. Seguimiento Automático

Un proceso programado ejecuta diariamente a las 9 AM (Argentina) y detecta clientes con conversaciones activas pero sin actividad en más de 48 horas. Por cada uno envía un mensaje personalizado por Telegram según la etapa del funnel, marca la conversación como contactada y registra una nota en HubSpot.

---

## 11. Estimación de Costos de API

| Modelo | Tokens promedio | Costo estimado/día (100 conversaciones) |
|---|---|---|
| gpt-4o-mini (R1, todas las convs.) | ~250 tokens | ~$0.01 |
| gpt-4o via OpenRouter (R2, solo con intención) | ~400 tokens | ~$0.40 |
| **Total estimado** | | **< $0.50/día** |

Los tokens se registran en cada ejecución en `logs`, permitiendo monitorear el costo operativo sin acceder al dashboard de OpenAI.

---

## 12. Estructura de Base de Datos (Supabase)

| Tabla | Propósito | Campos principales |
|---|---|---|
| `clientes` | Registro maestro de todos los usuarios | `id`, `telegram_id`, `email`, `nombre`, `canal_origen`, `fecha_registro` |
| `mensajes` | Historial completo de conversaciones | `cliente_id`, `contenido`, `direccion` (entrada/salida), `canal`, `timestamp` |
| `conversaciones` | Resultado del análisis IA por sesión | `cliente_id`, `sentimiento`, `intencion`, `etapa_funnel`, `prioridad`, `resumen`, `accion_recomendada`, `seguimiento_enviado` |
| `compras_clientes` | Historial comercial para enriquecimiento | `email`, `producto`, `monto`, `fecha_compra`, `canal_venta` |
| `logs` | Auditoría completa desde el primer nodo | `cliente_id`, `workflow_id`, `rama`, `estado` (exito/error/fallback), `detalle` (JSON), `timestamp` |
| `assets_marketing` | Material visual gestionado por marketing | `tipo`, `url`, `activo`, `updated_at` |
