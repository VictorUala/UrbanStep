const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    // 1. Fix Log Error Analisis - set tableId properly
    const logErr = wf.nodes.find(n => n.name === 'Log Error Analisis');
    logErr.parameters = {
      operation: 'create',
      tableId: 'logs',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'rama', fieldValue: 'error-analisis' },
          { fieldId: 'estado', fieldValue: 'error' },
          { fieldId: 'detalle', fieldValue: '={{ JSON.stringify({ error: "GPT 2b failed", modelo_usado: "gpt-4o", tokens_consumidos: 0 }) }}' }
        ]
      }
    };
    console.log('1. Log Error Analisis fixed');

    // 2. Move Buscar Compras Cliente near GPT 2b
    const tool = wf.nodes.find(n => n.name === 'Buscar Compras Cliente');
    tool.position = [2368, 940];
    console.log('2. Tool moved to [2368, 940]');

    // 3. Remove connection from tool to AI Agent Conversacional
    if (wf.connections['Buscar Compras Cliente']) {
      delete wf.connections['Buscar Compras Cliente'];
      console.log('3. Old connection removed');
    }

    // 4. Add connection from tool to GPT 2b Analisis (ai_tool)
    wf.connections['Buscar Compras Cliente'] = {
      ai_tool: [[{
        node: 'GPT 2b Analisis',
        type: 'ai_tool',
        index: 0
      }]]
    };
    console.log('4. New ai_tool connection to GPT 2b Analisis added');

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
