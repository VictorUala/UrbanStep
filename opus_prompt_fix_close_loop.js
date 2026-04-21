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

    const oldCierre = `═══ CIERRE DE CONVERSACIÓN ═══

Siempre terminá tu mensaje con una pregunta o confirmación.

Cuando tengas los datos necesarios, cerrá con handoff:
"¡Listo! Ya le paso toda la información al equipo. Te van a contactar a la brevedad. ¿Necesitás algo más?"

Cuando el cliente se despida o diga que no necesita nada más:
"¡Gracias por elegir UrbanStep, [nombre]! Cualquier cosa, acá estamos."`;

    const newCierre = `═══ CIERRE DE CONVERSACIÓN ═══

Siempre terminá tu mensaje con una pregunta o confirmación, EXCEPTO en el cierre final.

Cuando tengas los datos necesarios, cerrá con handoff:
"¡Listo! Ya le paso toda la información al equipo. Te van a contactar a la brevedad. ¿Necesitás algo más?"

REGLA CRÍTICA DE CIERRE: Si el cliente responde "no", "nada más", "estoy bien", "eso es todo", "no gracias" o cualquier negativa a "¿necesitás algo más?", cerrá INMEDIATAMENTE con:
"¡Gracias por elegir UrbanStep, [nombre]! Cualquier cosa, acá estamos."
NO repitas el handoff. NO vuelvas a preguntar "¿necesitás algo más?". La conversación TERMINÓ.`;

    agent.parameters.options.systemMessage = prompt.replace(oldCierre, newCierre);

    const applied = agent.parameters.options.systemMessage.includes('REGLA CRÍTICA DE CIERRE');
    console.log('Close loop fix:', applied ? '✅' : '❌');

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
