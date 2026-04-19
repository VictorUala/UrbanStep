const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

// Expression that works for BOTH Telegram and Webhook paths
const telegramId = `={{ $('Extraer Datos').isExecuted ? $('Extraer Datos').first().json.telegram_id : $('Extraer Datos Webhook').first().json.telegram_id }}`;
const nombre = `={{ $('Extraer Datos').isExecuted ? $('Extraer Datos').first().json.nombre : $('Extraer Datos Webhook').first().json.nombre }}`;
const canal = `={{ $('Extraer Datos').isExecuted ? 'telegram' : 'webhook_test' }}`;

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    const crear = wf.nodes.find(n => n.name === 'Crear Cliente');
    crear.parameters.fieldsUi.fieldValues = [
      { fieldId: 'telegram_id', fieldValue: telegramId },
      { fieldId: 'nombre',      fieldValue: nombre },
      { fieldId: 'canal_origen', fieldValue: canal }
    ];

    // Also fix Construir Contexto Conversacional which reads $('Extraer Datos')
    const ctx = wf.nodes.find(n => n.name === 'Construir Contexto Conversacional');
    ctx.parameters.jsCode = `const historyItems = $input.all();

// Soporta tanto Telegram como Webhook como entrada
let extractedData = {};
try {
  extractedData = $('Extraer Datos').isExecuted
    ? $('Extraer Datos').first().json
    : $('Extraer Datos Webhook').first().json;
} catch(e) {}

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

    console.log('Crear Cliente fixed');
    console.log('Construir Contexto Conversacional fixed');

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
