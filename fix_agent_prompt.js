const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    // Fix 1: Construir Contexto Conversacional — include email from Buscar Cliente
    const ctxNode = wf.nodes.find(n => n.name === 'Construir Contexto Conversacional');
    ctxNode.parameters.jsCode = `const historyItems = $input.all();
const extractedData = $('Extraer Datos').first().json;

// Intentar obtener email ya guardado en Supabase
let emailConocido = null;
try {
  const clienteDB = $('Buscar Cliente').first().json;
  emailConocido = clienteDB.email || null;
} catch(e) {}

const sorted = historyItems.filter(i => i.json.id).sort((a, b) => new Date(a.json.timestamp) - new Date(b.json.timestamp));
const clienteId = sorted.length > 0 ? sorted[0].json.cliente_id : null;
const nombre = extractedData.nombre || 'Cliente';
const clean = (t) => t.replace(/^Asistente:\\s*/i, '').trim();
const historialTexto = sorted.map(m => (m.json.direccion === 'entrada' ? 'Cliente' : 'Asistente') + ': ' + clean(m.json.contenido)).join('\\n');
return [{ json: { historialTexto, nombre, emailConocido, cliente_id: clienteId, chat_id: extractedData.chat_id } }];`;

    // Fix 2: AI Agent system prompt — use real name, don't ask for email if already known
    const agent = wf.nodes.find(n => n.name === 'AI Agent Conversacional');
    agent.parameters.options.systemMessage = `Sos el asistente virtual de UrbanStep, marca argentina de calzado urbano premium.
Respondé en español rioplatense, amigable y profesional.

DATOS DEL CLIENTE:
- Nombre: {{ $('Construir Contexto Conversacional').first().json.nombre }}
- Email registrado: {{ $('Construir Contexto Conversacional').first().json.emailConocido || 'no disponible' }}

REGLA CRÍTICA: Usá siempre el nombre real del cliente cuando lo tengas. NUNCA uses placeholders como {{nombre}}, {{email}} ni ninguna variable entre llaves en tus respuestas. Escribí el nombre directamente.

SI el email ya está registrado (no es "no disponible"), NO vuelvas a pedirlo. Usalo directamente.
SI el email NO está registrado, pedilo una sola vez.

TU ROL: calificá al cliente (talle, presupuesto, email si no lo tenés). No listes modelos ni catálogo.
Si piden catálogo o modelos: derivá a ventas, pedí email si no lo tenés.
Ejemplo: '¡Ya le avisé al equipo, Victor! En unos minutos te llega el catálogo.'
Si quieren comprar: confirmá email y pedí talle.
Si hay queja: empatía, avisá que un representante los contactará.
No empieces con 'Asistente:'. Respondé directamente.`;

    console.log('System prompt updated. Email line:', agent.parameters.options.systemMessage.split('\n').find(l => l.includes('Email registrado')));
    console.log('Context code email line:', ctxNode.parameters.jsCode.split('\n').find(l => l.includes('emailConocido =')));

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
        console.log(r.id ? 'GUARDADO OK - ' + r.updatedAt : 'ERROR: ' + JSON.stringify(r).slice(0, 200));
      });
    });
    req.write(payload);
    req.end();
  });
});
