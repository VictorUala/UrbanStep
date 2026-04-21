# HANDOVER: UrbanStep — Agente Conversacional Inteligente

## Estado del Proyecto
**Inicio:** 2026-04-15  
**Deadline:** 2026-04-25 (10 días)  
**Fase actual:** Setup inicial — Listo para comenzar implementación

---

## Contexto para el Siguiente Agente (Claude/Gemini)

¡Hola! Estás entrando al Proyecto Integrador M2 de Víctor en Soy Henry.

**REGLA DE ORO:** Leé CLAUDE.md y CONTEXTO.md antes de hacer cualquier cosa. No dupliques tareas ya completadas.

### Proyecto
**UrbanStep** — agente conversacional inteligente para empresa de calzado. Canal principal: Telegram Bot. También n8n Forms. Analiza conversaciones completas con OpenAI y ejecuta acciones comerciales en tiempo real.

### Infraestructura disponible (ya operativa)
- **n8n:** Railway → `https://primary-production-3de5.up.railway.app`
- **MCP n8n:** configurado en `C:\Users\Victor\.claude\settings.json`
- **MCP Excalidraw:** configurado. Para diagramas complejos: JSON directo (no MCP).
- **Git/GitHub:** `git@github.com:VictorUala/urbanstep-henry.git` (pendiente crear)
- **Carpeta local:** `Z:\UrbanStep_Henry`
- **Supabase:** pendiente crear proyecto nuevo para UrbanStep

### Contexto de trabajo
- **Claude Code CLI** en la carpeta del proyecto
- **VS Code + Antigravity** como entorno
- **bypassPermissions** activo en CLI
- Si los MCPs no cargan: cerrar Antigravity completo y reabrir

---

## Tareas Completadas
1. [x] Lectura y análisis completo del PDF del Proyecto Integrador 2B (UrbanStep)
2. [x] CLAUDE.md, CONTEXTO.md y HANDOVER.md creados y listos
3. [x] Estructura del proyecto analizada y documentada

## Próximos Pasos (en orden)

1. **[x] Crear carpeta del proyecto** — `Z:\UrbanStep_Henry`
2. **[x] Copiar archivos plantilla** (CLAUDE.md, CONTEXTO.md, HANDOVER.md) a la nueva carpeta
3. **[ ] Inicializar Git** + crear repo en GitHub
4. **[ ] Configurar Telegram Bot** — crear bot en BotFather, obtener token
5. **[ ] Crear proyecto en Supabase** — nombre sugerido: `urbanstep_agente`
6. **[ ] Diseñar diagrama de flujo** en Excalidraw (JSON directo)
7. **[ ] Implementar Paso 1:** Telegram trigger + identificación cliente + almacenamiento mensajes
8. **[ ] Implementar Paso 2:** Análisis OpenAI (prompt dual: conversacional + JSON analítico, modelos mixtos)
9. **[ ] Implementar Paso 3:** Agente de decisión con 6 rutas (compra, evaluación, exploratorio, recurrente, queja, NPS)
10. **[ ] Implementar Paso 4:** Acciones + CRM HubSpot + seguimientos
11. **[ ] Preparar 3 casos de prueba** para defensa en vivo
12. **[ ] Documentación** — doc interno 2-3 páginas + export n8n JSON + Google Drive

---

## Decisiones de Arquitectura

### Prompt Strategy (Material Complementario, pág. 3)
- **Llamada 1 a OpenAI:** Respuesta conversacional — temperature 0.7, sin JSON (GPT-4o-mini)
- **Llamada 2 a OpenAI:** Análisis JSON — temperature 0.0, JSON mode, con few-shot examples (GPT-4o)
- El análisis NO se dispara en cada mensaje — solo cuando hay suficiente contexto
- Estrategia de modelos mixtos reduce costos 60-80%

### Schema Supabase (diseño recomendado)
- Tabla `clientes` — datos de compras previas + telegram_user_id (PK: email)
- Tabla `mensajes` — historial conversacional (id, cliente_id, rol, contenido, fecha, canal). Relación 1:N.
- Tabla `conversaciones` — estado actual del cliente (intencion, etapa_funnel, sentimiento, prioridad, objecion_principal, resumen, accion_recomendada, seguimiento_enviado, fecha_ultimo_mensaje). Relación 1:1.
- Tabla `logs` — trazabilidad obligatoria (cliente_id, accion_ejecutada, resultado, modelo_usado, tokens_consumidos, timestamp). Log en TODAS las ramas incluyendo fallback.

### Router (Paso 3) — 6 ramas mínimas
1. Compra inmediata (intención alta + decisión) → alerta ventas
2. Evaluación (consideración) → nurturing / info
3. Exploratorio (awareness) → calificación inicial
4. Recurrente → recompra + fidelización
5. Queja / post-venta → priorización urgente
6. NPS → análisis de percepción + segmentación
- **Prioridad:** queja > fidelización; queja > venta

### HubSpot (Material Complementario, pág. 5)
- Flujo: buscar por email → si existe, actualizar → si no, crear
- Deal solo cuando `intencion = "alta"`, stage `appointmentscheduled`
- Guardar `dealId` en Supabase

### Costos API (diferenciador en defensa)
- Escenario: 1M tokens/día → GPT-4o $150/mes, GPT-4o-mini $4.5/mes, Mixto ~$75/mes

### Datos de ejemplo
- Los INSERTs del PDF usan productos BrightHome → adaptar a calzado urbano UrbanStep

---

## Estado Actualizado de Tareas

1. [x] Crear carpeta del proyecto
2. [x] Archivos CLAUDE.md, CONTEXTO.md, HANDOVER.md
3. [ ] Inicializar Git + GitHub
4. [x] Telegram Bot creado en BotFather — token guardado en credencial n8n "Telegram UrbanStep"
5. [x] Proyecto Supabase creado — ID: `wigpybyzjwtjiixnfymf`, URL: `https://wigpybyzjwtjiixnfymf.supabase.co`
6. [x] Diagrama de flujo Excalidraw — `diagrama-flujo.excalidraw` (aprobado por Victor y Gemini)
7. [x] Schema Supabase — 4 tablas creadas y verificadas (clientes, mensajes, conversaciones, logs)
8. [x] Credencial Supabase en n8n — "Supabase UrbanStep"
9. [x] Credencial Telegram en n8n — "Telegram UrbanStep"
10. [x] Paso 1 implementado en n8n — workflow UrbanStep ID: `WystqHlqarqWa4jB`
11. [x] Paso 2 implementado — 7 nodos: historial, contexto, GPT 2a, guardar respuesta, GPT 2b, parsear, guardar análisis
12. [ ] Paso 3: Router 6 ramas
13. [ ] Paso 4: Acciones (HubSpot, Slack, Gmail)
14. [ ] 3 casos de prueba para defensa
15. [ ] Documentación final

---

## Infraestructura Operativa (estado actual)

| Servicio | Estado | Detalle |
|---|---|---|
| n8n | ✅ activo | Railway `https://primary-production-3de5.up.railway.app` |
| MCP n8n | ✅ conectado | Workflow UrbanStep ID: `WystqHlqarqWa4jB` |
| MCP Supabase | ✅ conectado | Proyecto ID: `wigpybyzjwtjiixnfymf` |
| Supabase | ✅ 4 tablas | clientes, mensajes, conversaciones, logs |
| Telegram Bot | ✅ operativo | Credencial en n8n: "Telegram UrbanStep" |
| OpenAI | ✅ operativo | Credencial "OpenAI UrbanStep" en n8n |
| HubSpot | ✅ listo | MCP conectado + credencial n8n lista. Cuenta STANDARD, USD |
| Slack | ✅ listo | MCP conectado + credencial n8n lista. Bot en 3 canales |
| Gmail | ⏳ pendiente | Paso 4 |

---

## Workflow UrbanStep — Estado de Nodos

**Paso 1 (COMPLETO y probado):**
```
Telegram Trigger → Extraer Datos → Buscar Cliente → IF Cliente Existe?
                                                       TRUE  → Guardar Mensaje
                                                       FALSE → Crear Cliente → Guardar Mensaje
```
- Probado en modo test: mensaje "Mi primer mensaje a UrbanStep... que emocion!!" guardado en Supabase ✓
- Cliente Victor Duart creado en tabla clientes (telegram_id: 8704924722) ✓
- Mensaje guardado en tabla mensajes con cliente_id vinculado ✓

**Paso 2 (COMPLETO — pendiente test end-to-end):**
```
Guardar Mensaje → Obtener Historial → Construir Contexto (Code)
  → GPT 2a Conversacional (gpt-4o-mini, temp 0.7, HTTP Request)
  → Guardar Respuesta Asistente (mensajes, direccion: salida)
  → GPT 2b Análisis JSON (gpt-4o, temp 0.0, JSON mode, HTTP Request)
  → Parsear Análisis (Code)
  → Guardar Análisis (conversaciones)
```
- Prompts completos en "Construir Contexto" con few-shot examples
- Credencial OpenAI: "OpenAI UrbanStep"
- **NOTA:** A evaluar — reemplazar HTTP Requests por nodos LangChain nativos de n8n (el profesor los usa). Víctor traerá JSON de ejemplo de la clase para comparar.
- **NOTA:** Crear workflow paralelo "UrbanStep — Aprendizaje" para estudiar sin afectar el master.

**Pasos 3, 4:** pendientes — se agregan al mismo workflow `WystqHlqarqWa4jB`

---

## Canales Slack — IDs (usar IDs en n8n, más robusto que nombres)
| Canal | ID |
|---|---|
| `#todo-urbanstep` | C0ATC9AP675 |
| `#alertas-ventas` | C0AUCUV2VEU |
| `#quejas-urgentes` | C0AUCUXV7DW |
**ATENCIÓN:** El canal es `alertas-ventas` (con s), no `alerta-ventas`.

---

## Logs de Sesión

### Log 2026-04-15 (sesión de setup)
- Análisis del PDF Proyecto integrador 2B completado
- Proyecto confirmado: UrbanStep (calzado), NO BrightHome NPS
- El proyecto anterior (BrightHome NPS) fue cancelado por el curso
- Expertise de Excalidraw (JSON directo + iteración visual) exportado a CLAUDE.md
- Templates CLAUDE.md, CONTEXTO.md, HANDOVER.md creados en `plantilla-nuevo-proyecto`
- Archivos duplicados eliminados de `proyecto-integrador`

### Log 2026-04-16 sesión 2 (Paso 2 implementado)
- API key OpenAI creada en platform.openai.com — ATENCIÓN: key original fue expuesta en chat, regenerada inmediatamente
- Credencial "OpenAI UrbanStep" creada en n8n
- Paso 2 implementado (7 nodos via MCP n8n): Obtener Historial, Construir Contexto (Code con prompts dual + few-shot), GPT 2a Conversacional (gpt-4o-mini), Guardar Respuesta Asistente, GPT 2b Análisis JSON (gpt-4o JSON mode), Parsear Análisis (Code), Guardar Análisis (conversaciones)
- Total: 13 nodos en el workflow UrbanStep
- Git inicializado, repo GitHub creado: github.com/VictorUala/UrbanStep
- Pendiente: test end-to-end Paso 2, luego Paso 3 (Router)
- Pendiente: evaluar reemplazo de HTTP Requests por nodos LangChain nativos (ver JSON del profesor)
- Estrategia acordada: crear workflow paralelo para aprendizaje sin tocar el master

### Log 2026-04-16 (sesión de implementación — Paso 1 completo)
- Cambio de modelo: Opus → Sonnet 4.6 (más eficiente para esta etapa)
- Antigravity reconfigurado: MCP apuntaba a carpeta anterior, corregido al proyecto UrbanStep
- `.clinerules` creado para Gemini como profesor auxiliar pedagógico
- Diagrama Excalidraw corregido: ramas más espaciadas, flechas del router limpias, servicios externos reposicionados. Aprobado por Victor y validado por Gemini Pro.
- Supabase: proyecto creado (ID: wigpybyzjwtjiixnfymf). Schema de 4 tablas desplegado via MCP Supabase.
- Telegram Bot: creado en BotFather, token cargado en n8n como "Telegram UrbanStep"
- Credencial Supabase creada en n8n: "Supabase UrbanStep"
- Paso 1 implementado via MCP n8n — 6 nodos: Telegram Trigger, Extraer Datos (Set), Buscar Cliente (Supabase GetAll), IF Cliente Existe, Crear Cliente (Supabase Create), Guardar Mensaje (Supabase Create)
- Prueba exitosa en modo test: cliente y mensaje guardados correctamente en Supabase
- Próximo paso: activar workflow y agregar Paso 2 (prompt dual OpenAI)

### Log 2026-04-18 (sesión larga — refactor Paso 2 + primeras pruebas exitosas)

**Infraestructura:**
- Gmail MCP conectado (create_draft, search_threads, etc.)
- Google Drive MCP conectado (search, read, download)
- Google Calendar MCP conectado
- Google Sheets MCP conectado (service account: sheetsn8n@railway-493619.iam.gserviceaccount.com)
- Nota: Sheets MCP usa service account, NO puede crear archivos. Crear sheet vacío manualmente y compartir con la service account. De ahí en adelante Claude puede leer/escribir todo.
- Supabase MCP reconectado (token vencido, refrescado via /mcp → authenticate)

**Estándar de robustez del profesor (Tech Lead MeLi):**
- 6 capas: JSON Schema + autoFix → modelo autofix → fallback model → retryOnFail (3x/5000ms) → continueErrorOutput → error log
- Preferir nodos LangChain (agnósticos) sobre nodos nativos de proveedor
- OpenRouter como abstracción para múltiples modelos con una credencial
- `outputParserStructured` con `schemaType: manual` + `autoFix: true`
- Generar JSON Schema con Gemini/ChatGPT para no escribirlo a mano
- Error log al final de TODAS las ramas — el flujo nunca termina sin registrar

**Refactor Paso 2 — arquitectura nueva:**
Reemplazamos HTTP Requests por nodo Agent nativo LangChain:
- AI Agent (`@n8n/n8n-nodes-langchain.agent` v3.1)
  - Primary: GPT-4o-mini (lmChatOpenAi, "OpenAi account")
  - Fallback: Z-ai/glm-4.5 (OpenRouter)
  - retryOnFail: true, maxTries: 3, waitBetweenTries: 5000
  - onError: continueErrorOutput
  - needsFallback: true
- Nodo "Separar Respuesta" (Code): separa respuesta del cliente del flag TRIGGER_ANALISIS
  - Regex: `/TRIGGER_ANALISIS:\s*(SI|NO)/i`
  - Limpia "Asistente:" prefix
  - Output: `{ respuesta, trigger (bool), cliente_id, chat_id }`
- Nodo "Telegram Responder": parse_mode: None (evita error con emojis/markdown), appendAttribution: false
- Nodo "IF Disparar Análisis": lee `trigger === true` → SI va a GPT 2b, NO termina

**System prompt del Agent conversacional:**
- Sos asistente de UrbanStep (calzado premium argentino)
- Español rioplatense, amigable y profesional
- Al final de cada respuesta: `TRIGGER_ANALISIS:SI` o `TRIGGER_ANALISIS:NO`
- SI si: producto específico, precio, talle, stock, envío o queja
- NO si: saludo, pregunta genérica, charla trivial

**Sesión/historial:**
- Filtrar mensajes por sesión (sugerido: últimas 4-6 horas) — pendiente implementar en Construir Contexto
- Actualmente toma últimos 10 mensajes sin filtro de tiempo

**Estado de pruebas del Paso 2:**
- ✅ AI Agent responde en español rioplatense correctamente
- ✅ Memoria conversacional funciona (lee historial de Supabase)
- ✅ TRIGGER_ANALISIS:SI detectado cuando cliente menciona talle/producto
- ✅ TRIGGER_ANALISIS:NO para saludos triviales
- ✅ Telegram recibe respuesta limpia (sin TRIGGER, sin prefijo de rol)
- ✅ Guardar Respuesta Asistente guarda en Supabase correctamente
- ⏳ Pendiente: verificar que IF → GPT 2b funcione end-to-end
- ⏳ Pendiente: GPT 2b sigue siendo HTTP Request — refactorizar a Agent + Structured Output Parser
- ⏳ Pendiente: filtro de sesión por horas en Construir Contexto
- ⏳ Pendiente: nodos de error log

**Workflow UrbanStep — 18 nodos actuales:**
```
Telegram Trigger → Extraer Datos → Buscar Cliente → IF Cliente Existe
  TRUE → Guardar Mensaje
  FALSE → Crear Cliente → Guardar Mensaje
  → Obtener Historial → Construir Contexto → AI Agent
  → Separar Respuesta ─┬→ Telegram Responder
                        ├→ Guardar Respuesta Asistente
                        └→ IF Disparar Análisis
                               TRUE → GPT 2b (HTTP) → Parsear → Guardar Análisis
                               FALSE → fin
```

### Log 2026-04-17 (post-clase — setup Paso 4 completo)
- HubSpot: MCP conectado + credencial agregada en n8n ✅
- Slack: MCP conectado + credencial agregada en n8n ✅
- Slack bot agregado a: #todo-urbanstep, #alertas-ventas, #quejas-urgentes
- IDs de canales verificados via MCP (ver tabla arriba)
- ATENCIÓN: canal es `alertas-ventas` (con s) — verificar en nodos n8n
- Pendiente mañana: Paso 3 (Router 6 ramas) + Paso 4 (HubSpot + Slack + Gmail)

### Log 2026-04-19 (sesión larga — arquitectura paralela + Router + 3 workflows)

**Decisiones arquitectónicas tomadas:**
- Sistema de 3 workflows en n8n para desarrollo colaborativo:
  - `UrbanStep` (WystqHlqarqWa4jB) → backup, estado secuencial anterior
  - `UrbanStep v2` (SDvniUq2L5axPWWu) → **PRINCIPAL** — Claude + ideas filtradas de Grok
  - `UrbanStep v3 - Grok` (Uama1niOmr310RQr) → playground de Grok puro
- Git branch `feature/parallel-v2` creado para desarrollo paralelo

**Arquitectura v2 y v3 (idéntica base):**
```
Telegram Trigger → Extraer Datos → Buscar Cliente → IF Cliente Existe
  TRUE/FALSE → Crear Cliente → Guardar Mensaje
  ↓
  ├── RAMA 1 (conversacional, paralela):
  │   Obtener Historial R1 → Construir Contexto Conversacional (Code)
  │   → AI Agent Conversacional (gpt-4o-mini + GLM fallback, temp 0.7, retryOnFail 3x)
  │   → Separar Respuesta → Telegram Responder + Guardar Respuesta
  │
  └── RAMA 2 (análisis, paralela):
      Obtener Historial R2 → Construir Prompt Analitico (Code)
      → GPT 2b Analisis (gpt-4o via OpenRouter + GLM fallback, retryOnFail 3x)
      → Parsear Analisis → Guardar Analisis
      → Consultar Recurrencia (Supabase clientes) → Enriquecer Recurrencia (Code)
      → Router Decisiones (Switch, 6 rutas + fallback)
      → 7 Log nodes (uno por ruta → tabla logs)
```

**Router — 6 rutas en orden de prioridad:**
1. Queja urgente: sentimiento=negativo AND objecion≠ninguna
2. Compra inmediata: etapa_funnel=decision AND intencion=alta
3. Recurrente: es_recurrente=true (tiene fecha_compra o monto en clientes)
4. Post-venta: etapa_funnel=post-venta
5. Nurturing: etapa_funnel=consideracion
6. Exploratorio: etapa_funnel=awareness
7. Fallback default → Log Fallback

**Cambios en AI Agent Conversacional (v2/v3):**
- Sin TRIGGER_ANALISIS (análisis siempre corre en paralelo)
- System prompt simplificado: rol puro de calificación
- Cuando piden catálogo: "Ya avisé al equipo, en unos minutos te llega el catálogo. ¿Tu mail?"
- Temperature: 0.7 (configurado en nodo gpt-4o-mini)

**GPT 2b Analisis:**
- Reemplazó el HTTP Request anterior por AI Agent nativo LangChain
- Modelo: gpt-4o via OpenRouter (primario) + GLM fallback
- System prompt con 3 few-shot examples, temperatura 0.0
- retryOnFail: 3x / 5000ms, onError: continueErrorOutput

**Enriquecimiento de recurrencia:**
- Nodo Consultar Recurrencia: Supabase GetAll en tabla clientes, filtrado por id=cliente_id
- Nodo Enriquecer Recurrencia (Code): agrega es_recurrente (bool) + producto_previo al JSON
- es_recurrente = true si tiene fecha_compra o monto > 0

**Logging por rama:**
- 7 nodos Log (uno por cada salida del Router → tabla logs)
- Campos: cliente_id, accion_ejecutada, resultado, modelo_usado=switch-router, tokens_consumidos=0
- PENDIENTE: cuando se agregue Paso 4 (HubSpot/Slack), los logs se mueven DESPUÉS de las acciones

**Colaboración con SuperGrok:**
- Grok analizó los PDFs y el workflow — aportó ideas válidas y algunas incorrectas
- Idea correcta adoptada: arquitectura paralela (dos ramas desde Guardar Mensaje)
- Idea correcta adoptada: enrichment de recurrencia + logging por rama
- Idea incorrecta descartada: splitInBatches para paralelo (usamos conexiones múltiples nativas)
- Idea incorrecta descartada: retryOnFail/parser en Switch Router (no llama APIs)
- Idea incorrecta descartada: agente IA tomando decisiones de routing (Switch determinista es correcto)
- Dinámica: Victor actúa de puente, Claude filtra las propuestas de Grok antes de implementar

**v1 (WystqHlqarqWa4jB) — cambios antes de crear v2:**
- AI Agent conversacional con system prompt actualizado (sin catálogo, con handoff a ventas)
- GPT 2b refactorizado a AI Agent LangChain + gpt-4o via OpenRouter
- Parsear Análisis corregido: lee $json.output en vez de $json.choices[0].message.content
- Prueba exitosa: catálogo correcto — "Ya avisé al equipo, ¿me dejás tu mail?"

**Próximos pasos (Paso 4):**
- Rama "Compra inmediata": HubSpot crear contacto + deal + Slack #alertas-ventas
- Rama "Queja urgente": Slack #quejas-urgentes + mensaje Telegram al cliente
- Rama "Nurturing": mensaje Telegram con info/promo
- Rama "Recurrente": mensaje Telegram de fidelización
- Rama "Exploratorio": mensaje Telegram liviano
- Mover logs al final de cada acción (después de HubSpot/Slack)
- Structured Output Parser en GPT 2b (pendiente de sesión anterior)
- Activar v2 en Telegram y probar end-to-end

### Log 2026-04-19 sesión 2 — Grok collaboration + Paso 4 arrancado

**Colaboración con SuperGrok — análisis de sugerencias:**
- Grok revisó el JSON de v2 y mandó 4 piezas. Dictamen:
  - Pieza 1 (JSON Schema Parser): ✅ adoptada en v2 y v3
  - Pieza 2 (Logging genérico): ✅ adoptada con corrección de columnas reales (rama/estado/detalle)
  - Pieza 3 (LLM como router): ❌ descartada — Switch determinista es correcto, LLM para routing = latencia + costo + no-determinismo
  - Pieza 4 (accion_recomendada en Switch): ❌ v2, ✅ v3 fiel
- Dinámica Grok: propone cosas repetidas (Log Error Rama 1 ya implementado) y formatos con bugs (fallbackOutput: "fallback-sin-ruta" es inválido)
- Regla operativa: siempre filtrar antes de implementar

**Cambios aplicados en v2 (SDvniUq2L5axPWWu) — 37 nodos:**
- Structured Output Parser agregado y conectado via ai_outputParser a GPT 2b Analisis (autoFix: true)
- Parsear Analisis simplificado: ya no hace JSON.parse, lee $json.output directo (objeto ya parseado)
- 7 Log nodes corregidos: ahora usan columnas reales (rama, estado, workflow_id, detalle JSON)
- Log Error Conversacional: conectado a salida de error (main[1]) del AI Agent Conversacional
- Enriquecer Recurrencia: ahora expone nombre, email, telegram_id, fecha_ultima_compra, canal_venta_previo, monto_previo
- Supabase logs table: columna error_message agregada via migration DDL

**Paso 4 — Ramas implementadas en v2:**
- Compra inmediata: Router(1) → Upsert Contacto HubSpot (email fallback: telegram_id@telegram.urbanstep.com) → Crear Deal HubSpot (stage: appointmentscheduled) → Slack Alerta Ventas (#alertas-ventas C0AUCUV2VEU) → Log Compra
- Queja urgente: Router(0) → Slack Alerta Queja (#quejas-urgentes C0AUCUXV7DW) → Log Queja
- HubSpot typeVersion: 2.2, operation: upsert para contacto, create para deal
- Slack typeVersion: 2.4, operation: send, channelId via __rl mode: id
- PENDIENTE: seleccionar credenciales HubSpot y Slack en UI de n8n (no se puede via MCP)

**Cambios aplicados en v3 (Uama1niOmr310RQr) — 33 nodos:**
- Mismos cambios que v2 (Parser, Log nodes corregidos, Log Error Rama 1, Enriquecer Recurrencia mejorado)
- Diferencias Grok-específicas: compras_previas_count en Enriquecer, accion_recomendada como condición OR en Compra del Router
- Paso 4 NO implementado en v3 (pendiente que Grok lo haga en su rama)

**Próximos pasos:**
- Linkear credenciales HubSpot y Slack en UI de n8n (v2)
- Implementar Nurturing (Telegram mensaje promo) y Recurrente (Telegram fidelización)
- Probar end-to-end: caso Compra, caso Queja, caso Recurrente
- Activar v2 en Telegram
- Documentación final + Google Drive

### Log 2026-04-15 (sesión de verificación con Opus 4.6)
- Lectura completa de ambos PDFs originales (Proyecto integrador 2B + Material Complementario)
- Verificación cruzada contra CONTEXTO.md y HANDOVER.md
- **Gaps encontrados y corregidos en CONTEXTO.md:**
  - Agregada tabla `logs` al schema Supabase (trazabilidad obligatoria para defensa)
  - Agregado campo `telegram_user_id` a tabla clientes
  - Completados campos de tabla `conversaciones` (objecion_principal, resumen, accion_recomendada)
  - Router actualizado de 5 a 6 ramas (faltaba NPS)
  - Agregadas reglas de prioridad en casos límite (queja > fidelización)
  - Agregada sección completa de estimación de costos API ($150/mes GPT-4o vs $4.5/mes mini)
  - Agregada sección de integración HubSpot con endpoints y flujo de deduplicación
  - Agregadas categorías NPS con comportamiento esperado de la IA (6 tipos)
  - Agregada sección de Logging y Trazabilidad con reglas críticas
  - Agregada estrategia de modelos mixtos (GPT-4o-mini conversacional + GPT-4o análisis)
  - Nota sobre datos de ejemplo del PDF que usan BrightHome → adaptar a calzado
  - Agregado template de correo para errores de clasificación
- **HANDOVER.md actualizado** con todas las decisiones de arquitectura completas
- Próximo paso: diagrama de flujo en Excalidraw (JSON directo)

### Log 2026-04-19 sesión 3 — Router fix + Paso 4 completo + limpieza modelos

**Estado del workflow v2 (SDvniUq2L5axPWWu) — 46 nodos:**

**Paso 4 — Ramas implementadas y cableadas (completo):**
- Router[0] Queja urgente → Slack Alerta Queja (#quejas-urgentes C0AUCUXV7DW) → Log Queja ✅
- Router[1] Compra inmediata → Upsert Contacto HubSpot → Crear Deal HubSpot (stage: appointmentscheduled) → Slack Alerta Ventas (#alertas-ventas C0AUCUV2VEU) → Log Compra ✅
- Router[2] Recurrente → Telegram Fidelizacion → Log Recurrente ✅
- Router[3] Post-venta → Log Post-venta (sin acción adicional — rama de observación)
- Router[4] Nurturing → Telegram Promo → Log Nurturing ✅
- Router[5] Exploratorio → Log Exploratorio (sin acción adicional — rama de observación)
- Router[6] Fallback → Log Fallback ✅

**Form Trigger (segundo canal de entrada):**
- Form Trigger → Extraer Datos Form → Buscar Cliente Form → IF Existe Form
  - TRUE → Guardar Mensaje Form
  - FALSE → Crear Cliente Form → Guardar Mensaje Form
  - → Obtener Historial R2 (omite R1, no hay Telegram que responder)
- Formulario: 7 campos (nombre, email, ciudad, interes_principal, producto_categoria, talle, mensaje_cliente)

**Router Decisiones — BUG CORREGIDO:**
- Switch v3 tenía bug con operator `boolean.operation: "true"` → crash "Cannot read properties of undefined (reading 'caseSensitive')"
- Fix: regla r3 reescrita como comparación de strings: `String($json.es_recurrente) === "true"`
- TODAS las reglas usan string comparison, sin operadores booleanos
- Fix confirmado en el JSON del workflow

**Modelos GPT 2b Analisis — estado actual:**
- `gpt-4o Analitico` (OpenRouter): DISABLED — esperando que Victor agregue créditos a OpenRouter
- `GLM Fallback R2` (OpenRouter z-ai/glm-4.5-air:free): ai_languageModel[1] → actuando como primario temporalmente
- `Z*ai/glm-4.5` (conectado por Victor en UI): ai_languageModel[0] del Structured Output Parser (para autoFix)
- **Acción pendiente:** re-habilitar `gpt-4o Analitico` una vez que Victor agregue créditos a OpenRouter

**Modelos AI Agent Conversacional — OK:**
- `gpt-4o-mini` (OpenAI directo): ai_languageModel[0] ✅
- `GLM Fallback R1`: ai_languageModel[1] ✅

**Structured Output Parser:**
- `autoFix: true` + `Z*ai/glm-4.5` conectado como sub-modelo (requerido por autoFix)
- Victor conectó el GLM en la UI de n8n — fix de sesión anterior

**Schema real de tabla clientes (IMPORTANTE para defensa):**
La tabla `clientes` en Supabase NO tiene campos `fecha_compra`, `monto`, `producto` como indica CONTEXTO.md.
Tiene: id, email, nombre, telegram_id, ciudad, canal_origen, historial_compras (array JSON), segmento, created_at.
Esto significa que `es_recurrente` siempre será `false` en pruebas normales.
**Para probar rama Recurrente:** insertar manualmente un registro con `historial_compras` no vacío en Supabase,
o actualizar el nodo Enriquecer Recurrencia para chequear `historial_compras.length > 0`.

**HubSpot — fix aplicado:**
- `stage: "appointmentscheduled"` debe estar en top-level de parameters, NO dentro de additionalFields
- Esto fue corregido en la sesión

**Errores conocidos y soluciones:**
- Switch v3 con boolean operator → usar string comparison siempre
- HubSpot "Deal Stage Name or ID required" → mover `stage` a nivel raíz del nodo
- Structured Output Parser "A Model sub-node must be connected" → cuando autoFix:true, conectar modelo GLM al parser
- addConnection sin sourceType/targetType → defaultea a `main`, no `ai_languageModel` — siempre especificar tipo
- gpt-4o via OpenRouter "Payment required" → agregar créditos en openrouter.ai

**Próximos pasos críticos:**
1. ~~Agregar créditos a OpenRouter → re-habilitar `gpt-4o Analitico`~~ ✅ HECHO
2. ~~Activar workflow v2 en Telegram~~ ✅ HECHO
3. Limpiar datos de prueba en Supabase (mensajes/conversaciones/logs del cliente test id: 25ae4c46-dcaf-4219-8cd2-fdcdef002e5c)
4. Probar los 3 casos de defensa: Compra (talle + pago), Queja (producto roto), Recurrente (simular con INSERT manual)
5. Git commit + push
6. Documentación 2-3 páginas + Google Drive

---

## Log 2026-04-19 — Sesión 4 (continuación)

**Problema resuelto: email_detectado se perdía en el pipeline**

- Root cause: `Parsear Analisis` no incluía `email_detectado` en su output JSON
- `Guardar Analisis` guarda en tabla `conversaciones` (sin esa columna) → el campo desaparecía
- `Enriquecer Recurrencia` leía de `$('Guardar Analisis')` → email siempre null
- Gmail `sendTo` null → crash "Cannot read properties of null (reading 'split')"

**Fix aplicado (via fix_nodes.js → PUT API n8n):**
1. `Parsear Analisis`: ahora incluye `email_detectado: analisis.email_detectado || null`
2. `Enriquecer Recurrencia`: lee `emailDetectado = $('Parsear Analisis').first().json.email_detectado || null` (bypassa Guardar Analisis)
3. `email = c.email || emailDetectado || null` → prioriza DB, fallback a lo detectado por GPT

**Resultado:** Email de confirmación llega correctamente. CASO 1 - COMPRA INMEDIATA 100% operativo ✅
- Telegram → GPT extrae email → HubSpot Deal → Gmail confirmación → Slack alerta → Log Supabase

**Sesión 4 continuación — fixes adicionales:**

**Router orden de reglas:** Recurrente subió por encima de Compra (via fix_router_order.js)
- Antes: Compra(1) → Recurrente(2) → recurrente que quería comprar siempre iba a Compra
- Después: Recurrente(1) → Compra(2), con condición intencion≠alta en Recurrente
- Lógica final: recurrente navegando → Fidelizacion | recurrente comprando → HubSpot+Gmail

**AI Agent prompt fixes (via fix_agent_prompt.js):**
- `{{nombre}}` literal en respuestas: agregado "NUNCA uses placeholders como {{nombre}}" al system prompt
- Email repetido: `Construir Contexto Conversacional` ahora lee email de `Buscar Cliente` (Supabase) y lo pasa al agent
- System prompt actualizado: "SI el email ya está registrado, NO vuelvas a pedirlo"

**Telegram Fidelizacion/Promo mensajes (via fix_telegram_messages.js):**
- Antes: "¡Hola Victor Duart! Gracias por ser cliente..." → suena a bot nuevo interrumpiendo
- Después: "Por cierto, Victor, como ya compraste con nosotros..." → fluye como continuación natural

**Regla Recurrente (via fix_recurrente_rule.js):**
- Agregada condición intencion≠alta: recurrente con intención alta va directo a Compra

**Casos de defensa testeados:**
- ✅ CASO 1 - Compra Inmediata: Telegram → HubSpot Deal → Gmail → Slack → Log
- ✅ CASO 2 - Queja Urgente: Slack #quejas-urgentes con análisis correcto
- ✅ CASO 3 - Cliente Recurrente: Fidelizacion cuando navega, Compra cuando compra

**Pendiente para próxima sesión:**
- Testear rama Nurturing (Caso defensa: cliente que compara precios, objeción precio → Telegram Promo)
- Testear Formulario Web (Caso defensa: NPS/feedback por form → análisis completo)
- Post-venta y Exploratorio (solo log, verificar que no crashean)
- Git commit + push
- Documentación 2-3 páginas + Google Drive

---

## Auditoría Opus 4.6 — 2026-04-19 (hallazgos críticos)

Opus leyó CONTEXTO.md, HANDOVER.md, el workflow completo via MCP y el schema Supabase real.
Evaluación general: **7/10 — sólido pero con gaps que pueden costar nota.**

### 🔴 P0 — CRÍTICO (fix inmediato antes de la defensa)

**1. Logs guardan `cliente_id: null` y `detalle: {}`**
- Root cause: los nodos Log leen `$json` pero en ese punto `$json` es la respuesta de Slack/Telegram/HubSpot, no los datos del análisis
- El evaluador va a abrir Supabase, hacer SELECT * FROM logs y ver todo vacío → trazabilidad rota
- Fix: todos los nodos Log deben leer de `$('Enriquecer Recurrencia').first().json` en lugar de `$json`
- Ejemplo para Log Compra:
  - `cliente_id = {{ $('Enriquecer Recurrencia').first().json.cliente_id }}`
  - `detalle = {{ JSON.stringify({ prioridad: $('Enriquecer Recurrencia').first().json.prioridad, accion: $('Enriquecer Recurrencia').first().json.accion_recomendada, modelo_usado: 'gpt-4o+gpt-4o-mini', tokens_consumidos: 0 }) }}`

**2. Faltan `modelo_usado` y `tokens_consumidos` en los logs**
- El PDF los pide explícitamente en trazabilidad
- La tabla DB no tiene esas columnas — solución: meterlos dentro del campo `detalle` (JSON)
- Agregar a detalle de TODOS los nodos Log: `modelo_usado: "gpt-4o+gpt-4o-mini"`, `tokens_consumidos: 0`

### 🟡 P1 — Importante (antes de la defensa)

**3. Form Trigger sin confirmación visible**
- El evaluador envía el formulario y no ve ninguna respuesta
- Fix: configurar "completion page" en el Form Trigger con mensaje de agradecimiento
- O agregar nodo Gmail que envíe confirmación al email del formulario

**4. Queja urgente: condición de Router puede fallar en edge cases**
- Regla actual: `sentimiento=negativo AND objecion≠ninguna`
- Si GPT clasifica `objecion_principal: "ninguna"` pero `sentimiento: "negativo"`, no va a Queja
- Considerar simplificar a solo `sentimiento=negativo`

**5. Agregar few-shot example #3 al prompt analítico (exploratorio)**
- El prompt actual tiene solo 2 ejemplos (compra + queja)
- Agregar: `Ej3: {"sentimiento":"neutro","intencion":"baja","etapa_funnel":"awareness","objecion_principal":"precio","resumen":"Pregunta precios sin decidir","prioridad":"baja","accion_recomendada":"Enviar info promos vigentes"}`

### 🟢 P2 — Mejoras para nota extra

**6. Tabla `conversaciones` le faltan `seguimiento_enviado` y `fecha_ultimo_mensaje`**
- El CONTEXTO.md los menciona — no bloqueante pero puede salir en preguntas

**7. `accion_ejecutada` vs `rama` en DB**
- El PDF pide `accion_ejecutada`, la tabla usa `rama` — es defendible, solo explicarlo

### Estimación de costos (preparada por Opus para la defensa)
- R1 GPT-4o-mini: ~$11/mes (100 conv/día)
- R2 GPT-4o: ~$70/mes
- **Total mixto: ~$81/mes**
- Solo GPT-4o para todo: ~$140/mes → ahorro del 42% con estrategia mixta
- Optimización adicional: si R2 solo dispara 1 de cada 3 mensajes → ~$35/mes total

### Roadmap priorizado — próximos 6 días

| Prioridad | Tarea | Esfuerzo |
|-----------|-------|----------|
| 🔴 P0 | Fix logs: leer de Enriquecer Recurrencia + agregar modelo_usado | 30 min |
| 🔴 P0 | Agregar Ej3 exploratorio al prompt analítico | 5 min |
| 🟡 P1 | Testear Formulario Web + agregar completion page | 20 min |
| 🟡 P1 | Testear ramas Nurturing y Exploratorio | 15 min |
| 🟡 P1 | Evaluar simplificar regla Queja a solo sentimiento=negativo | 10 min |
| 🟢 P2 | Limpiar datos de prueba en Supabase | 5 min |
| 🟢 P2 | Escribir documento de soporte (2-3 pág) | 1-2 h |
| 🟢 P2 | Exportar workflow JSON + diagrama Excalidraw | 15 min |
| 🟢 P2 | Subir todo a Google Drive | 10 min |
| 🟢 P3 | Ensayo general: correr 3 casos de punta a punta | 30 min |
| 🟢 P3 | Preparar explicación oral de costos API | 15 min |

---

## Log 2026-04-19 — Sesión 5 (fixes post-Opus + Webhook testing)

**Fixes aplicados en base al análisis de Opus:**

**1. fix_logs.js — RESUELTO ✅**
- Todos los nodos Log (7) ahora leen `cliente_id` y `detalle` desde `$('Enriquecer Recurrencia').first().json`
- `detalle` incluye `modelo_usado: "gpt-4o+gpt-4o-mini"` y `tokens_consumidos: 0`
- Verificado: logs en Supabase ya muestran cliente_id real y detalle con datos

**2. Webhook Test Trigger — IMPLEMENTADO ✅**
- Nodo Webhook agregado al workflow en posición [240, 620]
- Path: `urbanstep-test`
- URL: `https://primary-production-3de5.up.railway.app/webhook/urbanstep-test`
- Nodo `Extraer Datos Webhook` normaliza el payload al mismo formato que `Extraer Datos`
- Conectado: Webhook → Extraer Datos Webhook → Buscar Cliente (misma ruta que Telegram)
- `Crear Cliente` y `Guardar Mensaje` actualizados para soportar ambas rutas con `.isExecuted` check
- `Construir Contexto Conversacional` actualizado para leer de cualquiera de los dos nodos fuente
- `retryOnFail: false` en AI Agent Conversacional y GPT 2b Analisis (para testing rápido)
- Modo: `onReceived` (async) — responde instantáneamente, ejecuta en ~15-20s

**Payload de test:**
```json
{
  "telegram_id": "XXXX",    ← distinto para cada cliente ficticio
  "nombre": "Nombre Cliente",
  "texto_mensaje": "mensaje del cliente"
}
```

**Nota importante para Opus:** el Telegram Responder falla (no hay chat real) pero con `continueOnFail` el flujo continúa. Solo R2 (análisis + Router + acciones) está plenamente verificable por webhook.

**Pendiente antes de la defensa (reactivar para producción):**
- `retryOnFail: true` en AI Agent Conversacional y GPT 2b Analisis
- Verificar que Telegram Trigger sigue activo y respondiendo mensajes reales

**Estado del Roadmap post-Opus:**
- ✅ P0: Logs con cliente_id + detalle + modelo_usado
- ✅ P0: Webhook para testing automatizado
- ✅ P1: Form Trigger — completion page agregada
- ✅ P1: Regla Queja refinada: sentimiento=negativo AND prioridad=alta
- ✅ P1: Few-shot examples reemplazados con formato rico (contexto conversacional + JSON)
- ⬜ P2: Documento de soporte 2-3 páginas
- ⬜ P2: Exportar JSON + diagrama Excalidraw + Google Drive

---

## Log 2026-04-19 — Sesión 6 (Opus testing masivo + Grok review)

**Testing masivo via Webhook (Opus):**
- 20+ ejecuciones via webhook automatizado
- Bug encontrado y corregido: `$json.body.telegram_id` (webhook pone datos en `body`, no en root)
- 15 clientes ficticios creados con nombres argentinos realistas
- 3 clientes con historial_compras (recurrentes): Carolina Vega, Diego Peralta, Sofia Romero

**Resultados del testing por rama:**
| Rama | Tests | Resultado |
|------|-------|-----------|
| compra-inmediata | 3/3 ✅ | Lucia, Facundo, Camila |
| queja-urgente | 3/3 ✅ | Roberto, Valentina, Martin |
| nurturing-consideracion | 3/3 ✅ | Nicolas, Florencia, Agustina 2 |
| exploratorio-awareness | 3/3 ✅ | Joaquin, Milagros 2, Andrea |
| recurrente-fidelizacion | 2/3 ✅ | Carolina, Sofia (Diego falló por GPT rate limit) |
| post-venta | 1/1 ✅ | Pablo Mendez |
| error-analisis | 1/1 ✅ | Log Error Analisis nuevo captura errores GPT |

**Bugs encontrados y corregidos por Opus:**
1. Webhook body path: `$json.telegram_id` → `$json.body.telegram_id`
2. Regla Queja demasiado agresiva: sentimiento=negativo solo → ahora sentimiento=negativo AND prioridad=alta
3. Log Error Analisis: nuevo nodo conectado a GPT 2b error output (main[1])
4. continueOnFail agregado a Telegram Fidelizacion, Telegram Promo, Gmail, HubSpot

**Problema detectado: Agustina Molina (5007) misrouting**
- Mensaje: "Estoy comparando precios con otras marcas, más caras..."
- GPT clasificó sentimiento=negativo → fue a Queja (incorrecto)
- Fix: regla Queja ahora requiere prioridad=alta además de sentimiento=negativo
- Verificado: Agustina 2 (5018) va correctamente a nurturing

**Review de Grok — cambios adoptados:**
1. ✅ Webhook deshabilitado para defensa (nodos greyed-out, reactivables)
2. ✅ `email_detectado` columna agregada a tabla `conversaciones` + Guardar Analisis lo escribe
3. ✅ Few-shot examples reemplazados con formato rico de Grok (Conversación + Output JSON)
4. ❌ Descartado: historial_compras "no existe" → sí existe (Grok comparó contra PDF, no contra schema real)
5. ❌ Descartado: ahorro 97% → cálculo incorrecto de Grok

**Prompt analítico final (GPT 2b):**
- 3 few-shot examples con formato "Conversación: ... Output: {JSON}"
- Incluye email_detectado en schema y en examples
- Campos obligatorios validados por Structured Output Parser con autoFix

**Base de datos final:**
- 21 clientes (20 ficticios + Victor Duart)
- 54 mensajes (entrada + salida)
- 20 conversaciones (análisis JSON)
- 18 logs con trazabilidad completa (cliente_id, rama, detalle con modelo_usado)

**Test final Telegram en vivo:**
- Victor probó compra de "UrbanStep Max talle 46"
- Bot recordó email sin pedirlo, usó nombre real, confirmó talle, cerró venta
- Flujo impecable post few-shot upgrade ✅

**Pendiente para próxima sesión:**
- Reactivar retryOnFail en AI Agents antes de defensa
- Reactivar webhook si se necesita más testing
- Reactivar Telegram Fidelizacion y Telegram Promo (deshabilitados para testing)
- Documento de soporte 2-3 páginas
- Exportar JSON + diagrama + Google Drive
- Ensayo general de los 3 casos de defensa
- Testear Form Trigger end-to-end
- Conectar TRIGGER_ANALISIS para que R2 solo corra cuando vale la pena
- Actualizar prompt de GPT-4o (GPT 2b Analisis) con contexto enriquecido

---

## Log 2026-04-20/21 — Sesión 7 (Prompt engineering profundo)

**Rediseño completo del prompt del AI Agent Conversacional (con Victor, pensamiento conjunto)**

Victor analizó el flujo nodo por nodo y detectó problemas arquitectónicos fundamentales:

**1. Cambio de rol: "asistente virtual" → "agente calificador de leads"**
- Root cause de las alucinaciones (precios, promos, stock inventados)
- Al ser "asistente" el modelo quería ayudar → inventaba información
- Como "calificador" su trabajo es escuchar, clasificar y derivar → no necesita inventar

**2. Sesiones agrupadas por handoff (no por timestamp)**
- El nodo Code agrupa mensajes en sesiones separadas por frases de handoff
- Una sesión empieza cuando el cliente habla después de un handoff
- Termina con otro handoff ("te van a contactar", "¿necesitás algo más?")
- Resuelve el problema de chats que cruzan la medianoche

**3. Flag OUTDATED calculado en Code (costo $0)**
- Si pasaron más de 24 horas desde el último mensaje → outdated=true
- El agent pregunta "¿seguís interesado o es algo nuevo?"
- Verificado funcionando en test real ✅

**4. TRIGGER_ANALISIS reintroducido**
- R2 (GPT-4o) solo debería correr cuando TRIGGER=SI
- SI: cliente confirmó datos, se despidió, expresó intención clara
- NO: saludos, respuestas cortas, esperando respuesta
- Pendiente: reconectar para que R2 sea condicional (ahora sigue en paralelo)

**5. TEMA para clasificar contexto de queja**
- nuevo / queja_persistente / compra_con_queja_activa
- Separar Respuesta extrae TRIGGER y TEMA del output del agent

**6. Detección de queja activa en Code (costo $0)**
- El Code busca palabras clave negativas en sesiones cerradas
- Pasa quejaActiva=true/false al agent

**7. Historial de compras en contexto**
- El Code lee historial_compras de la tabla clientes
- Lo formatea como texto para el agent
- El agent sabe qué compró antes sin preguntar

**Bugs de prompt resueltos:**
- ✅ No re-saluda en medio de una charla (regla 9)
- ✅ No inventa precios/promos/stock/colores (regla 10 + cambio de rol)
- ✅ Cierra sin loop — "¿necesitás algo más?" → "No" → despedida final
- ✅ Después de handoff saluda como sesión nueva sin referenciar temas anteriores
- ✅ Recuerda email sin pedirlo de nuevo

**Test final completo (2 sesiones consecutivas):**
- Sesión 1: "Hola → Zapatillas Fury talle 46 → email → handoff → No → Cerró" ✅
- Sesión 2: "Hola de nuevo → Lanza cohetes furtivo (test absurdo) → talle 43 → recordó email → handoff → No → Cerró" ✅

**Nodos temporalmente deshabilitados para testing:**
- Webhook Test Trigger + Extraer Datos Webhook (disabled)
- Telegram Fidelizacion (disabled)
- Telegram Promo (disabled)

**Prompt completo del agent está en el workflow, nodo AI Agent Conversacional.**
Estructura: REGLAS ABSOLUTAS → DATOS → RAZONAMIENTO (4 pasos) → ROL → CIERRE → SEÑALES
