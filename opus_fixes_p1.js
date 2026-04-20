const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);
    const fixes = [];

    // ======= FIX 1: Add few-shot example #3 to GPT 2b Analisis =======
    const gpt2b = wf.nodes.find(n => n.name === 'GPT 2b Analisis');
    const oldPrompt = gpt2b.parameters.options.systemMessage;
    if (!oldPrompt.includes('Ej3:')) {
      gpt2b.parameters.options.systemMessage = oldPrompt.trimEnd() + '\nEj3: {"sentimiento":"neutro","intencion":"baja","etapa_funnel":"awareness","objecion_principal":"precio","resumen":"Pregunta precios sin decidir","prioridad":"baja","accion_recomendada":"Enviar info promos vigentes"}';
      fixes.push('FIX 1: Added Ej3 (exploratorio) to GPT 2b Analisis system prompt');
    }

    // ======= FIX 2: Simplify Queja rule to only sentimiento=negativo =======
    const router = wf.nodes.find(n => n.name === 'Router Decisiones');
    const quejaRule = router.parameters.rules.values.find(r => r.outputKey === 'Queja urgente');
    if (quejaRule && quejaRule.conditions.conditions.length > 1) {
      // Remove the objecion_principal condition, keep only sentimiento=negativo
      quejaRule.conditions.conditions = quejaRule.conditions.conditions.filter(c => c.id === 'r1a');
      fixes.push('FIX 2: Simplified Queja rule to only sentimiento=negativo (removed objecion check)');
    }

    // ======= FIX 3: Ensure Telegram Fidelizacion and Telegram Promo have continueOnFail =======
    ['Telegram Fidelizacion', 'Telegram Promo', 'Telegram Responder'].forEach(name => {
      const n = wf.nodes.find(x => x.name === name);
      if (n && n.onError !== 'continueRegularOutput') {
        n.onError = 'continueRegularOutput';
        fixes.push('FIX 3: Set continueOnFail on ' + name);
      }
    });

    // ======= FIX 4: Add completion page to Form Trigger =======
    const form = wf.nodes.find(n => n.name === 'n8n Forms - Solicitud Web UrbanStep');
    if (form) {
      if (!form.parameters.respondWithOptions) {
        form.parameters.respondWithOptions = {};
      }
      form.parameters.respondWithOptions.values = {
        respondWith: 'text',
        formSubmittedText: '¡Gracias por tu consulta! Un representante de UrbanStep te contactará a la brevedad. Si necesitás asistencia inmediata, escribinos por Telegram a @UrbanBot_bot.'
      };
      fixes.push('FIX 4: Added completion page to Form Trigger');
    }

    // ======= FIX 5: Add continueOnFail on Gmail and HubSpot nodes for robustness =======
    ['Gmail Confirmacion Compra', 'Upsert Contacto HubSpot', 'Crear Deal HubSpot'].forEach(name => {
      const n = wf.nodes.find(x => x.name === name);
      if (n) {
        n.continueOnFail = true;
        if (n.onError !== 'continueRegularOutput') {
          n.onError = 'continueRegularOutput';
        }
      }
    });
    fixes.push('FIX 5: Gmail + HubSpot nodes set to continueOnFail for robustness');

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
