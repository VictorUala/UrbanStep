const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);
    const node = wf.nodes.find(n => n.name === 'Construir Prompt Analitico');

    const oldCode = node.parameters.jsCode;

    const newCode = `const historyItems = $input.all();
const sorted = historyItems.filter(i => i.json.id).sort((a, b) => new Date(a.json.timestamp) - new Date(b.json.timestamp));
const clienteId = sorted.length > 0 ? sorted[0].json.cliente_id : null;
const clean = (t) => t.replace(/^Asistente:\\s*/i, '').trim();

// Detectar si el último mensaje viene del formulario NPS
const ultimoMsg = sorted[sorted.length - 1];
const esNPS = ultimoMsg && ultimoMsg.json.canal === 'nps-form';

let historialTexto;

if (esNPS) {
  // Para NPS: solo el mensaje NPS + contexto de historial de compras del cliente
  const contenidoNPS = ultimoMsg.json.contenido;

  // Intentar obtener historial de compras del cliente desde Buscar Cliente NPS
  let historialCompras = '';
  try {
    const cliente = $('Buscar Cliente NPS').first().json;
    if (cliente && cliente.historial_compras && cliente.historial_compras.length > 0) {
      historialCompras = '\\nHistorial de compras del cliente:\\n' +
        cliente.historial_compras.map(c => '- ' + c.producto + ' (talle ' + c.talle + ', $' + c.monto + ', ' + c.fecha + ')').join('\\n');
    }
  } catch(e) {
    // Si no viene de NPS form path, ignorar
    try {
      const cliente = $('Buscar Cliente Form').first().json;
      if (cliente && cliente.historial_compras && cliente.historial_compras.length > 0) {
        historialCompras = '\\nHistorial de compras del cliente:\\n' +
          cliente.historial_compras.map(c => '- ' + c.producto + ' (talle ' + c.talle + ', $' + c.monto + ', ' + c.fecha + ')').join('\\n');
      }
    } catch(e2) {}
  }

  historialTexto = '[ENCUESTA NPS]\\n' + contenidoNPS + historialCompras;
} else {
  // Para Telegram/Form/Webhook: historial completo como antes
  historialTexto = sorted.map(m => (m.json.direccion === 'entrada' ? 'Cliente' : 'Asistente') + ': ' + clean(m.json.contenido)).join('\\n');
}

return [{ json: { historialTexto, cliente_id: clienteId } }];`;

    node.parameters.jsCode = newCode;
    console.log('Code updated. Preview:');
    console.log(newCode.slice(0, 200) + '...');

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
