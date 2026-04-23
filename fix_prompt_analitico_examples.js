const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);
    const agent = wf.nodes.find(n => n.name === 'GPT 2b Analisis');

    agent.parameters.options.systemMessage = `Analizas conversaciones de UrbanStep (calzado argentino). Devuelves SOLO un JSON valido con 8 campos sin texto extra ni markdown. Si el cliente mencionó su email en la conversación, extraelo en email_detectado.

Campos obligatorios:
- sentimiento (positivo|neutro|negativo)
- intencion (alta|media|baja)
- etapa_funnel (awareness|consideracion|decision|post-venta)
- objecion_principal (precio|stock|talle|envio|confianza|ninguna|otra) — usa "ninguna" si el cliente no expresó ninguna objeción concreta
- resumen (max 100 chars)
- prioridad (alta|media|baja)
- accion_recomendada (max 150 chars)
- email_detectado (email si lo mencionó, sino null)

═══ EJEMPLOS ALINEADOS CON CASOS REALES ═══

Ej1 COMPRA INMEDIATA:
Conversación: "Hola, quiero las Urban Street Low en talle 38. ¿Tienen stock?"
Output: {"sentimiento":"positivo","intencion":"alta","etapa_funnel":"decision","objecion_principal":"ninguna","resumen":"Cliente quiere Urban Street Low talle 38","prioridad":"alta","accion_recomendada":"Verificar stock y contactar para cerrar venta","email_detectado":null}

Ej2 EVALUACION / NURTURING:
Conversación: "Estoy viendo modelos para uso diario. ¿Cuál recomiendan?"
Output: {"sentimiento":"neutro","intencion":"media","etapa_funnel":"consideracion","objecion_principal":"ninguna","resumen":"Cliente evaluando modelos para uso diario","prioridad":"media","accion_recomendada":"Enviar catálogo con modelos urbanos para uso diario","email_detectado":null}

Ej3 CLIENTE RECURRENTE:
Conversación: "Compré unas Running Pro hace unos meses. Quiero otro par."
Output: {"sentimiento":"positivo","intencion":"alta","etapa_funnel":"decision","objecion_principal":"ninguna","resumen":"Cliente recurrente quiere recomprar Running Pro","prioridad":"alta","accion_recomendada":"Verificar stock Running Pro y ofrecer descuento recompra","email_detectado":null}

Ej4 QUEJA:
Conversación: "La suela se despegó en menos de un mes."
Output: {"sentimiento":"negativo","intencion":"baja","etapa_funnel":"post-venta","objecion_principal":"otra","resumen":"Reclamo: suela despegada en menos de un mes","prioridad":"alta","accion_recomendada":"Escalar urgente a soporte post-venta","email_detectado":null}

Ej5 EXPLORATORIO:
Conversación: "Hola, ¿qué modelos tienen?"
Output: {"sentimiento":"neutro","intencion":"baja","etapa_funnel":"awareness","objecion_principal":"ninguna","resumen":"Cliente pregunta por modelos disponibles","prioridad":"baja","accion_recomendada":"Enviar catálogo general de modelos","email_detectado":null}`;

    console.log('Prompt GPT 2b actualizado: 5 examples alineados con PDF');

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
