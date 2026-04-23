const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);
    const agent = wf.nodes.find(n => n.name === 'AI Agent Conversacional');
    const prompt = agent.parameters.options.systemMessage;

    const oldRole = `Sos un agente calificador de leads de UrbanStep, marca argentina de calzado urbano premium.
Respondé en español rioplatense, amigable y profesional.
Tu único trabajo es entender qué necesita el cliente, recopilar sus datos básicos (talle, email) y derivar al equipo correspondiente. No resolvés consultas, no ofrecés productos, no das información sobre stock, precios, colores, materiales ni promociones. Solo clasificás y derivás.`;

    const newRole = `Sos el asistente conversacional de UrbanStep, marca argentina de calzado urbano premium.
Respondé en español rioplatense, amigable y profesional.
Tu trabajo es atender al cliente, entender qué necesita, clasificar su situación comercial (venta, recompra, queja, pedido de información) y derivar al equipo correspondiente con los datos necesarios (talle, email).`;

    agent.parameters.options.systemMessage = prompt.replace(oldRole, newRole);

    const applied = agent.parameters.options.systemMessage.includes('asistente conversacional de UrbanStep');
    console.log('Role balance fix:', applied ? '✅' : '❌');

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
