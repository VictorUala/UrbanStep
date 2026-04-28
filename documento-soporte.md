# UrbanStep — Documentación Técnica del Sistema de Atención Automatizada

---

## 1. Descripción General

**UrbanStep** cuenta con un agente conversacional inteligente que automatiza la atención al cliente, el análisis de intención comercial y las acciones de marketing mediante inteligencia artificial y automatización de procesos de negocio (BPA).

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

### Workflow unificado

Todo el sistema vive en un único workflow con cuatro cadenas independientes activadas por triggers distintos:

- **Telegram Trigger / n8n Form**: flujo conversacional principal
- **NPS Form / Webhook**: flujo de encuesta de satisfacción
- **Schedule Trigger (cron `0 12 * * *`)**: seguimiento automático diario a las 9 AM (Argentina)

---

## 3. Flujos de Automatización

### PASO 1 — Identificación y enriquecimiento

Al llegar un mensaje, el sistema identifica si el cliente existe en Supabase (por `telegram_id` o `email`). Si no existe, lo crea automáticamente. Los clientes que llegan solo por Telegram reciben un **email interno** (`telegram-{id}@urbanstep.bot`) para que HubSpot pueda operar sin un email real — cuando el cliente lo provea en la conversación, el sistema lo detecta y actualiza el registro.

Simultáneamente se consulta la **última compra** del cliente en `compras_clientes` para enriquecer el contexto del análisis.

Cada interacción genera inmediatamente un registro en la tabla `logs` con el canal, trigger y tokens consumidos, garantizando trazabilidad completa desde el primer mensaje.

### PASO 2a — Respuesta conversacional (Rama 1)

El AI Agent Conversacional usa **gpt-4o-mini** (Temperature 0.7) para responder en español rioplatense. Al final de cada respuesta incluye dos señales internas que el sistema extrae antes de enviar el texto al cliente:

- `TRIGGER_ANALISIS:SI/NO` — indica si hay intención comercial para correr el análisis
- `TOKENS_R1: input:X,output:Y,total:Z` — estimación de tokens consumidos para monitoreo de costos

### PASO 2b — Análisis analítico (Rama 2)

Cuando hay intención comercial, corre en paralelo el análisis con **GPT-4o via OpenRouter** (Temperature 0.0) usando un Structured Output Parser que garantiza la estructura JSON con 9 campos:

`sentimiento · intencion · etapa_funnel · tipo_nps · prioridad · objecion_principal · resumen · accion_recomendada · tokens`

La combinación de Temperature 0.7 (conversacional) y 0.0 (analítico) garantiza respuestas naturales y clasificaciones deterministas al mismo tiempo.

### PASO 3 — Router de decisiones

El sistema evalúa `etapa_funnel`, `tipo_nps`, `es_recurrente` y `prioridad` para enrutar a 8 ramas de acción distintas.

### PASO 4 — Acciones por rama

| Rama | Acción |
|---|---|
| **Compra** | Upsert HubSpot → Deal → Gmail/Telegram confirmación → Slack ventas |
| **Queja** | Slack #quejas-urgentes → Log |
| **Recurrente** | Telegram fidelización → Foto Promo (desde Supabase) → Log |
| **Nurturing** | Telegram promo → Foto Catálogo (desde Supabase) → Log |
| **NPS** | Sub-Router NPS (5 ramas) → acción específica por tipo |
| **Post-venta / Exploratorio / Fallback** | Log |

Las imágenes de promo y catálogo se almacenan en la tabla `assets_marketing`. El equipo de marketing puede actualizarlas desde Supabase sin tocar el workflow.

---

## 4. Módulo NPS

El campo `tipo_nps` clasifica la respuesta del encuestado en 5 tipos y activa una acción diferente para cada uno:

| tipo_nps | Puntaje | Sentimiento | Acción automática |
|---|---|---|---|
| promotor | 9-10 | positivo | Telegram: beneficio + invitación a referral |
| sugerencia_leve | 8 | neutro | Telegram: agradecimiento al feedback |
| experiencia_neutra | 7 | neutro | Telegram: seguimiento suave |
| friccion_postventa | 5-6 | negativo | Telegram: compensación (envío gratis en próximo pedido) |
| reclamo_fuerte | 0-4 | negativo | Slack #quejas-urgentes: alerta urgente al equipo |

---

## 5. CRM: HubSpot como fuente de verdad comercial

Cada conversación con intención comercial actualiza automáticamente el contacto en HubSpot con 8 propiedades custom:

`etapa_funnel_ia · sentimiento_ia · intencion_ia · objecion_principal_ia · prioridad_ia · tipo_nps_ia · resumen_ia · accion_recomendada_ia`

Adicionalmente, cada mensaje enviado por el bot genera una **Nota de engagement** en el timeline del contacto, permitiendo al equipo comercial ver el historial completo de interacciones automáticas.

---

## 6. Gestión de Errores y Logging

- Los nodos de IA tienen reintentos automáticos (3 intentos, 5 segundos entre reintentos) más un modelo de fallback via OpenRouter
- Los nodos de integraciones externas (HubSpot, Telegram, Slack) continúan el flujo aunque fallen — un error en una integración no detiene el proceso principal
- La tabla `logs` registra estado `exito`, `error` o `fallback` por cada rama ejecutada

---

## 7. Seguimiento Automático

Un proceso programado ejecuta diariamente a las 9 AM (Argentina) y detecta clientes con conversaciones activas pero sin actividad en más de 48 horas. Por cada uno envía un mensaje personalizado por Telegram según la etapa del funnel, marca la conversación como contactada y registra una nota en HubSpot.

---

## 8. Estimación de costos de API

| Modelo | Tokens promedio | Costo estimado/día (100 conversaciones) |
|---|---|---|
| gpt-4o-mini (R1, todas las convs.) | ~250 tokens | ~$0.01 |
| gpt-4o via OpenRouter (R2, solo con intención) | ~400 tokens | ~$0.40 |
| **Total estimado** | | **< $0.50/día** |

Los tokens se registran en cada ejecución en la tabla `logs`, lo que permite monitorear el costo operativo sin acceder al dashboard de OpenAI.

---

## 9. Estructura de Base de Datos (Supabase)

### `clientes`
Registro central de todos los usuarios que interactuaron con el sistema.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único interno (clave primaria) |
| `nombre` | text | Nombre completo del cliente |
| `email` | text | Email real (null si solo vino por Telegram) |
| `telegram_id` | text | ID de cuenta Telegram |
| `canal_origen` | text | Canal de primer contacto (`telegram`, `web`, etc.) |
| `historial_compras` | jsonb[] | Array de compras previas (legacy) |
| `segmento` | text | Segmento de cliente (uso futuro) |
| `fecha_registro` | timestamptz | Fecha de creación del registro |

### `mensajes`
Historial completo de todas las conversaciones.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único del mensaje |
| `cliente_id` | uuid | Referencia al cliente (FK → clientes) |
| `rol` | text | Rol del emisor |
| `contenido` | text | Texto del mensaje |
| `direccion` | text | `entrada` (cliente) o `salida` (bot) |
| `canal` | text | Canal del mensaje (`telegram`, `web`, `nps-form`) |
| `timestamp` | timestamptz | Fecha y hora del mensaje |

### `conversaciones`
Análisis IA de cada conversación. Una fila por sesión de análisis.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único |
| `cliente_id` | uuid | Referencia al cliente |
| `sentimiento` | text | `positivo`, `neutro` o `negativo` |
| `intencion` | text | `alta`, `media` o `baja` |
| `etapa_funnel` | text | `awareness`, `consideracion`, `decision`, `post-venta`, `nps` |
| `objecion_principal` | text | Objeción detectada (precio, talle, envío, etc.) |
| `resumen` | text | Resumen de la conversación (máx. 100 chars) |
| `prioridad` | text | `alta`, `media` o `baja` |
| `accion_recomendada` | text | Acción sugerida por la IA |
| `email_detectado` | text | Email mencionado por el cliente en la conversación |
| `seguimiento_enviado` | boolean | Si ya se envió mensaje de seguimiento automático |
| `timestamp` | timestamptz | Fecha del análisis |

### `logs`
Registro de auditoría de todas las ejecuciones del sistema.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único |
| `cliente_id` | uuid | Referencia al cliente |
| `workflow_id` | text | Identificador del flujo (`v2-parallel`, `seguimiento-automatico`) |
| `rama` | text | Rama ejecutada (`conversacion`, `compra`, `queja`, `nps`, etc.) |
| `estado` | text | `exito`, `error` o `fallback` |
| `detalle` | jsonb | JSON con datos adicionales (tokens, sentimiento, canal, etc.) |
| `error_message` | text | Mensaje de error si aplica |
| `timestamp` | timestamptz | Fecha y hora de la ejecución |

### `compras_clientes`
Historial de compras para detectar clientes recurrentes.

| Campo | Tipo | Descripción |
|---|---|---|
| `email` | text | Email del cliente comprador |
| `producto` | text | Nombre del producto comprado |
| `fecha_compra` | date | Fecha de la compra |
| `canal_venta` | text | Canal donde se realizó la venta |
| `monto` | numeric | Importe de la operación |

### `assets_marketing`
Material visual gestionado por el equipo de marketing.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único |
| `tipo` | text | Tipo de asset (`promo_recurrente`, `catalogo_lookbook`, `logo`) |
| `descripcion` | text | Descripción del contenido |
| `url` | text | URL pública de la imagen (actualizable sin tocar el workflow) |
| `activo` | boolean | Si el asset está activo o fue reemplazado |
| `updated_at` | timestamptz | Fecha de última actualización |
