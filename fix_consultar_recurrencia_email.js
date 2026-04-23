const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    // Reemplazar Consultar Recurrencia (Supabase) por un Code node
    // que primero busca el email del cliente, y después busca en compras_clientes
    const consul = wf.nodes.find(n => n.name === 'Consultar Recurrencia');

    // Cambiar a Code node
    consul.type = 'n8n-nodes-base.code';
    consul.typeVersion = 2;
    delete consul.credentials;
    consul.parameters = {
      jsCode: `// Obtener email del cliente: prioridad email_detectado > email en clientes
const analisis = $('Guardar Analisis').first().json;
const emailDetectado = $('Parsear Analisis').first().json.email_detectado || null;

// Buscar email del cliente en tabla clientes por cliente_id
let emailCliente = emailDetectado;
if (!emailCliente) {
  try {
    // Buscar en clientes por id
    const clienteId = analisis.cliente_id;
    const respCliente = await this.helpers.httpRequest({
      method: 'GET',
      url: $env.SUPABASE_URL + '/rest/v1/clientes?id=eq.' + clienteId + '&select=email',
      headers: {
        'apikey': $env.SUPABASE_API_KEY,
        'Authorization': 'Bearer ' + $env.SUPABASE_API_KEY
      }
    });
    if (respCliente && respCliente.length > 0 && respCliente[0].email) {
      emailCliente = respCliente[0].email;
    }
  } catch(e) {}
}

// Si tenemos email, buscar en compras_clientes
let compras = [];
if (emailCliente) {
  try {
    const respCompras = await this.helpers.httpRequest({
      method: 'GET',
      url: $env.SUPABASE_URL + '/rest/v1/compras_clientes?email=eq.' + encodeURIComponent(emailCliente) + '&select=*',
      headers: {
        'apikey': $env.SUPABASE_API_KEY,
        'Authorization': 'Bearer ' + $env.SUPABASE_API_KEY
      }
    });
    if (respCompras && respCompras.length > 0) {
      compras = respCompras;
    }
  } catch(e) {}
}

if (compras.length > 0) {
  return compras.map(c => ({ json: c }));
} else {
  return [{ json: { email: emailCliente, sin_compras: true } }];
}
`
    };
    console.log('Consultar Recurrencia → Code node con doble lookup (clientes + compras_clientes)');

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
