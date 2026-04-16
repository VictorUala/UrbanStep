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
| OpenAI | ⏳ pendiente | Credencial aún no creada en n8n |
| HubSpot | ⏳ pendiente | Paso 4 |
| Slack | ⏳ pendiente | Paso 4 |
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
