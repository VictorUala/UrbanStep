# CONTEXTO: Proyecto Integrador M2 — UrbanStep

## Empresa
**UrbanStep** — empresa de venta de calzado urbano. Comercializa por e-commerce, redes sociales y canales conversacionales. Los clientes consultan sobre disponibilidad, talles, precios, promociones, envíos y recomendaciones. También hay clientes recurrentes que vuelven por nuevas colecciones, cambios o garantías.

**Problema:** El volumen de conversaciones creció y el equipo no logra responder ni priorizar. Se pierden ventas, no se detectan clientes listos para comprar, y no hay trazabilidad.

---

## Stack Técnico
| Herramienta | Rol |
|---|---|
| **n8n** | Orquestador central — triggers, routers, validaciones, decisiones |
| **Telegram Bot API** | Canal conversacional principal (simula WhatsApp/Instagram) |
| **n8n Forms** | Entrada web — captación de leads, solicitudes, NPS |
| **OpenAI API** | Análisis de conversaciones → JSON estructurado |
| **Supabase (PostgreSQL)** | Base de datos principal — leads, mensajes, análisis, logs |
| **HubSpot (CRM)** | Gestión de contactos, deals y pipeline comercial |
| **Slack** | Alertas internas para marketing, ventas y dirección |
| **Gmail** | Seguimientos automáticos, nurturing, confirmaciones |

---

## Paso 1: Entrada y Enriquecimiento de Datos

### Canal 1: Telegram Bot
- Agente responde en tiempo real cuando cliente escribe
- Identifica cliente por `telegram_user_id` (crea nuevo o reutiliza registro)
- Cada mensaje se almacena: fecha, canal, contenido → forma el hilo conversacional

### Canal 2: Formulario Web (n8n Forms)
**Nombre:** "Solicitud desde Web – UrbanStep"
| Campo | Descripción |
|---|---|
| Nombre del cliente | Nombre completo |
| Correo electrónico | Identificador principal |
| Ciudad | Para segmentación comercial |
| Interés principal | Compra, promociones, consulta general, etc. |
| Producto o categoría | Tipo de calzado de interés |
| Talle | Clave para intención de compra |
| Mensaje del cliente | Texto libre con la necesidad |

Cada envío crea/actualiza el cliente en Supabase y se registra como evento en su historial.

### Enriquecimiento SQL (condicional)
Solo cuando el agente detecta que el cliente ya compró (recompra, garantía, queja). Consulta Supabase para obtener:
- Producto adquirido previamente
- Fecha de compra
- Canal de venta (tienda física, e-commerce, redes)
- Monto de la operación

---

## Paso 2: Análisis con IA (OpenAI)

### Cuándo se dispara
- Solo cuando hay suficiente contexto en la conversación (cliente mencionó producto, precio, talle o disponibilidad)
- Para formularios: al recibir el envío (la info ya viene estructurada)
- Para NPS: al recibir respuesta + historial de compra enriquecido

### JSON de salida (7 campos obligatorios)
```json
{
  "sentimiento": "positivo | neutro | negativo",
  "intencion": "alta | media | baja",
  "etapa_funnel": "awareness | consideracion | decision | post-venta",
  "objecion_principal": "precio | stock | talle | envio | confianza | ninguna | otra",
  "resumen": "texto breve de la necesidad del cliente",
  "prioridad": "alta | media | baja",
  "accion_recomendada": "texto de la acción a ejecutar"
}
```

### Tip de Prompt Engineering
- **Llamada 1 (conversacional):** Temperature 0.7, sin formato JSON, para responder al cliente naturalmente
- **Llamada 2 (analítica):** Temperature 0.0, JSON mode, con few-shot examples para estabilizar estructura
- NO usar el mismo prompt para ambas funciones
- Few-shot: incluir 2-3 ejemplos (queja, consulta de precio, cliente exploratorio) en el system prompt analítico

### Estrategia de modelos mixtos (optimización de costos)
- **GPT-4o-mini** para la respuesta conversacional (no requiere razonamiento complejo)
- **GPT-4o** para el análisis JSON (requiere clasificar correctamente los 7 campos)
- Esta combinación reduce costos entre 60% y 80% sin perder calidad de análisis

---

## Paso 3: Agente de Decisión

El mismo agente conversacional que habla con el cliente ES el que decide qué hacer. En tiempo real, sin interrumpir el diálogo:
- Continúa la conversación
- Hace preguntas si faltan datos
- Detecta intención de compra
- Activa acciones cuando corresponde

### Rutas de decisión — 6 ramas mínimas (por `etapa_funnel` + `intencion`)
| # | Situación | Acción |
|---|---|---|
| 1 | Cliente listo para comprar (intención alta + etapa decisión) | Alerta a ventas / link de pago |
| 2 | Cliente en evaluación (consideración) | Envío de info o promos |
| 3 | Cliente exploratorio (awareness) | Nurturing / calificación inicial |
| 4 | Cliente recurrente | Recompra + fidelización |
| 5 | Cliente con queja (post-venta) | Priorización urgente |
| 6 | NPS recibido (formulario) | Análisis de percepción + segmentación |

### Reglas de prioridad en casos límite
- **Cliente recurrente con queja:** post-venta tiene prioridad sobre fidelización. Resolver primero, luego reactivar.
- **NPS bajo pero intención de compra:** atender la queja antes de procesar la venta.
- **Formulario NPS + conversación activa:** enriquecer el análisis NPS con historial conversacional.

### Selector del router
El campo `etapa_funnel` es el principal selector de ruta. El campo `accion_recomendada` puede usarse directamente si el prompt analítico está bien diseñado, reduciendo la lógica condicional del router.

Todas las decisiones se registran en Supabase para trazabilidad.

---

## Paso 4: Ejecución de Acciones

Acciones operativas que el agente ejecuta en tiempo real:
- Creación o actualización del cliente en HubSpot (CRM)
- Generación de oportunidades (deals) cuando hay intención alta
- Envío de links de compra o catálogo
- Compartir promociones vigentes
- Programar seguimientos automáticos
- Segmentar clientes para campañas futuras
- Activar fidelización para recurrentes
- Priorizar resolución de quejas + notificar internamente

---

## Estimación de Costos de API (diferenciador en defensa)

### Escenario conservador
- 10 turnos por conversación, 500 tokens promedio por turno
- 2 llamadas por turno (respuesta + análisis), 100 conversaciones/día
- **Tokens/día ≈ 10 × 500 × 2 × 100 = 1.000.000 tokens**

| Modelo | Costo/día | Costo/mes |
|---|---|---|
| GPT-4o (~$0.005/1K tokens entrada) | ~$5 USD | ~$150 USD |
| GPT-4o-mini (~$0.00015/1K) | ~$0.15 USD | ~$4.5 USD |
| **Mixto** (mini conversacional + 4o análisis) | ~$2.50 USD | ~$75 USD |

### Optimización: cuándo disparar el análisis
No analizar cada mensaje. Disparar solo cuando hay suficiente contexto: cliente mencionó producto, precio, talle o queja. Condición simple en n8n (contar mensajes o detectar palabras clave) reduce llamadas de análisis a ~1/3 del total.

---

## Integración HubSpot (CRM) — Detalles técnicos

### Endpoints principales
- **Crear contacto:** `POST /crm/v3/objects/contacts`
- **Crear deal:** `POST /crm/v3/objects/deals`
- **Buscar contacto por email:** `GET /crm/v3/objects/contacts/search`
- Token en Credential Store de n8n, NUNCA en el workflow

### Flujo obligatorio (deduplicación)
1. Buscar contacto por email
2. Si existe → actualizar
3. Si no existe → crear
4. Campos mínimos: `{ "properties": { "email": "...", "firstname": "...", "phone": "..." } }`

### Creación de deals
- Solo cuando `intencion = "alta"` en el JSON de análisis
- Asociar al contacto usando `contactId` retornado
- Stage inicial: `appointmentscheduled`
- Guardar `dealId` en Supabase para trazabilidad

---

## Categorías NPS y comportamiento esperado de la IA

| Tipo de feedback | Sentimiento | Categoría IA | Camino |
|---|---|---|---|
| Elogio (promotor, NPS 9-10) | Positivo | `satisfaccion` | Clientes felices → testimonios |
| Sugerencia constructiva (NPS 8-9) | Positivo/Neutro | `sugerencia` | Ideas de mejora |
| Neutral (experiencia correcta, fallas leves, NPS 7) | Neutro | `observacion` | Caso neutro |
| Queja técnica leve (NPS 5-6) | Negativo | `falla_tecnica` | Caso técnico → soporte |
| Reclamo fuerte / atención deficiente (NPS 3-4) | Negativo fuerte | `reclamo` | Caso crítico → escalamiento |
| Error o inconsistencia de datos | — | `pendiente_revision` | Revisión manual requerida |

### Template de correo para errores de clasificación
**Asunto:** `[Alerta IA] Revisión manual requerida – Feedback sin categoría válida`
**Cuerpo:** Incluir fecha, nombre cliente, email, comentario, y nota de que fue marcado como "pendiente de revisión" en logs.

---

## Logging y Trazabilidad (desde el primer nodo)

La defensa pide mostrar trazabilidad en la base de datos. Sin logs estructurados, no hay forma de demostrar qué decisiones tomó el agente.

### Campos mínimos por ejecución
`cliente_id` · `accion_ejecutada` · `resultado` (éxito/error/fallback) · `modelo_usado` · `tokens_consumidos` · `timestamp`

### Reglas críticas
- El nodo de log va al **final de TODAS las ramas**, incluyendo fallback
- Si OpenAI falla, si el JSON es inválido, si el CRM no responde → esos casos también necesitan log
- El flujo **nunca debe terminar** sin registrar qué pasó
- Consulta útil para debugging: `WHERE resultado = 'error'`

---

## Seguimiento Automático
El sistema programa seguimientos cuando detecta:
- Cliente con alta intención que no finalizó la compra
- Cliente que solicitó info y dejó de responder
- Cliente en evaluación que necesita recordatorio
- Clientes recurrentes → avisos de nuevas colecciones, stock

Seguimientos por Telegram o Gmail según corresponda.

---

## Schema Supabase

```sql
-- Tabla de clientes (datos de compras previas + identificación)
CREATE TABLE clientes (
  email VARCHAR(255) PRIMARY KEY,
  nombre VARCHAR(100),
  telegram_user_id VARCHAR(50),
  ciudad VARCHAR(100),
  producto VARCHAR(100),
  fecha_compra DATE,
  canal_venta VARCHAR(50),
  monto NUMERIC
);

-- Tabla de mensajes (historial conversacional)
-- id · cliente_id · rol (user/assistant) · contenido · fecha · canal
-- Relación 1:N con clientes. Los mensajes NUNCA se modifican, solo se agregan.

-- Tabla de conversaciones (estado actual del cliente — "foto actual")
-- id · cliente_id · intencion · etapa_funnel · sentimiento · prioridad
-- · objecion_principal · resumen · accion_recomendada
-- · seguimiento_enviado · fecha_ultimo_mensaje
-- Relación 1:1 con clientes. Se actualiza en cada análisis.

-- Tabla de logs (trazabilidad — OBLIGATORIA para la defensa)
-- id · cliente_id · accion_ejecutada · resultado (exito/error/fallback)
-- · modelo_usado · tokens_consumidos · timestamp
-- El nodo de log va al final de TODAS las ramas, incluyendo fallback.
```

**Notas importantes:**
- El campo `rol` debe usar exactamente `user`/`assistant` — es lo que espera el array de mensajes de OpenAI. Si lo llamás distinto, el nodo Code tiene que traducirlo (fuente innecesaria de errores).
- Los datos de ejemplo del PDF original usan productos de BrightHome (proyecto anterior). Hay que adaptarlos a productos de calzado urbano de UrbanStep.
- `telegram_user_id` es el identificador para clientes que escriben por Telegram sin dar email.

---

## Entregables
1. **Archivos .json del flujo n8n** — workflow completo y funcional
2. **Documento de soporte** (2-3 páginas) — documentación interna de UrbanStep
3. **Mapa visual del flujo** — en Miro o equivalente (Excalidraw válido)
4. **Carpeta en Google Drive** con todos los materiales
5. **Defensa en vivo** — 3 casos de prueba: compra, evaluación, cliente recurrente o NPS

---

## Casos de Prueba para la Defensa

**Caso 1 (Compra):** Cliente con intención alta, pregunta por talle y pago → sistema detecta `intencion: alta, etapa_funnel: decision` → deriva a ventas + link de pago

**Caso 2 (Evaluación):** Cliente que compara precios, tiene objeción de precio → `intencion: media, objecion_principal: precio` → envía promoción vigente

**Caso 3 (NPS):** Cliente que ya compró, deja feedback por formulario → análisis NPS completo con historial de compra
