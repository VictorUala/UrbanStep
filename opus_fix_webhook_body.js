const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    const setNode = wf.nodes.find(n => n.name === 'Extraer Datos Webhook');
    setNode.parameters.assignments.assignments = [
      { id: 'w1', name: 'telegram_id', type: 'string', value: '={{ $json.body.telegram_id || "test-" + Date.now() }}' },
      { id: 'w2', name: 'nombre',      type: 'string', value: '={{ $json.body.nombre || "Cliente Test" }}' },
      { id: 'w3', name: 'texto_mensaje', type: 'string', value: '={{ $json.body.texto_mensaje || "" }}' },
      { id: 'w4', name: 'chat_id',     type: 'string', value: '={{ $json.body.telegram_id || "test-000" }}' }
    ];

    console.log('Extraer Datos Webhook fixed to read from $json.body');

    // Also clean up the bad test clients that were created with wrong data
    console.log('Note: Clean up bad test clients in Supabase separately');

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
        console.log(r.id ? 'GUARDADO OK - ' + r.updatedAt : 'ERROR: ' + JSON.stringify(r).slice(0, 300));
      });
    });
    req.write(payload);
    req.end();
  });
});
