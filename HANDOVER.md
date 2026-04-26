# HANDOVER: UrbanStep — Estado Actual

> Historial completo de sesiones: ver `HANDOVER_HISTORIA.md`

---

## Proyecto
**UrbanStep** — agente conversacional inteligente para empresa de calzado. Canal principal: Telegram Bot + n8n Forms. Analiza conversaciones con OpenAI y ejecuta acciones comerciales en tiempo real.

**Deadline:** Entrega martes 29/04, defensa miércoles 29 o jueves 30/04.

---

## Infraestructura Operativa

| Servicio | Estado | Detalle |
|---|---|---|
| n8n | ✅ activo | Railway `https://primary-production-3de5.up.railway.app` |
| Supabase | ✅ activo | ID: `wigpybyzjwtjiixnfymf` |
| Telegram Bot | ✅ activo | Credencial: "Telegram account 2" (gKN6makwSHpPl3Ln) |
| OpenAI | ✅ activo | gpt-4o-mini (R1) + gpt-4o via OpenRouter (R2) |
| HubSpot | ✅ activo | Credencial: "HubSpot App Token account" (eehCZEc7e67tc2w5) |
| Slack | ✅ activo | #alertas-ventas (C0AUCUV2VEU), #quejas-urgentes (C0AUCUXV7DW) |

---

## Workflows

| ID | Nombre | Estado |
|---|---|---|
| SDvniUq2L5axPWWu | UrbanStep v2 - Análisis Paralelo | ✅ activo, 75 nodos — **PRINCIPAL** |
| LQAiZVEE85Iqbppl | UrbanStep — Seguimiento Automático | ✅ activo, 11 nodos |
| OZ45sRab1ngEnziI | Consultar HubSpot (Tool) | ✅ activo |
| WystqHlqarqWa4jB | UrbanStep (v1 original) | backup |

---

## Arquitectura del Workflow Principal (SDvniUq2L5axPWWu)

```
Telegram Trigger / Form Trigger / Webhook Test / NPS Form / NPS Webhook
  → Extraer Datos → Buscar Cliente → IF Existe → Crear Cliente → Guardar Mensaje
  ↓
  RAMA 1 (conversacional):
  Obtener Historial R1 → Construir Contexto Conversacional
  → AI Agent (gpt-4o-mini + GLM fallback, retryOnFail 3x)
  → Separar Respuesta → Telegram Responder + Guardar Respuesta
  → Detectar Email Real → IF Email Real → Actualizar Supabase + HubSpot Sync
  ↓
  RAMA 2 (análisis, paralela):
  Obtener Historial R2 → Construir Prompt Analítico
  → GPT 2b (gpt-4o OpenRouter + GLM fallback) + Structured Output Parser
  → Parsear Análisis → Guardar Análisis
  → Consultar Recurrencia → Consultar Compras → Enriquecer Recurrencia
  → Upsert HubSpot (Todos) [paralelo al Router]
  → Router Decisiones (8 salidas):
      [0] NPS         → Sub-Router NPS (5 ramas por tipo_nps):
                          [0] promotor        → Telegram NPS Promotor → Log NPS
                          [1] reclamo_fuerte  → Slack NPS Reclamo (#quejas-urgentes) → Log NPS
                          [2] friccion_post…  → Telegram NPS Friccion → Log NPS
                          [3] sugerencia_leve → Telegram NPS Sugerencia → Log NPS
                          [4] experiencia_…   → Telegram NPS Seguimiento → Log NPS
                          [5] fallback        → Log NPS
      [1] Queja       → Slack #quejas-urgentes → Log Queja
      [2] Recurrente  → Telegram Fidelización ✅ → Log Recurrente
      [3] Compra      → HubSpot Deal → IF Email → Gmail / Telegram Confirmación → Slack → Log Compra
      [4] Post-venta  → Log Post-venta
      [5] Nurturing   → Telegram Promo ✅ → Log Nurturing
      [6] Exploratorio→ Log Exploratorio
      [7] Fallback    → Log Fallback
```

---

## Workflow Seguimiento Automático (LQAiZVEE85Iqbppl)

```
Schedule Trigger (0 12 * * * — 9 AM Argentina)
  → Buscar Pendientes (conversaciones: seguimiento_enviado=false, >48h, funnel activo)
  → Obtener Cliente
  → Construir Mensaje Seguimiento (email fantasma = telegram-{id}@urbanstep.bot)
  → IF Tiene Telegram
      TRUE → Telegram Seguimiento → Marcar Enviado (PATCH Supabase) → Log Seguimiento
             → Buscar Contacto HubSpot (POST batch/upsert) → Preparar Nota → HubSpot Crear Nota
      FALSE → fin
```

---

## Schema Supabase

| Tabla | Campos clave |
|---|---|
| clientes | id, email, nombre, telegram_id, canal_origen, historial_compras[], segmento |
| mensajes | id, cliente_id, rol, contenido, direccion, fecha, canal |
| conversaciones | id, cliente_id, sentimiento, intencion, etapa_funnel, objecion_principal, resumen, prioridad, accion_recomendada, email_detectado, seguimiento_enviado, timestamp |
| logs | id, cliente_id, workflow_id, rama, estado (exito/error/fallback), detalle (JSON), error_message, timestamp |
| compras_clientes | email, producto, fecha_compra, canal_venta, monto |

---

## NPS: Clasificación Completa (sesión 12)

| NPS | tipo_nps | sentimiento | prioridad | Acción |
|---|---|---|---|---|
| 9-10 | promotor | positivo | baja | Telegram NPS Promotor (20% OFF + referral) |
| 8 | sugerencia_leve | neutro | baja | Telegram NPS Sugerencia (agradecimiento) |
| 7 | experiencia_neutra | neutro | baja | Telegram NPS Seguimiento (seguimiento suave) |
| 5-6 | friccion_postventa | negativo | media | Telegram NPS Friccion (envío gratis) |
| 0-4 | reclamo_fuerte | negativo | alta | Slack NPS Reclamo (#quejas-urgentes) |

- `tipo_nps` en schema Structured Output Parser (enum 5 valores + null)
- `tipo_nps` en Parsear Analisis y Enriquecer Recurrencia → fluye hasta Sub-Router NPS
- Sub-Router NPS usa `tipo_nps` directamente (no sentimiento+prioridad)
- Test 5/5 verificado automáticamente

---

## Reglas y Decisiones Críticas

- **Email fantasma:** `telegram-{telegram_id}@urbanstep.bot` — `.bot` = 3 letras, HubSpot lo acepta. `.internal` rechazado por HubSpot (max 3 letras en TLD).
- **Supabase update via MCP:** el nodo Supabase update con `matchingColumns` no funciona cuando se crea via API → usar HTTP Request + REST API PATCH directo.
- **CHECK constraint logs.estado:** solo acepta `exito`, `error`, `fallback` (no `success`).
- **Router:** NPS en posición [0] para que NPS negativo no caiga en Queja.
- **tipo_nps:** campo en schema/parser/Enriquecer Recurrencia. NO está en tabla Supabase conversaciones → leerlo de `Parsear Analisis` directamente en Enriquecer Recurrencia.
- **Tokens:** GPT 2b estima sus propios tokens en campo `metadata`. Los logs los capturan.
- **Structured Output Parser:** schema con `email_detectado`, `tipo_nps: ["string","null"]` + `metadata` + `additionalProperties: false`.
- **HubSpot Upsert (Todos):** corre en PARALELO al Router (no en serie), porque Router lee de Enriquecer Recurrencia.
- **HubSpot Seguimiento:** usa POST `/crm/v3/objects/contacts/batch/upsert` — crea si no existe, siempre devuelve ID.
- **retryOnFail:** activo en AI Agent Conversacional y GPT 2b (3x / 5000ms).
- **Telegram Fidelizacion + Telegram Promo:** habilitados (sesión 12).

---

## Pendientes para la Defensa

1. **Documento de soporte** 2-3 páginas
2. **Exportar JSON + diagrama Excalidraw + Google Drive**
3. **Ensayo general** 3 casos de defensa (Compra, Queja, Recurrente)

---

## Canales Slack
| Canal | ID |
|---|---|
| #todo-urbanstep | C0ATC9AP675 |
| #alertas-ventas | C0AUCUV2VEU |
| #quejas-urgentes | C0AUCUXV7DW |

---

## Git
- Repo: `github.com/VictorUala/UrbanStep`
- Branch activa: `feature/email-fantasma`
- Último commit: `f7a7051` — sesion 12b NPS sub-clasificación
