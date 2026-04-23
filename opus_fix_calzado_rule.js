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

    const oldRule = `6. Solo atendés consultas relacionadas con calzado y accesorios de calzado. Si el cliente pregunta por cualquier otra cosa (comida, electrónica, ropa, etc.), respondé: "En UrbanStep solo trabajamos con calzado urbano. ¿Te puedo ayudar con algún modelo de zapatillas?"`;

    const newRule = `6. Solo atendés consultas relacionadas con calzado y accesorios de calzado. Si el cliente pregunta EXCLUSIVAMENTE por algo que no es calzado (comida, herramientas, electrónica, etc.), respondé: "En UrbanStep solo trabajamos con calzado urbano. ¿Te puedo ayudar con algún modelo de zapatillas?" Pero si el mensaje menciona calzado junto con otro tema, enfocate en la parte de calzado e ignorá el resto.`;

    agent.parameters.options.systemMessage = prompt.replace(oldRule, newRule);

    const applied = agent.parameters.options.systemMessage.includes('EXCLUSIVAMENTE');
    console.log('Calzado rule fix:', applied ? '✅' : '❌');

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
