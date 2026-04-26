const https = require('https');

const HOST = 'primary-production-3de5.up.railway.app';
const WEBHOOK_PATH = '/webhook/urbanstep-nps-test';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';

const casos = [
  { nombre: 'Lucía Pérez', email: 'lucia.perez@gmail.com', nps: '10', comentario: 'Las zapatillas son comodísimas. Ya estoy viendo otro modelo.', mejorar: 'Todo perfecto' },
  { nombre: 'José López', email: 'jose.lopez@hotmail.com', nps: '9', comentario: 'Excelente calidad y entrega rápida.', mejorar: 'Nada' },
  { nombre: 'Martina Gómez', email: 'martina.gomez@gmail.com', nps: '8', comentario: 'Muy lindas, aunque el talle vino justo.', mejorar: 'Guía de talles' },
  { nombre: 'Carlos Fernández', email: 'carlos.fernandez@outlook.com', nps: '7', comentario: 'Buen producto, pero tardó el envío.', mejorar: 'Tiempos de envío' },
  { nombre: 'Valentina Rojas', email: 'valentina.rojas@gmail.com', nps: '6', comentario: 'Tuve que cambiar el talle. Proceso lento.', mejorar: 'Agilizar cambios' },
  { nombre: 'Juan Cruz', email: 'juan.cruz@hotmail.com', nps: '5', comentario: 'No eran tan cómodas como esperaba.', mejorar: 'Mejorar calidad' },
  { nombre: 'Sofía Martínez', email: 'sofia.martinez@gmail.com', nps: '4', comentario: 'No me respondieron por Instagram.', mejorar: 'Atención al cliente' },
  { nombre: 'Facundo Silva', email: 'facundo.silva@outlook.com', nps: '3', comentario: 'La suela se despegó en menos de un mes.', mejorar: 'Control de calidad' },
];

function enviarCaso(caso, index) {
  return new Promise((resolve) => {
    const body = JSON.stringify(caso);
    const opts = {
      hostname: HOST, path: WEBHOOK_PATH, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const ok = res.statusCode < 400;
        console.log(`[${index + 1}/8] ${caso.nombre} (NPS ${caso.nps}) → ${ok ? '✅ enviado' : '❌ ' + res.statusCode + ' ' + data.slice(0, 100)}`);
        resolve(ok);
      });
    });
    req.on('error', e => { console.log(`[${index + 1}/8] ❌ ${e.message}`); resolve(false); });
    req.write(body);
    req.end();
  });
}

function getJSON(path) {
  return new Promise((resolve) => {
    let d = '';
    https.get(`https://${HOST}${path}`, { headers: { 'X-N8N-API-KEY': API_KEY } },
      (res) => { res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
  });
}

async function main() {
  console.log('=== Test NPS: 8 casos automáticos ===\n');

  for (let i = 0; i < casos.length; i++) {
    await enviarCaso(casos[i], i);
    if (i < casos.length - 1) {
      process.stdout.write('  ⏳ 10s...');
      await new Promise(r => setTimeout(r, 15000));
      process.stdout.write(' ok\n');
    }
  }

  console.log('\n⏳ Esperando 15s para que el último termine...');
  await new Promise(r => setTimeout(r, 15000));

  console.log('\n📊 RESULTADOS:\n');
  console.log('Caso | Nombre              | NPS | Funnel | Sentimiento | Prioridad | Router | Tokens');
  console.log('-----|---------------------|-----|--------|-------------|-----------|--------|-------');

  const list = await getJSON(`/api/v1/executions?workflowId=SDvniUq2L5axPWWu&limit=8`);
  const execIds = list.data.map(e => e.id).reverse();

  let ok = 0, fail = 0;
  for (let i = 0; i < execIds.length && i < 8; i++) {
    const exec = await getJSON(`/api/v1/executions/${execIds[i]}?includeData=true`);
    const rd = exec.data?.resultData?.runData;
    if (!rd) { console.log(`  ${i + 1}  | Sin datos`); fail++; continue; }

    const pa = rd['Parsear Analisis'];
    if (!pa) { console.log(`  ${i + 1}  | ${(casos[i]?.nombre || '?').padEnd(19)} | ${casos[i]?.nps || '?'}  | ❌ GPT 2b falló`); fail++; continue; }

    const j = pa[0].data.main[0][0].json;
    const router = rd['Router Decisiones'];
    let rOut = '?';
    if (router) {
      router[0].data.main.forEach((arr, k) => { if (arr && arr.length > 0) rOut = k; });
    }

    const nps = parseInt(casos[i]?.nps || 0);
    const expSent = nps >= 9 ? 'positivo' : nps >= 7 ? 'neutro' : 'negativo';
    const expPrio = nps >= 7 ? 'baja' : nps >= 5 ? 'media' : 'alta'; // 0-4=alta(reclamo), 5-6=media, 7-10=baja

    const s = j.sentimiento === expSent ? '✅' : '❌';
    const p = j.prioridad === expPrio ? '✅' : '❌';
    const f = j.etapa_funnel === 'nps' ? '✅' : '❌';
    const r = rOut === 0 ? '✅' : '❌';

    if (s === '✅' && p === '✅' && f === '✅' && r === '✅') ok++; else fail++;

    console.log(`  ${i + 1}  | ${(casos[i]?.nombre || '?').padEnd(19)} |  ${casos[i]?.nps}  | ${j.etapa_funnel.padEnd(5)}${f} | ${j.sentimiento.padEnd(10)}${s} | ${j.prioridad.padEnd(8)}${p} | [${rOut}]${r}  | ${j.tokens_total}`);
  }

  console.log(`\n✅ ${ok}/8 correctos, ❌ ${fail}/8 con errores`);
}

main().catch(console.error);
