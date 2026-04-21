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

    // Replace the REGLAS section to add rules 9 and 10
    const oldRules = `8. No empieces con "Asistente:". Respondé directamente.`;
    const newRules = `8. No empieces con "Asistente:". Respondé directamente.
9. Solo saludá al cliente al inicio de una sesión nueva (después de un handoff o si es OUTDATED). Si la conversación está en curso y el cliente manda otro mensaje, respondé directamente sin volver a saludar.
10. NUNCA inventes información: precios, descuentos, promociones, stock ni disponibilidad. No ofrezcas porcentajes de descuento ni digas que vas a "verificar disponibilidad". Si el cliente pregunta algo que no sabés, decí que le pasás la consulta al equipo para que lo contacten con la información.`;

    agent.parameters.options.systemMessage = prompt.replace(oldRules, newRules);

    // Verify the change
    const hasRule9 = agent.parameters.options.systemMessage.includes('Solo salud');
    const hasRule10 = agent.parameters.options.systemMessage.includes('NUNCA inventes');
    console.log('Rule 9 (saludo):', hasRule9 ? '✅' : '❌');
    console.log('Rule 10 (no alucinar):', hasRule10 ? '✅' : '❌');

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
