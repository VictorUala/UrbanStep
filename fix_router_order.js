const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    // Fix Router: swap rules so Recurrente (index 2) comes before Compra (index 1)
    const router = wf.nodes.find(n => n.name === 'Router Decisiones');
    const rules = router.parameters.rules.values;

    // Current: [Queja(0), Compra(1), Recurrente(2), Post-venta(3), Nurturing(4), Exploratorio(5)]
    // Target:  [Queja(0), Recurrente(1), Compra(2), Post-venta(3), Nurturing(4), Exploratorio(5)]
    const queja = rules[0];
    const compra = rules[1];
    const recurrente = rules[2];
    const rest = rules.slice(3);
    router.parameters.rules.values = [queja, recurrente, compra, ...rest];

    console.log('New rule order:');
    router.parameters.rules.values.forEach((r, i) => console.log(`  [${i}] ${r.outputKey}`));

    // Fix connections: Router outputs are index-based, swap indices 1 and 2
    // Current: output[1] → Upsert Contacto HubSpot, output[2] → Telegram Fidelizacion
    // Target:  output[1] → Telegram Fidelizacion,   output[2] → Upsert Contacto HubSpot
    const routerConns = wf.connections['Router Decisiones'].main;
    const oldComp = routerConns[1]; // Compra connections
    const oldRec  = routerConns[2]; // Recurrente connections
    routerConns[1] = oldRec;
    routerConns[2] = oldComp;

    console.log('New connection order:');
    routerConns.forEach((c, i) => {
      const name = c && c[0] ? c[0].node : '(empty)';
      console.log(`  output[${i}] → ${name}`);
    });

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
        console.log(r.id ? 'GUARDADO OK - ' + r.updatedAt : 'ERROR: ' + JSON.stringify(r).slice(0, 200));
      });
    });
    req.write(payload);
    req.end();
  });
});
