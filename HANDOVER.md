# HANDOVER: UrbanStep — Estado Actual

> Historial completo de sesiones: ver `HANDOVER_HISTORIA.md`

---

## Proyecto
**UrbanStep** — agente conversacional inteligente para empresa de calzado. Canal principal: Telegram Bot + n8n Forms. Analiza conversaciones con OpenAI y ejecuta acciones comerciales en tiempo real.

**Deadline:** Entrega martes 29/04 (HOY), defensa jueves 30/04 (solicitado).

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
| SDvniUq2L5axPWWu | UrbanStep v2 - Análisis Paralelo | ✅ activo, ~110 nodos — **PRINCIPAL** (incluye Seguimiento) |
| LQAiZVEE85Iqbppl | UrbanStep — Seguimiento Automático | ⛔ desactivado (mergeado al principal) |
| OZ45sRab1ngEnziI | Consultar HubSpot (Tool) | ✅ activo |
| WystqHlqarqWa4jB | UrbanStep (v1 original) | backup |

---

## Arquitectura del Workflow Principal

```
TRIGGERS: Telegram / n8n Form / NPS Form / Webhook Test / Schedule (Seguimiento)

FLUJO CONVERSACIONAL (Telegram/Form):
  Extraer Datos → Buscar Cliente → IF Existe → Crear Cliente → Guardar Mensaje → Log Conversacion
  ↓
  RAMA 1 (conversacional):
  Obtener Historial R1 → Construir Contexto Conversacional
  → AI Agent (gpt-4o-mini + GLM fallback, retryOnFail 3x)
    [incluye TRIGGER_ANALISIS:SI/NO + TOKENS_R1:input:X,output:Y,total:Z]
  → Separar Respuesta → Telegram Responder + Guardar Respuesta → Log Conversacion
  → Detectar Email Real → IF Email Real → Actualizar Supabase + HubSpot Sync
  ↓
  RAMA 2 (análisis, paralela con IF Disparar Analisis):
  Obtener Historial R2 + Consultar Ultima Compra R2 [paralelos]
  → Construir Prompt Analítico (incluye última compra)
  → GPT 2b (gpt-4o OpenRouter + GLM fallback) + Structured Output Parser
  → Parsear Análisis → Guardar Análisis
  → Consultar Recurrencia → Consultar Compras → Enriquecer Recurrencia
  → Upsert HubSpot (Todos) → Actualizar Props IA HubSpot (PATCH v3) [paralelo al Router]
  → Router Decisiones (8 salidas):
      [0] NPS → Sub-Router NPS (tipo_nps):
                  promotor → Telegram NPS Promotor → Note HS → Log NPS
                  reclamo_fuerte → Slack NPS Reclamo → Note HS → Log NPS
                  friccion_postventa → Telegram NPS Friccion → Note HS → Log NPS
                  sugerencia_leve → Telegram NPS Sugerencia → Note HS → Log NPS
                  experiencia_neutra → Telegram NPS Seguimiento → Note HS → Log NPS
      [1] Queja → Slack #quejas-urgentes → Log Queja
      [2] Recurrente → Telegram Fidelización → Note HS → Leer Promo Asset → Telegram Foto Promo → Note HS → Log Recurrente
      [3] Compra → Upsert HubSpot → Deal → IF Email → Gmail/Telegram → Slack → Log Compra
      [4] Post-venta → Log Post-venta
      [5] Nurturing → Telegram Promo → Note HS → Leer Catalogo Asset → Telegram Foto Catalogo → Note HS → Log Nurturing
      [6] Exploratorio → Log Exploratorio
      [7] Fallback → Log Fallback

SEGUIMIENTO AUTOMÁTICO (Schedule 0 12 * * *):
  Buscar Pendientes → Obtener Cliente → Construir Mensaje
  → IF Tiene Telegram → Telegram → Marcar Enviado → Log → HubSpot batch/upsert → Nota HubSpot
```

---

## Schema Supabase

| Tabla | Campos clave |
|---|---|
| clientes | id, email, nombre, telegram_id, canal_origen, historial_compras[], segmento |
| mensajes | id, cliente_id, rol, contenido, direccion, canal, timestamp |
| conversaciones | id, cliente_id, sentimiento, intencion, etapa_funnel, objecion_principal, resumen, prioridad, accion_recomendada, email_detectado, seguimiento_enviado, timestamp |
| logs | id, cliente_id, workflow_id, rama, estado (exito/error/fallback), detalle (JSON), error_message, timestamp |
| compras_clientes | email, producto, fecha_compra, canal_venta, monto |
| assets_marketing | id, tipo, descripcion, url, activo, updated_at |

---

## NPS: Clasificación Completa

| NPS | tipo_nps | sentimiento | prioridad | Acción |
|---|---|---|---|---|
| 9-10 | promotor | positivo | baja | Telegram NPS Promotor (20% OFF + referral) |
| 8 | sugerencia_leve | neutro | baja | Telegram NPS Sugerencia |
| 7 | experiencia_neutra | neutro | baja | Telegram NPS Seguimiento |
| 5-6 | friccion_postventa | negativo | media | Telegram NPS Friccion (envío gratis) |
| 0-4 | reclamo_fuerte | negativo | alta | Slack NPS Reclamo (#quejas-urgentes) |

---

## Reglas y Decisiones Críticas

- **Email fantasma:** `telegram-{telegram_id}@urbanstep.bot` — `.bot` = 3 letras OK en HubSpot.
- **HubSpot custom properties (8):** actualizadas via PATCH /crm/v3/objects/contacts/{vid} (no via nodo HubSpot — devuelve `vid` no `id`).
- **HubSpot Notes (8 nodos paralelos):** usan `$('Upsert HubSpot (Todos)').first().json.vid` para asociar.
- **tipo_nps:** NO está en tabla conversaciones Supabase → leerlo de Parsear Analisis en Enriquecer Recurrencia.
- **Consultar Ultima Compra R2:** corre en paralelo desde IF Disparar Analisis. `$('Consultar Ultima Compra R2').first()` en Construir Prompt Analítico con try/catch.
- **Log Conversacion:** nodo después de Guardar Respuesta — loggea TODA ejecucion (trigger=true y false).
- **tokens_r1:** AI Agent incluye `TOKENS_R1: input:X,output:Y,total:Z` al final. Separar Respuesta lo extrae.
- **Code nodes humanizados:** Construir Contexto, Separar Respuesta, Detectar Email Real, Construir Prompt Analítico, Parsear Analisis, Enriquecer Recurrencia.
- **Fix Rama 2:** conexión IF Disparar Analisis → Obtener Historial R2 requiere remove+add para activarse.
- **Seguimiento mergeado:** Schedule Trigger + 10 nodos del Seguimiento están en el workflow principal. LQAiZVEE85Iqbppl desactivado.
- **Router CHECK:** NPS en [0], luego Queja en [1] (para que NPS negativo no caiga en Queja).

---

## Archivos Entregables

| Archivo | Estado |
|---|---|
| `diagrama-flujo.excalidraw` | ✅ listo (v2, ~110 nodos) — PENDIENTE: fix texto router + flecha NPS |
| `documento-soporte-v3.md` | ✅ listo para entregar (2-3 páginas, tabla Supabase consolidada) |
| `documento-soporte-v2.md` | referencia personal (schema Supabase detallado) |
| JSON workflow | pendiente exportar |
| Google Drive | pendiente subir |

---

## Pendientes Inmediatos

1. **Fix diagrama:** texto del Router desborda el rombo + flecha NPS entra en la caja
2. **Quitar webhooks de prueba** del workflow y actualizar nodo count en título del diagrama
3. **Exportar JSON + subir a Drive**
4. **Ensayo general** 3 casos (Compra, Queja, Recurrente)

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
- Último commit: `8279c98` — sesion 14j diagrama v2 ajustes Grok
