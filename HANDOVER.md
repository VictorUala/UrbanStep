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
| SDvniUq2L5axPWWu | UrbanStep v2 - Análisis Paralelo | ✅ activo, 69 nodos — **PRINCIPAL** |
| LQAiZVEE85Iqbppl | UrbanStep — Seguimiento Automático | ✅ activo, 11 nodos |
| OZ45sRab1ngEnziI | Consultar HubSpot (Tool) | ✅ activo |
| WystqHlqarqWa4jB | UrbanStep (v1 original) | backup |

---

## Arquitectura del Workflow Principal (SDvniUq2L5axPWWu)

```
Telegram Trigger / Form Trigger / Webhook Test
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
      [0] NPS         → Log NPS
      [1] Queja       → Slack #quejas-urgentes → Log Queja
      [2] Recurrente  → Telegram Fidelización* → Log Recurrente
      [3] Compra      → HubSpot Deal → IF Email → Gmail / Telegram Confirmación → Slack → Log Compra
      [4] Post-venta  → Log Post-venta
      [5] Nurturing   → Telegram Promo* → Log Nurturing
      [6] Exploratorio→ Log Exploratorio
      [7] Fallback    → Log Fallback
* Telegram Fidelización y Telegram Promo están DESHABILITADOS (desde sesión 7)
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

## Reglas y Decisiones Críticas

- **Email fantasma:** `telegram-{telegram_id}@urbanstep.bot` — `.bot` = 3 letras, HubSpot lo acepta. `.internal` rechazado por HubSpot (max 3 letras en TLD).
- **Supabase update via MCP:** el nodo Supabase update con `matchingColumns` no funciona cuando se crea via API → usar HTTP Request + REST API PATCH directo.
- **CHECK constraint logs.estado:** solo acepta `exito`, `error`, `fallback` (no `success`).
- **Router:** NPS en posición [0] para que NPS negativo no caiga en Queja.
- **Tokens:** GPT 2b estima sus propios tokens en campo `metadata`. Los logs los capturan.
- **Structured Output Parser:** schema con `email_detectado: type ["string","null"]` + `metadata` + `additionalProperties: false`.
- **HubSpot Upsert (Todos):** corre en PARALELO al Router (no en serie), porque Router lee de Enriquecer Recurrencia.
- **HubSpot Seguimiento:** usa POST `/crm/v3/objects/contacts/batch/upsert` — crea si no existe, siempre devuelve ID.
- **retryOnFail:** activo en AI Agent Conversacional y GPT 2b (3x / 5000ms).
- **Webhook Test Trigger + Telegram Fidelizacion + Telegram Promo:** deshabilitados.

---

## Pendientes para la Defensa

1. **⚠️ Activar** Telegram Fidelizacion + Telegram Promo (deshabilitados desde sesión 7)
2. **Documento de soporte** 2-3 páginas
3. **Exportar JSON + diagrama Excalidraw + Google Drive**
4. **Ensayo general** 3 casos de defensa (Compra, Queja, Recurrente)
5. **Commitear** todos los cambios pendientes (fix .internal→.bot, NPS, seguimiento, HubSpot nota)
6. **Verificar** retryOnFail activo en producción

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
- Último commit: `dcfc541` — sesion 11b
