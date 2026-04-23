const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);
    const fixes = [];

    // ======= FIX 1: Construir Contexto — scan messages for email if DB has none =======
    const ctx = wf.nodes.find(n => n.name === 'Construir Contexto Conversacional');
    const oldCode = ctx.parameters.jsCode;

    // Replace the email section to also scan messages
    const oldEmailBlock = `// Obtener email y datos del cliente desde Supabase
let emailConocido = null;
let historialCompras = [];
try {
  const clienteDB = $('Buscar Cliente').first().json;
  emailConocido = clienteDB.email || null;
  historialCompras = clienteDB.historial_compras || [];
} catch(e) {}`;

    const newEmailBlock = `// Obtener email y datos del cliente desde Supabase
let emailConocido = null;
let historialCompras = [];
try {
  const clienteDB = $('Buscar Cliente').first().json;
  emailConocido = clienteDB.email || null;
  historialCompras = clienteDB.historial_compras || [];
} catch(e) {}

// Si no hay email en DB, buscar en mensajes anteriores (regex)
if (!emailConocido) {
  const emailRegex = /[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}/;
  const todosLosMensajes = historyItems.filter(i => i.json.contenido && i.json.direccion === 'entrada');
  for (const msg of todosLosMensajes) {
    const match = msg.json.contenido.match(emailRegex);
    if (match) {
      emailConocido = match[0];
      break;
    }
  }
}`;

    ctx.parameters.jsCode = oldCode.replace(oldEmailBlock, newEmailBlock);
    fixes.push('Construir Contexto: scans messages for email if DB has none');

    // ======= FIX 2: Prompt — restrict to calzado only =======
    const agent = wf.nodes.find(n => n.name === 'AI Agent Conversacional');
    const prompt = agent.parameters.options.systemMessage;

    // Add calzado restriction to REGLAS ABSOLUTAS after rule 5
    const oldRule5 = `5. Si el talle ya lo mencionó, NO lo pidas de nuevo.`;
    const newRule5 = `5. Si el talle ya lo mencionó, NO lo pidas de nuevo.
6. Solo atendés consultas relacionadas con calzado y accesorios de calzado. Si el cliente pregunta por cualquier otra cosa (comida, electrónica, ropa, etc.), respondé: "En UrbanStep solo trabajamos con calzado urbano. ¿Te puedo ayudar con algún modelo de zapatillas?"`;

    agent.parameters.options.systemMessage = prompt.replace(oldRule5, newRule5);
    fixes.push('Prompt: added calzado-only restriction (rule 6)');

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
