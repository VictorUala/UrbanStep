# HANDOVER: UrbanStep — Estado Actual

> Historial completo de sesiones: ver `HANDOVER_HISTORIA.md`

---

## Proyecto
**UrbanStep** — agente conversacional inteligente para empresa de calzado.
**Defensa:** jueves 30/04 (solicitado). **Entrega material:** hoy 29/04.

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

---

## Estado de Base de Datos (post-limpieza ensayo)

| Tabla | Registros | Nota |
|---|---|---|
| clientes | 0 | limpiada para ensayo |
| mensajes | 0 | limpiada para ensayo |
| conversaciones | 0 | limpiada para ensayo |
| logs | 0 | limpiada para ensayo |
| compras_clientes | 8 | **conservada** — necesaria para probar recurrencia |
| assets_marketing | 3 | **conservada** — promo, catalogo, logo URLs |

---

## Los 3 Casos de Defensa a Probar

1. **COMPRA** — cliente nuevo pide zapatilla + talle + da email → HubSpot Deal + Gmail + Slack ventas
2. **QUEJA** — cliente dice que el producto llegó dañado → Slack #quejas-urgentes
3. **RECURRENTE** — cliente con compras previas en compras_clientes quiere recomprar → Telegram fidelización + Foto Promo

---

## Reglas y Decisiones Críticas

- **Email fantasma:** `telegram-{telegram_id}@urbanstep.bot` (.bot = 3 letras, HubSpot OK)
- **HubSpot properties:** usa PATCH /crm/v3/objects/contacts/{vid} (nodo devuelve `vid` no `id`)
- **HubSpot Notes:** usan `$('Upsert HubSpot (Todos)').first().json.vid`
- **tipo_nps:** NO está en tabla conversaciones → leerlo de Parsear Analisis en Enriquecer Recurrencia
- **Consultar Ultima Compra R2:** corre en paralelo desde IF Disparar Analisis, try/catch en Construir Prompt
- **Log Conversacion:** nodo post Guardar Respuesta — loggea TODA ejecucion
- **tokens_r1:** AI Agent incluye `TOKENS_R1: input:X,output:Y,total:Z`, Separar Respuesta lo extrae
- **Fix Rama 2:** conexión IF Disparar Analisis → Obtener Historial R2 requiere remove+add para activarse
- **Seguimiento:** Schedule Trigger + 10 nodos mergeados al principal. LQAiZVEE85Iqbppl desactivado
- **Router NPS en [0]:** para que NPS negativo no caiga en Queja antes que en NPS

---

## Archivos Entregables

| Archivo | Estado |
|---|---|
| `diagrama-flujo.excalidraw` | ✅ listo — pendiente quitar webhooks y actualizar nodo count |
| `documento-soporte-v3.md` | ✅ listo para entregar |
| JSON workflow | ⏳ pendiente exportar |
| Google Drive | ⏳ pendiente subir |

---

## Pendientes Post-Ensayo

1. Quitar webhooks de prueba del workflow
2. Actualizar nodo count en título del diagrama
3. Exportar JSON + subir a Drive

---

## Canales Slack
| Canal | ID |
|---|---|
| #alertas-ventas | C0AUCUV2VEU |
| #quejas-urgentes | C0AUCUXV7DW |

---

## Git
- Repo: `github.com/VictorUala/UrbanStep`
- Branch: `feature/email-fantasma`
- Último commit: `f9b1d4e` — sesion 14q diagrama router final
