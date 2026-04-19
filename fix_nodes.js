const https = require('https');
const fs = require('fs');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    // Fix 1: Parsear Analisis — include email_detectado in output
    const parsear = wf.nodes.find(n => n.name === 'Parsear Analisis');
    parsear.parameters.jsCode = `// Con Structured Output Parser, $json.output ya es un objeto
const analisis = (typeof $json.output === 'object' && $json.output !== null) ? $json.output : {};
const clienteId = $('Construir Prompt Analitico').first().json.cliente_id;
return [{ json: {
  cliente_id: clienteId,
  sentimiento: analisis.sentimiento || 'neutro',
  intencion: analisis.intencion || 'baja',
  etapa_funnel: analisis.etapa_funnel || 'awareness',
  objecion_principal: analisis.objecion_principal || 'ninguna',
  resumen: analisis.resumen || '',
  prioridad: analisis.prioridad || 'baja',
  accion_recomendada: analisis.accion_recomendada || '',
  email_detectado: analisis.email_detectado || null
} }];`;

    // Fix 2: Enriquecer Recurrencia — read email_detectado from Parsear Analisis (before Supabase loses it)
    const enrich = wf.nodes.find(n => n.name === 'Enriquecer Recurrencia');
    enrich.parameters.jsCode = `const items = $input.all();
const c = items.length > 0 ? items[0].json : {};
const a = $('Guardar Analisis').first().json;
const emailDetectado = $('Parsear Analisis').first().json.email_detectado || null;
const esRec = !!(c.fecha_compra || (c.monto && c.monto > 0) || (c.historial_compras && c.historial_compras.length > 0));
const email = c.email || emailDetectado || null;
return [{ json: {
  ...a,
  nombre: c.nombre || 'Cliente',
  email: email,
  telegram_id: c.telegram_id || null,
  es_recurrente: esRec,
  producto_previo: c.producto || null,
  fecha_compra_previa: c.fecha_compra || null,
  canal_venta_previo: c.canal_venta || null,
  monto_previo: c.monto || null
} }];`;

    console.log('Parsear code updated, email_detectado line:', parsear.parameters.jsCode.split('\n').find(l => l.includes('email_detectado')));
    console.log('Enrich email line:', enrich.parameters.jsCode.split('\n').find(l => l.includes('emailDetectado =')));

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
        console.log(r.id ? 'GUARDADO OK - ' + r.updatedAt : 'ERROR: ' + JSON.stringify(r).slice(0,200));
      });
    });
    req.write(payload);
    req.end();
  });
});
