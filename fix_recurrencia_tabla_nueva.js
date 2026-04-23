const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    // 1. Cambiar Consultar Recurrencia: buscar en compras_clientes por email
    const consul = wf.nodes.find(n => n.name === 'Consultar Recurrencia');
    consul.parameters = {
      operation: 'getAll',
      tableId: 'compras_clientes',
      returnAll: true,
      filterType: 'string',
      filterString: "={{ 'email=eq.' + ($json.email_detectado || $('Parsear Analisis').first().json.email_detectado || '') }}"
    };
    // Asegurar que tenga alwaysOutputData para que no se frene si no encuentra
    consul.alwaysOutputData = true;
    console.log('1. Consultar Recurrencia → compras_clientes por email');

    // 2. Cambiar Enriquecer Recurrencia: leer de compras_clientes
    const enrich = wf.nodes.find(n => n.name === 'Enriquecer Recurrencia');
    enrich.parameters.jsCode = `const compras = $input.all().filter(i => i.json.email);
const a = $('Guardar Analisis').first().json;
const emailDetectado = $('Parsear Analisis').first().json.email_detectado || null;

// Datos del cliente desde la tabla clientes
let clienteNombre = 'Cliente';
let clienteEmail = emailDetectado;
let clienteTelegramId = null;
try {
  const c = $('Consultar Recurrencia').first().json;
  clienteNombre = c.nombre || clienteNombre;
  clienteEmail = c.email || clienteEmail;
} catch(e) {}

// Buscar datos del cliente original
try {
  const cl = $('Guardar Analisis').first().json;
  clienteTelegramId = cl.telegram_id || null;
} catch(e) {}

// Recurrencia basada en compras_clientes
const esRecurrente = compras.length > 0;
const ultimaCompra = compras.length > 0 ? compras[compras.length - 1].json : null;

return [{ json: {
  ...a,
  nombre: compras.length > 0 ? compras[0].json.nombre : clienteNombre,
  email: compras.length > 0 ? compras[0].json.email : clienteEmail,
  telegram_id: clienteTelegramId,
  es_recurrente: esRecurrente,
  producto_previo: ultimaCompra ? ultimaCompra.producto : null,
  fecha_compra_previa: ultimaCompra ? ultimaCompra.fecha_compra : null,
  canal_venta_previo: ultimaCompra ? ultimaCompra.canal_venta : null,
  monto_previo: ultimaCompra ? ultimaCompra.monto : null,
  total_compras: compras.length
} }];`;
    console.log('2. Enriquecer Recurrencia → lee de compras_clientes');

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
