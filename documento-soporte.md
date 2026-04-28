# UrbanStep — Documento de Soporte Técnico
### Proyecto Integrador M2 · Soy Henry · Abril 2026

---

## 1. Descripción General

**UrbanStep** es un agente conversacional inteligente diseñado para una marca argentina de calzado urbano premium. El sistema automatiza la atención al cliente, el análisis de intención comercial y las acciones de marketing mediante inteligencia artificial y automatización de procesos de negocio (BPA).

El agente opera en tiempo real sobre dos canales principales:
- **Telegram Bot**: conversaciones directas con clientes
- **n8n Forms**: formulario web de consultas y encuestas NPS

El objetivo es que el equipo comercial reciba leads calificados, alertas de urgencia y registros de CRM actualizados automáticamente, sin intervención manual en el flujo.

---

## 2. Arquitectura del Sistema

El sistema fue construido íntegramente en **n8n** (plataforma de automatización low-code) desplegado en Railway, con las siguientes integraciones:

| Servicio | Rol |
|---|---|
| **n8n** (Railway) | Motor de orquestación — 101 nodos en 1 workflow unificado |
| **Supabase** | Base de datos principal: clientes, mensajes, conversaciones, logs, assets |
| **OpenAI / OpenRouter** | Dos modelos de IA en cadena (gpt-4o-mini + gpt-4o) |
| **HubSpot CRM** | Gestión de contactos, deals y propiedades custom de IA |
| **Telegram Bot** | Canal de entrada y salida con el cliente |
| **Slack** | Alertas internas (#alertas-ventas, #quejas-urgentes) |
| **Gmail** | Confirmaciones de compra y seguimiento por email |

### Decisión de diseño: workflow unificado

Se eligió mantener todo en un único workflow para simplificar la operación, el monitoreo y la presentación del flujo completo. El workflow contiene cuatro cadenas independientes activadas por triggers distintos:

- **Telegram Trigger / n8n Form**: flujo conversacional principal
- **NPS Form / Webhook**: flujo de encuesta de satisfacción
- **Schedule Trigger (cron 0 12 \* \* \*)**: seguimiento automático diario a las 9 AM (Argentina)

---

## 3. Flujos de Automatización

### PASO 1 — Identificación y enriquecimiento

Al llegar un mensaje, el sistema identifica si el cliente existe en Supabase (por `telegram_id` o `email`). Si no existe, lo crea con un **email fantasma** (`telegram-{id}@urbanstep.bot`) para que HubSpot no falle en el upsert. Esta extensión `.bot` (3 letras) fue elegida porque HubSpot rechaza extensiones de dominio de más de 3 caracteres.

Simultáneamente se consulta la **última compra** del cliente en la tabla `compras_clientes` para enriquecer el contexto analítico.

Cada interacción genera inmediatamente un **Log Conversacion** en Supabase — esto cumple el requerimiento de "logging desde el primer nodo" del material complementario.

### PASO 2a — Respuesta conversacional (Rama 1)

El AI Agent Conversacional usa **gpt-4o-mini** (Temperature 0.7) para responder en español rioplatense. Al final de cada respuesta incluye dos señales internas:

- `TRIGGER_ANALISIS:SI/NO` — indica si hay intención comercial suficiente para correr el análisis
- `TOKENS_R1: input:X,output:Y,total:Z` — estimación de tokens consumidos

Estas señales son extraídas y removidas del texto antes de enviarlo al cliente.

### PASO 2b — Análisis analítico (Rama 2)

Cuando `TRIGGER_ANALISIS:SI`, corre en paralelo el análisis con **GPT-4o via OpenRouter** (Temperature 0.0) usando un Structured Output Parser que garantiza la estructura JSON con 9 campos:

`sentimiento · intencion · etapa_funnel · tipo_nps · prioridad · objecion_principal · resumen · accion_recomendada · metadata (tokens)`

La combinación de Temperature 0.7 (conversacional) y 0.0 (analítico) es una decisión deliberada de prompt engineering: creatividad para la respuesta humana, determinismo para la clasificación.

### PASO 3 — Router de decisiones

El Switch node evalúa `etapa_funnel`, `tipo_nps`, `es_recurrente` y `prioridad` para enrutar a 8 ramas de acción distintas.

### PASO 4 — Acciones por rama

| Rama | Acción |
|---|---|
| **Compra** | Upsert HubSpot → Deal → Gmail/Telegram confirmación → Slack ventas |
| **Queja** | Slack #quejas-urgentes → Log |
| **Recurrente** | Telegram mensaje fidelización → Foto Promo (assets_marketing) → Log |
| **Nurturing** | Telegram promo → Foto Catálogo (assets_marketing) → Log |
| **NPS** | Sub-Router NPS (5 ramas) → acción específica por tipo |
| **Post-venta / Exploratorio / Fallback** | Log |

Las imágenes de promo y catálogo se almacenan en la tabla `assets_marketing` de Supabase. Esto permite que el equipo de marketing actualice el material visual sin tocar el workflow.

---

## 4. Módulo NPS

El sistema detecta el tipo de encuestado con el campo `tipo_nps` (parte del Structured Output Parser) y lo enruta a acciones específicas:

| tipo_nps | NPS | Sentimiento | Prioridad | Acción |
|---|---|---|---|---|
| promotor | 9-10 | positivo | baja | Telegram: beneficio + referral |
| sugerencia_leve | 8 | neutro | baja | Telegram: agradecimiento |
| experiencia_neutra | 7 | neutro | baja | Telegram: seguimiento suave |
| friccion_postventa | 5-6 | negativo | media | Telegram: compensación (envío gratis) |
| reclamo_fuerte | 0-4 | negativo | alta | Slack #quejas-urgentes: alerta urgente |

La diferenciación entre fricción (5-6) y reclamo (0-4) se logra mediante la regla de prioridad `0-4=alta, 5-8=media, 9-10=baja` en el prompt analítico.

---

## 5. CRM: HubSpot como fuente de verdad comercial

Cada conversación con intención comercial actualiza automáticamente el contacto en HubSpot con 8 propiedades custom de IA:

`etapa_funnel_ia · sentimiento_ia · intencion_ia · objecion_principal_ia · prioridad_ia · tipo_nps_ia · resumen_ia · accion_recomendada_ia`

Adicionalmente, cada mensaje enviado por el bot (fidelización, promo, NPS) genera una **Nota de engagement** en el timeline del contacto. Esto permite al equipo comercial ver exactamente qué comunicaciones automáticas recibió cada lead y en qué estado está.

Para los contactos que llegan solo por Telegram (sin email real), el sistema los registra con email fantasma y los actualiza con el email real en el momento en que el cliente lo menciona en la conversación (detección por regex).

---

## 6. Gestión de Errores y Logging

**Logging desde el primer nodo**: cada ejecución genera mínimo una entrada en la tabla `logs` con `canal`, `trigger`, `tokens_r1` y snippet de respuesta, independientemente de si hay intención comercial o no.

**Manejo de errores**:
- Los nodos de IA tienen `retryOnFail: true` (3 intentos, 5000ms entre reintentos) + modelo fallback (GLM via OpenRouter)
- Los nodos de terceros (HubSpot, Telegram, Slack) tienen `continueOnFail: true` — un error en una integración no detiene el flujo principal
- La tabla `logs` registra estado `exito`, `error` o `fallback` por rama

---

## 7. Seguimiento Automático

Un Schedule Trigger ejecuta diariamente a las 9 AM (Argentina) un barrido de conversaciones donde:
- `seguimiento_enviado = false`
- Etapa del funnel activa (no cerrada)
- Más de 48 horas sin actividad

Por cada cliente encontrado, envía un mensaje personalizado por Telegram según la etapa del funnel, marca la conversación como contactada y crea una Nota en HubSpot documentando el seguimiento.

---

## 8. Estimación de costos de API

| Modelo | Uso | Costo estimado/día (100 conv.) |
|---|---|---|
| gpt-4o-mini (R1) | ~250 tokens/conv. | ~$0.01 |
| gpt-4o via OpenRouter (R2) | ~400 tokens/conv. (solo SI) | ~$0.40 |
| **Total estimado** | | **< $0.50/día** |

Los tokens se estiman y loggean en cada ejecución, permitiendo monitorear el costo operativo sin necesidad de revisar el dashboard de OpenAI.
