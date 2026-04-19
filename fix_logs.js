const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

const ER = "$('Enriquecer Recurrencia').first().json";

// detalle por rama — cada una incluye modelo_usado y tokens_consumidos
const detalles = {
  'Log Queja':        `={{ JSON.stringify({ prioridad: ${ER}.prioridad, accion: ${ER}.accion_recomendada, sentimiento: ${ER}.sentimiento, objecion: ${ER}.objecion_principal, modelo_usado: 'gpt-4o+gpt-4o-mini', tokens_consumidos: 0 }) }}`,
  'Log Compra':       `={{ JSON.stringify({ prioridad: ${ER}.prioridad, accion: ${ER}.accion_recomendada, intencion: ${ER}.intencion, email: ${ER}.email, modelo_usado: 'gpt-4o+gpt-4o-mini', tokens_consumidos: 0 }) }}`,
  'Log Recurrente':   `={{ JSON.stringify({ prioridad: ${ER}.prioridad, accion: ${ER}.accion_recomendada, producto_previo: ${ER}.producto_previo, es_recurrente: ${ER}.es_recurrente, modelo_usado: 'gpt-4o+gpt-4o-mini', tokens_consumidos: 0 }) }}`,
  'Log Post-venta':   `={{ JSON.stringify({ prioridad: ${ER}.prioridad, accion: ${ER}.accion_recomendada, sentimiento: ${ER}.sentimiento, modelo_usado: 'gpt-4o+gpt-4o-mini', tokens_consumidos: 0 }) }}`,
  'Log Nurturing':    `={{ JSON.stringify({ prioridad: ${ER}.prioridad, accion: ${ER}.accion_recomendada, objecion: ${ER}.objecion_principal, modelo_usado: 'gpt-4o+gpt-4o-mini', tokens_consumidos: 0 }) }}`,
  'Log Exploratorio': `={{ JSON.stringify({ prioridad: ${ER}.prioridad, accion: ${ER}.accion_recomendada, etapa_funnel: ${ER}.etapa_funnel, modelo_usado: 'gpt-4o+gpt-4o-mini', tokens_consumidos: 0 }) }}`,
  'Log Fallback':     `={{ JSON.stringify({ etapa_funnel: ${ER}.etapa_funnel, intencion: ${ER}.intencion, sentimiento: ${ER}.sentimiento, modelo_usado: 'gpt-4o+gpt-4o-mini', tokens_consumidos: 0 }) }}`,
};

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    let fixed = 0;
    wf.nodes.forEach(n => {
      if (!n.name.startsWith('Log ') || n.name === 'Log Error Conversacional') return;
      if (!n.parameters.fieldsUi?.fieldValues) return;

      const fields = n.parameters.fieldsUi.fieldValues;

      // Fix cliente_id
      const cidField = fields.find(f => f.fieldId === 'cliente_id');
      if (cidField) {
        cidField.fieldValue = `={{ ${ER}.cliente_id || null }}`;
      }

      // Fix detalle
      const detField = fields.find(f => f.fieldId === 'detalle');
      if (detField && detalles[n.name]) {
        detField.fieldValue = detalles[n.name];
      }

      console.log('Fixed:', n.name);
      console.log('  cliente_id:', cidField?.fieldValue);
      console.log('  detalle preview:', detField?.fieldValue?.slice(0, 80) + '...');
      fixed++;
    });

    console.log('\nTotal nodos fixeados:', fixed);

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
