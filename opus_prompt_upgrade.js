const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);
    const fixes = [];

    // ======= FIX 1: Construir Contexto Conversacional =======
    const ctx = wf.nodes.find(n => n.name === 'Construir Contexto Conversacional');
    ctx.parameters.jsCode = `const historyItems = $input.all();

// Soporta tanto Telegram como Webhook como entrada
let extractedData = {};
try {
  extractedData = $('Extraer Datos').isExecuted
    ? $('Extraer Datos').first().json
    : $('Extraer Datos Webhook').first().json;
} catch(e) {}

// Obtener email y datos del cliente desde Supabase
let emailConocido = null;
let historialCompras = [];
try {
  const clienteDB = $('Buscar Cliente').first().json;
  emailConocido = clienteDB.email || null;
  historialCompras = clienteDB.historial_compras || [];
} catch(e) {}

// Obtener estado actual del cliente desde tabla conversaciones
let estadoCliente = { queja_activa: false, sentimiento: null, etapa_funnel: null };
try {
  const convDB = $('Buscar Cliente').first().json;
  // Si la última conversación fue negativa, hay queja activa
  // Esto se obtiene del historial — buscamos si hay análisis previo con sentimiento negativo
} catch(e) {}

// Ordenar mensajes cronológicamente
const sorted = historyItems.filter(i => i.json.id)
  .sort((a, b) => new Date(a.json.timestamp) - new Date(b.json.timestamp));

const clienteId = sorted.length > 0 ? sorted[0].json.cliente_id : null;
const nombre = extractedData.nombre || 'Cliente';

// Detectar frases de handoff para separar sesiones
const esHandoff = (texto) => {
  if (!texto) return false;
  const t = texto.toLowerCase();
  return t.includes('te van a contactar') ||
         t.includes('necesit\\u00e1s algo m\\u00e1s') ||
         t.includes('necesitas algo mas') ||
         t.includes('gracias por elegir') ||
         t.includes('cualquier cosa') ||
         t.includes('paso la informaci\\u00f3n') ||
         t.includes('paso la info') ||
         t.includes('paso toda la informacion') ||
         t.includes('equipo de ventas');
};

// Agrupar mensajes en sesiones por handoff
const sesiones = [];
let sesionActual = [];
const clean = (t) => t.replace(/^Asistente:\\s*/i, '').trim();

sorted.forEach(m => {
  const contenido = clean(m.json.contenido);
  const esBot = m.json.direccion === 'salida';
  sesionActual.push({
    rol: esBot ? 'Asistente' : 'Cliente',
    contenido: contenido,
    timestamp: m.json.timestamp
  });
  // Si es mensaje del bot con handoff, cerrar sesión
  if (esBot && esHandoff(contenido)) {
    sesiones.push({ mensajes: sesionActual, cerrada: true });
    sesionActual = [];
  }
});
// La sesión actual (abierta) si tiene mensajes
if (sesionActual.length > 0) {
  sesiones.push({ mensajes: sesionActual, cerrada: false });
}

// Calcular OUTDATED: horas desde el último mensaje
let outdated = false;
let horasDesdeUltimo = 0;
if (sorted.length > 0) {
  const ultimoTs = new Date(sorted[sorted.length - 1].json.timestamp);
  horasDesdeUltimo = Math.round((Date.now() - ultimoTs.getTime()) / 3600000);
  outdated = horasDesdeUltimo > 24;
}

// Detectar si hay queja activa en sesiones cerradas anteriores
let quejaActiva = false;
let detalleQueja = '';
sesiones.forEach(s => {
  if (s.cerrada) {
    const textoCompleto = s.mensajes.map(m => m.contenido).join(' ').toLowerCase();
    if (textoCompleto.includes('roto') || textoCompleto.includes('rota') ||
        textoCompleto.includes('da\\u00f1ado') || textoCompleto.includes('queja') ||
        textoCompleto.includes('reclamo') || textoCompleto.includes('despeg') ||
        textoCompleto.includes('equivocado') || textoCompleto.includes('enojado') ||
        textoCompleto.includes('inaceptable') || textoCompleto.includes('pesimo')) {
      quejaActiva = true;
      const msgCliente = s.mensajes.filter(m => m.rol === 'Cliente').map(m => m.contenido).join('. ');
      detalleQueja = msgCliente.slice(0, 100);
    }
  }
});

// Armar historial de compras como texto
let comprasTexto = 'Sin compras previas';
if (historialCompras.length > 0) {
  comprasTexto = historialCompras.map(c =>
    '- ' + (c.producto || 'Producto') + ', talle ' + (c.talle || '?') +
    ', $' + (c.monto || '?') + ', ' + (c.fecha || '?') + ' (' + (c.canal || '?') + ')'
  ).join('\\n');
}

// Armar sesiones como texto
let sesionesTexto = '';
sesiones.forEach((s, i) => {
  const estado = s.cerrada ? 'cerrada' : (outdated ? 'abierta — OUTDATED: ultimo mensaje hace ' + horasDesdeUltimo + ' horas' : 'abierta — ACTUAL');
  sesionesTexto += 'SESION ' + (i + 1) + ' (' + estado + '):\\n';
  s.mensajes.forEach(m => {
    sesionesTexto += '  ' + m.rol + ': ' + m.contenido + '\\n';
  });
  sesionesTexto += '\\n';
});

// Contexto completo para el agent
const contextoCompleto =
  'ESTADO DEL CLIENTE:\\n' +
  '- Queja activa: ' + (quejaActiva ? 'SI (' + detalleQueja + ')' : 'NO') + '\\n' +
  '- Email registrado: ' + (emailConocido || 'no disponible') + '\\n' +
  '\\nHISTORIAL DE COMPRAS:\\n' + comprasTexto + '\\n' +
  '\\n' + sesionesTexto;

return [{ json: {
  historialTexto: contextoCompleto,
  nombre,
  emailConocido,
  cliente_id: clienteId,
  chat_id: extractedData.chat_id,
  outdated,
  quejaActiva
} }];`;
    fixes.push('Construir Contexto Conversacional: sessions by handoff, outdated flag, queja detection, purchase history');

    // ======= FIX 2: AI Agent Conversacional system prompt =======
    const agent = wf.nodes.find(n => n.name === 'AI Agent Conversacional');
    agent.parameters.options.systemMessage = `Sos el asistente virtual de UrbanStep, marca argentina de calzado urbano premium.
Respondé en español rioplatense, amigable y profesional.
Tu rol es calificar al cliente y recopilar información, NO vender ni dar precios.

═══ DATOS QUE RECIBÍS ═══

Con cada mensaje recibís:
- ESTADO DEL CLIENTE: si tiene queja activa, su etapa actual en el funnel, su email si ya lo tenemos
- HISTORIAL DE COMPRAS: productos que compró antes, fechas, montos
- SESIONES DE CONVERSACIÓN: mensajes agrupados por handoff (cada sesión empieza después de un cierre anterior)
- FLAG OUTDATED: si pasaron más de 24 horas desde el último mensaje

═══ RAZONAMIENTO INTERNO (nunca mostrarlo al cliente) ═══

Antes de responder, seguí estos pasos:

PASO 1 — ¿Estoy en una conversación abierta o es una nueva?
Fijate si tu último mensaje en el historial fue un handoff (despedida, "te van a contactar", "necesitás algo más").
- Si fue handoff → este mensaje del cliente es una conversación NUEVA
- Si NO fue handoff → seguís en la misma conversación, continuá recopilando información

PASO 2 — ¿La sesión está marcada como OUTDATED?
Si pasaron más de 24 horas desde el último mensaje, no asumas que el cliente quiere continuar con el mismo tema. Preguntá: "¡Hola [nombre]! Vi que habías consultado hace unos días. ¿Seguís interesado en lo mismo o te puedo ayudar con algo nuevo?"

PASO 3 — ¿El cliente tiene una queja activa?
- Si tiene queja Y habla del mismo problema → es queja persistente
- Si tiene queja PERO habla de otro tema → es tema nuevo, la queja se maneja por separado
- Si no hay queja → flujo normal

PASO 4 — ¿Tengo que hacer una pregunta o puedo cerrar?
Si todavía no tenés los datos mínimos para pasarle al equipo (qué quiere el cliente), seguí preguntando.
Si ya tenés suficiente información, cerrá con handoff.

═══ REGLAS DE COMPORTAMIENTO ═══

1. Usá siempre el nombre real del cliente. NUNCA uses placeholders como {{nombre}} ni variables entre llaves.
2. Si el email ya está registrado, NO lo pidas de nuevo.
3. Si el talle ya lo mencionó antes, NO lo pidas de nuevo.
4. No listes modelos, precios ni catálogo. Si piden esa información: "¡Ya le paso la consulta al equipo! En unos minutos te envían toda la info."
5. Si quieren comprar: recopilá email (si no lo tenemos) y talle.
6. Si hay queja: mostrá empatía, disculpas, y avisá que un representante los va a contactar.
7. Si hay queja activa pero el cliente habla de comprar: tratá la compra con normalidad. No menciones la queja a menos que el cliente la traiga.
8. No empieces con "Asistente:". Respondé directamente.

═══ CIERRE DE CONVERSACIÓN ═══

Siempre terminá tu mensaje con una pregunta o confirmación.

Cuando tengas los datos necesarios, cerrá con handoff:
"¡Listo! Ya le paso toda la información al equipo. Te van a contactar a la brevedad. ¿Necesitás algo más?"

Cuando el cliente se despida o diga que no necesita nada más:
"¡Gracias por elegir UrbanStep, [nombre]! Cualquier cosa, acá estamos."

═══ SEÑALES DE SALIDA (línea separada al final, invisible al cliente) ═══

TRIGGER_ANALISIS:SI o NO

SI cuando:
- El cliente respondió a "¿necesitás algo más?"
- El cliente se despidió
- El cliente confirmó datos concretos (talle, email, queja con detalles)
- El cliente expresó una intención clara aunque sea exploratoria ("dejame pensarlo", "estoy comparando precios", "quiero ver opciones")

NO solamente cuando:
- Es un saludo sin contenido ("hola", "buenas")
- Es una respuesta corta a una pregunta tuya ("sí", "42", "ok")
- Hiciste una pregunta y esperás la respuesta del cliente

TEMA:nuevo / queja_persistente / compra_con_queja_activa
nuevo = conversación estándar sin queja previa
queja_persistente = el cliente vuelve a hablar de una queja anterior (ALERTA)
compra_con_queja_activa = quiere comprar pero tiene queja abierta`;
    fixes.push('AI Agent Conversacional: new system prompt with handoff logic, TRIGGER, TEMA, OUTDATED');

    // ======= FIX 3: Separar Respuesta — extract TRIGGER and TEMA =======
    const sep = wf.nodes.find(n => n.name === 'Separar Respuesta');
    sep.parameters.jsCode = `const output = $json.output || '';

// Extraer TRIGGER_ANALISIS
const triggerMatch = output.match(/TRIGGER_ANALISIS:\\s*(SI|NO)/i);
const trigger = triggerMatch ? triggerMatch[1].toUpperCase() === 'SI' : false;

// Extraer TEMA
const temaMatch = output.match(/TEMA:\\s*(\\w+)/i);
const tema = temaMatch ? temaMatch[1].toLowerCase() : 'nuevo';

// Limpiar respuesta: quitar las señales internas
let respuesta = output
  .replace(/TRIGGER_ANALISIS:\\s*(SI|NO)/gi, '')
  .replace(/TEMA:\\s*\\w+/gi, '')
  .replace(/^Asistente:\\s*/i, '')
  .trim();

const ctx = $('Construir Contexto Conversacional').first().json;
return [{ json: {
  respuesta,
  trigger,
  tema,
  cliente_id: ctx.cliente_id,
  chat_id: ctx.chat_id,
  quejaActiva: ctx.quejaActiva || false
} }];`;
    fixes.push('Separar Respuesta: now extracts TRIGGER_ANALISIS and TEMA from agent output');

    console.log('Fixes applied:');
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
