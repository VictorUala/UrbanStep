const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    // 0. FIX Log Error Analisis de una vez por todas
    const logErr = wf.nodes.find(n => n.name === 'Log Error Analisis');
    logErr.type = 'n8n-nodes-base.supabase';
    logErr.typeVersion = 1;
    logErr.credentials = { supabaseApi: { id: 'QZ9MiS4xj8Cn3ndq', name: 'Supabase account' } };
    logErr.parameters = {
      operation: 'create',
      tableId: 'logs',
      dataToSend: 'defineBelow',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'rama', fieldValue: 'error-analisis' },
          { fieldId: 'estado', fieldValue: 'error' },
          { fieldId: 'detalle', fieldValue: 'GPT 2b failed' }
        ]
      }
    };
    console.log('0. Log Error Analisis FIXED definitivamente');

    // 1. Revertir Consultar Recurrencia a Supabase
    const consul = wf.nodes.find(n => n.name === 'Consultar Recurrencia');
    consul.type = 'n8n-nodes-base.supabase';
    consul.typeVersion = 1;
    consul.credentials = { supabaseApi: { id: 'QZ9MiS4xj8Cn3ndq', name: 'Supabase account' } };
    consul.alwaysOutputData = true;
    consul.parameters = {
      operation: 'getAll',
      tableId: 'clientes',
      limit: 1,
      filterType: 'string',
      filterString: "={{ 'id=eq.' + $json.cliente_id }}"
    };
    console.log('1. Consultar Recurrencia → Supabase clientes');

    // 2. Agregar/actualizar nodo Consultar Compras
    let consultarCompras = wf.nodes.find(n => n.name === 'Consultar Compras');
    if (!consultarCompras) {
      consultarCompras = {
        id: 'v2-consul-compras',
        name: 'Consultar Compras',
        type: 'n8n-nodes-base.supabase',
        typeVersion: 1,
        position: [3060, 544],
        alwaysOutputData: true,
        credentials: { supabaseApi: { id: 'QZ9MiS4xj8Cn3ndq', name: 'Supabase account' } },
        parameters: {
          operation: 'getAll',
          tableId: 'compras_clientes',
          returnAll: true,
          filterType: 'string',
          filterString: "={{ 'email=eq.' + ($json.email || '') }}"
        }
      };
      wf.nodes.push(consultarCompras);
      console.log('2. Nodo Consultar Compras creado');
    } else {
      consultarCompras.type = 'n8n-nodes-base.supabase';
      consultarCompras.typeVersion = 1;
      consultarCompras.credentials = { supabaseApi: { id: 'QZ9MiS4xj8Cn3ndq', name: 'Supabase account' } };
      consultarCompras.alwaysOutputData = true;
      consultarCompras.parameters = {
        operation: 'getAll',
        tableId: 'compras_clientes',
        returnAll: true,
        filterType: 'string',
        filterString: "={{ 'email=eq.' + ($json.email || '') }}"
      };
      console.log('2. Nodo Consultar Compras actualizado');
    }

    // 3. Enriquecer Recurrencia
    const enrich = wf.nodes.find(n => n.name === 'Enriquecer Recurrencia');
    enrich.position = [3220, 544];
    enrich.parameters.jsCode = `const cliente = $('Consultar Recurrencia').first().json;
const nombre = cliente.nombre || 'Cliente';
const email = cliente.email || $('Parsear Analisis').first().json.email_detectado || null;
const telegramId = cliente.telegram_id || null;

const comprasItems = $input.all().filter(i => i.json.email);
const esRecurrente = comprasItems.length > 0;
const ultimaCompra = esRecurrente ? comprasItems[comprasItems.length - 1].json : null;

const a = $('Guardar Analisis').first().json;

return [{ json: {
  ...a,
  nombre,
  email,
  telegram_id: telegramId,
  es_recurrente: esRecurrente,
  producto_previo: ultimaCompra ? ultimaCompra.producto : null,
  fecha_compra_previa: ultimaCompra ? ultimaCompra.fecha_compra : null,
  canal_venta_previo: ultimaCompra ? ultimaCompra.canal_venta : null,
  monto_previo: ultimaCompra ? ultimaCompra.monto : null,
  total_compras: comprasItems.length
} }];`;
    console.log('3. Enriquecer Recurrencia actualizado');

    // 4. Conexiones
    wf.connections['Consultar Recurrencia'] = {
      main: [[{ node: 'Consultar Compras', type: 'main', index: 0 }]]
    };
    wf.connections['Consultar Compras'] = {
      main: [[{ node: 'Enriquecer Recurrencia', type: 'main', index: 0 }]]
    };

    const router = wf.nodes.find(n => n.name === 'Router Decisiones');
    router.position = [3440, 544];
    console.log('4. Conexiones OK');

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
