const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    // 1. Add Webhook trigger node
    const webhookNode = {
      id: 'v2-webhook-test',
      name: 'Webhook Test Trigger',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [240, 620],
      parameters: {
        httpMethod: 'POST',
        path: 'urbanstep-test',
        responseMode: 'onReceived',
        responseData: 'firstEntryJson',
        options: {}
      }
    };

    // 2. Add Set node to normalize webhook input → same format as Extraer Datos
    const setNode = {
      id: 'v2-set-webhook',
      name: 'Extraer Datos Webhook',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [480, 620],
      parameters: {
        assignments: {
          assignments: [
            { id: 'w1', name: 'telegram_id', type: 'string', value: '={{ $json.telegram_id || "test-" + Date.now() }}' },
            { id: 'w2', name: 'nombre',      type: 'string', value: '={{ $json.nombre || "Cliente Test" }}' },
            { id: 'w3', name: 'texto_mensaje', type: 'string', value: '={{ $json.texto_mensaje || "" }}' },
            { id: 'w4', name: 'chat_id',     type: 'string', value: '={{ $json.telegram_id || "test-000" }}' }
          ]
        },
        options: {}
      }
    };

    wf.nodes.push(webhookNode);
    wf.nodes.push(setNode);

    // 3. Add Telegram Responder continueOnFail so it doesn't crash on fake chat_id
    const tgResponder = wf.nodes.find(n => n.name === 'Telegram Responder');
    if (tgResponder) {
      tgResponder.onError = 'continueRegularOutput';
    }

    // 4. Connect: Webhook → Extraer Datos Webhook → Buscar Cliente (same as real flow)
    wf.connections['Webhook Test Trigger'] = {
      main: [[{ node: 'Extraer Datos Webhook', type: 'main', index: 0 }]]
    };
    wf.connections['Extraer Datos Webhook'] = {
      main: [[{ node: 'Buscar Cliente', type: 'main', index: 0 }]]
    };

    console.log('Webhook node added at path: /webhook/urbanstep-test');
    console.log('Telegram Responder onError set to continueRegularOutput');

    // Get the webhook URL
    const webhookUrl = 'https://primary-production-3de5.up.railway.app/webhook/urbanstep-test';
    console.log('Test URL:', webhookUrl);
    console.log('\nExample curl:');
    console.log(`curl -X POST ${webhookUrl} \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"telegram_id":"1001","nombre":"Ana Garcia","texto_mensaje":"Hola quiero comprar unas zapatillas talle 38"}'`);

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
        console.log(r.id ? '\nGUARDADO OK - ' + r.updatedAt : '\nERROR: ' + JSON.stringify(r).slice(0, 200));
      });
    });
    req.write(payload);
    req.end();
  });
});
