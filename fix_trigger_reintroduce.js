const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);
    const fixes = [];

    // ======= 1. Simplificar Construir Contexto Conversacional a 4 mensajes =======
    const ctx = wf.nodes.find(n => n.name === 'Construir Contexto Conversacional');
    ctx.parameters.jsCode = `const historyItems = $input.all();

// Datos del cliente
let extractedData = {};
try {
  extractedData = $('Extraer Datos').isExecuted
    ? $('Extraer Datos').first().json
    : $('Extraer Datos Webhook').first().json;
} catch(e) {}

// Email desde Supabase
let emailConocido = null;
try {
  const clienteDB = $('Buscar Cliente').first().json;
  emailConocido = clienteDB.email || null;
} catch(e) {}

// Si no hay email en DB, buscar en mensajes (regex)
if (!emailConocido) {
  const emailRegex = /[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}/;
  for (const msg of historyItems.filter(i => i.json.contenido && i.json.direccion === 'entrada')) {
    const match = msg.json.contenido.match(emailRegex);
    if (match) { emailConocido = match[0]; break; }
  }
}

// Ordenar y tomar solo últimos 4 mensajes
const sorted = historyItems.filter(i => i.json.id)
  .sort((a, b) => new Date(a.json.timestamp) - new Date(b.json.timestamp));
const ultimos4 = sorted.slice(-4);

const clienteId = sorted.length > 0 ? sorted[0].json.cliente_id : null;
const nombre = extractedData.nombre || 'Cliente';
const clean = (t) => t.replace(/^Asistente:\\s*/i, '').trim();

const historial = ultimos4.map(m =>
  (m.json.direccion === 'entrada' ? 'Cliente' : 'Asistente') + ': ' + clean(m.json.contenido)
).join('\\n');

return [{ json: {
  historial,
  nombre,
  emailConocido,
  historialCompras: '',
  cliente_id: clienteId,
  chat_id: extractedData.chat_id
} }];`;
    fixes.push('Construir Contexto: simplificado a 4 mensajes');

    // ======= 2. Actualizar prompt con TRIGGER_ANALISIS =======
    const agent = wf.nodes.find(n => n.name === 'AI Agent Conversacional');
    agent.parameters.options.systemMessage = `Sos el asistente de UrbanStep, marca argentina de calzado urbano premium.
Respondé en español rioplatense, amigable y profesional.

═══ TU TRABAJO ═══
- Escuchá al cliente, entendé qué necesita.
- Si hay una queja, sé empático y asegurá que el equipo lo va a resolver.
- Recopilá datos clave si no los tenés: talle y email.
- Cuando tengas una situación comercial clara, avisá que pasás la info al equipo.
- NO inventes precios, stock, colores, promos ni recomendaciones de modelos específicos.

═══ DATOS DEL CLIENTE ═══
Nombre: {{ $json.nombre }}
Email conocido: {{ $json.emailConocido || 'no registrado' }}

═══ HISTORIAL DE CONVERSACIÓN ═══
{{ $json.historial }}

═══ EJEMPLOS DE SITUACIONES ═══
1. Compra: "Quiero las Urban Street Low en talle 38" → Pedí email si no lo tenés, confirmá datos, pasá al equipo. TRIGGER:SI
2. Evaluación: "Estoy viendo modelos para uso diario" → No recomiendes modelos, pasá la consulta al equipo. TRIGGER:SI
3. Recompra: "Compré unas Running Pro hace meses. Quiero otro par." → Confirmá datos, pasá al equipo. TRIGGER:SI
4. Queja: "La suela se despegó en menos de un mes." → Empatía primero, avisá que el equipo se encarga. TRIGGER:SI
5. Exploración: "¿Qué modelos tienen?" → Preguntá qué tipo de calzado busca y su talle. TRIGGER:NO (todavía falta info)

═══ REGLAS ═══
1. No pidas datos que ya tenés.
2. No preguntes "¿necesitás algo más?" más de una vez.
3. Si el cliente dice que no necesita nada más, despedite: "¡Gracias por elegir UrbanStep! Cualquier cosa, acá estamos."
4. Si hay queja, empatía primero, después avisá que el equipo se encarga.
5. Cuando tengas datos suficientes, cerrá con: "¡Listo! Ya le paso la info al equipo. Te van a contactar a la brevedad."
6. Solo calzado. Si preguntan otra cosa: "En UrbanStep solo trabajamos con calzado urbano."
7. NUNCA uses placeholders como {{nombre}}.
8. Sé conciso. Respuestas cortas y directas.

═══ SEÑAL DE ANÁLISIS (OBLIGATORIA) ═══
Al final de CADA respuesta, en una línea aparte, escribí:
TRIGGER_ANALISIS:SI — cuando hay una situación comercial clara (compra, queja, interés concreto en producto, email dado, datos completos)
TRIGGER_ANALISIS:NO — cuando es saludo, charla trivial, respuesta incompleta (falta talle/email), o despedida final`;
    fixes.push('Prompt: TRIGGER_ANALISIS reintroducido');

    // ======= 3. Reconectar: R2 secuencial después del trigger =======
    // Quitar conexión paralela Guardar Mensaje → Obtener Historial R2
    const gmConn = wf.connections['Guardar Mensaje'];
    if (gmConn && gmConn.main && gmConn.main[0]) {
      gmConn.main[0] = gmConn.main[0].filter(c => c.node !== 'Obtener Historial R2');
      fixes.push('Desconectado: Guardar Mensaje → Obtener Historial R2 (ya no paralelo)');
    }

    // Agregar nodo IF Disparar Análisis si no existe
    let ifTrigger = wf.nodes.find(n => n.name === 'IF Disparar Analisis');
    if (!ifTrigger) {
      ifTrigger = {
        id: 'v2-if-trigger',
        name: 'IF Disparar Analisis',
        type: 'n8n-nodes-base.if',
        typeVersion: 2,
        position: [2880, -176],
        parameters: {
          conditions: {
            options: { caseSensitive: true, typeValidation: 'strict' },
            conditions: [{
              id: 'trigger-cond',
              leftValue: '={{ $json.trigger }}',
              rightValue: true,
              operator: { type: 'boolean', operation: 'true' }
            }],
            combinator: 'and'
          },
          options: {}
        }
      };
      wf.nodes.push(ifTrigger);
      fixes.push('Nodo IF Disparar Analisis creado');
    }

    // Conectar Separar Respuesta → IF Disparar Analisis (agregar a las salidas existentes)
    if (!wf.connections['Separar Respuesta']) {
      wf.connections['Separar Respuesta'] = { main: [[]] };
    }
    // Agregar IF Disparar Analisis a la salida de Separar Respuesta
    const sepConns = wf.connections['Separar Respuesta'].main[0];
    if (!sepConns.find(c => c.node === 'IF Disparar Analisis')) {
      sepConns.push({ node: 'IF Disparar Analisis', type: 'main', index: 0 });
      fixes.push('Conectado: Separar Respuesta → IF Disparar Analisis');
    }

    // Conectar IF Disparar Analisis TRUE → Obtener Historial R2
    wf.connections['IF Disparar Analisis'] = {
      main: [
        [{ node: 'Obtener Historial R2', type: 'main', index: 0 }], // TRUE
        [] // FALSE → fin
      ]
    };
    fixes.push('Conectado: IF Disparar Analisis (TRUE) → Obtener Historial R2');

    console.log('Fixes aplicados:');
    fixes.forEach(f => console.log('  ✅ ' + f));

    const payload = JSON.stringify({
      name: wf.name, nodes: wf.nodes, connections: wf.connections,
      settings: { executionOrder: wf.settings?.executionOrder || 'v1' }, staticData: null
    });

    const putOpts = {
      hostname: 'primary-production-3de5.up.railway.app',
      path: '/api/v1/workflows/SDvniUq2L5axPWWu',
      method: 'PUT',
      headers: {'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload)}
    };
    let resp = '';
    const req = https.request(putOpts, res => {
      res.on('data', d => resp += d);
      res.on('end', () => {
        const r = JSON.parse(resp);
        console.log(r.id ? '\nGUARDADO OK - ' + r.updatedAt : '\nERROR: ' + JSON.stringify(r).slice(0, 300));
      });
    });
    req.write(payload);
    req.end();
  });
});
