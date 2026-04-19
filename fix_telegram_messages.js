const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    // Fix Telegram Fidelizacion — no re-greet, continue conversation naturally
    const fidelizacion = wf.nodes.find(n => n.name === 'Telegram Fidelizacion');
    fidelizacion.parameters.text = `={{ "Por cierto, " + $('Enriquecer Recurrencia').first().json.nombre + ", como ya compraste con nosotros antes, sos parte de nuestra familia UrbanStep. Tenemos novedades de la nueva colección que creo que te van a interesar. ¿Querés que te comparta el catálogo actualizado?" }}`;

    // Fix Telegram Promo — no re-greet, flow as continuation
    const promo = wf.nodes.find(n => n.name === 'Telegram Promo');
    promo.parameters.text = `={{ "Aprovechando que estás viendo opciones, esta semana tenemos 15% OFF en modelos seleccionados. ¿Querés que te cuente qué talles y modelos tenemos disponibles, " + $('Enriquecer Recurrencia').first().json.nombre + "?" }}`;

    console.log('Fidelizacion text:', fidelizacion.parameters.text.slice(0, 80) + '...');
    console.log('Promo text:', promo.parameters.text.slice(0, 80) + '...');

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
