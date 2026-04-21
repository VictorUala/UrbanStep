const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    // Fix Log Error Analisis parameters (were wiped)
    const logErrAnalisis = wf.nodes.find(n => n.name === 'Log Error Analisis');
    logErrAnalisis.parameters = {
      operation: 'create',
      tableId: 'logs',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'cliente_id', fieldValue: '={{ $json.cliente_id || null }}' },
          { fieldId: 'workflow_id', fieldValue: 'v2-parallel' },
          { fieldId: 'rama', fieldValue: 'error-analisis' },
          { fieldId: 'estado', fieldValue: 'error' },
          { fieldId: 'detalle', fieldValue: '={{ JSON.stringify({ error: $json.error?.message || "GPT 2b output parsing failed", modelo_usado: "gpt-4o", tokens_consumidos: 0 }) }}' },
          { fieldId: 'error_message', fieldValue: '={{ $json.error?.message || "Structured Output Parser failed" }}' }
        ]
      }
    };
    console.log('✅ Log Error Analisis parameters restored');

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
