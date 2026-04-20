const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);
    const fixes = [];

    // ======= FIX 1: Queja rule — revert to sentimiento=negativo AND prioridad=alta =======
    // This prevents price comparisons (sentimiento=negativo but prioridad=media/baja) from routing to Queja
    const router = wf.nodes.find(n => n.name === 'Router Decisiones');
    const quejaRule = router.parameters.rules.values.find(r => r.outputKey === 'Queja urgente');
    quejaRule.conditions.conditions = [
      {
        id: 'r1a',
        leftValue: '={{ $json.sentimiento }}',
        rightValue: 'negativo',
        operator: { type: 'string', operation: 'equals' }
      },
      {
        id: 'r1c',
        leftValue: '={{ $json.prioridad }}',
        rightValue: 'alta',
        operator: { type: 'string', operation: 'equals' }
      }
    ];
    quejaRule.conditions.combinator = 'and';
    fixes.push('FIX 1: Queja rule = sentimiento=negativo AND prioridad=alta');

    // ======= FIX 2: Add Log Error Analisis node for GPT 2b error output =======
    const logErrAnalisis = {
      id: 'v2-log-err-analisis',
      name: 'Log Error Analisis',
      type: 'n8n-nodes-base.supabase',
      typeVersion: 2.1,
      position: [2608, 720],
      parameters: {
        operation: 'create',
        tableId: 'logs',
        fieldsUi: {
          fieldValues: [
            { fieldId: 'cliente_id', fieldValue: `={{ $json.cliente_id || null }}` },
            { fieldId: 'workflow_id', fieldValue: 'v2-parallel' },
            { fieldId: 'rama', fieldValue: 'error-analisis' },
            { fieldId: 'estado', fieldValue: 'error' },
            { fieldId: 'detalle', fieldValue: `={{ JSON.stringify({ error: $json.error?.message || 'GPT 2b output parsing failed', modelo_usado: 'gpt-4o', tokens_consumidos: 0 }) }}` },
            { fieldId: 'error_message', fieldValue: `={{ $json.error?.message || 'Structured Output Parser failed' }}` }
          ]
        }
      },
      credentials: wf.nodes.find(n => n.name === 'Log Queja')?.credentials
    };
    wf.nodes.push(logErrAnalisis);

    // Connect GPT 2b Analisis error output (main[1]) to Log Error Analisis
    if (!wf.connections['GPT 2b Analisis'].main[1]) {
      wf.connections['GPT 2b Analisis'].main[1] = [];
    }
    wf.connections['GPT 2b Analisis'].main[1] = [
      { node: 'Log Error Analisis', type: 'main', index: 0 }
    ];
    fixes.push('FIX 2: Added Log Error Analisis connected to GPT 2b error output');

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
