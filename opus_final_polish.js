const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);
    const fixes = [];

    // ======= FIX 1: Disable webhook test nodes =======
    const webhook = wf.nodes.find(n => n.name === 'Webhook Test Trigger');
    const webhookSet = wf.nodes.find(n => n.name === 'Extraer Datos Webhook');
    if (webhook) { webhook.disabled = true; fixes.push('Webhook Test Trigger disabled'); }
    if (webhookSet) { webhookSet.disabled = true; fixes.push('Extraer Datos Webhook disabled'); }

    // ======= FIX 2: Replace few-shot examples with richer Grok format =======
    const gpt2b = wf.nodes.find(n => n.name === 'GPT 2b Analisis');
    gpt2b.parameters.options.systemMessage = `Analizas conversaciones de UrbanStep (calzado argentino). Devuelves SOLO un JSON valido con los campos especificados, sin texto extra ni markdown. Si el cliente mencionó su email en la conversación, extraelo en email_detectado.

Campos: sentimiento (positivo|neutro|negativo), intencion (alta|media|baja), etapa_funnel (awareness|consideracion|decision|post-venta), objecion_principal (precio|stock|talle|envio|confianza|ninguna|otra), resumen (max 100 chars), prioridad (alta|media|baja), accion_recomendada (max 150 chars), email_detectado (email del cliente si lo mencionó, sino null).

Ejemplo 1 - Queja de producto roto:
Conversación: Cliente: Me llegó el zapato roto, la suela se despegó después de 2 usos.
Output: {"sentimiento":"negativo","intencion":"baja","etapa_funnel":"post-venta","objecion_principal":"otra","resumen":"Cliente reporta producto dañado tras uso mínimo","prioridad":"alta","accion_recomendada":"Escalar a soporte urgente y ofrecer cambio o reembolso","email_detectado":null}

Ejemplo 2 - Cliente listo para comprar:
Conversación: Cliente: Tengo el talle 42 disponible? Quiero comprar el modelo negro ya.
Output: {"sentimiento":"positivo","intencion":"alta","etapa_funnel":"decision","objecion_principal":"ninguna","resumen":"Cliente confirma talle y quiere comprar inmediatamente","prioridad":"alta","accion_recomendada":"Enviar link de pago y confirmar stock","email_detectado":null}

Ejemplo 3 - Cliente exploratorio comparando precios:
Conversación: Cliente: Estos zapatos están más caros que en otras marcas, valen la pena?
Output: {"sentimiento":"neutro","intencion":"media","etapa_funnel":"consideracion","objecion_principal":"precio","resumen":"Cliente compara precios y calidad con otras marcas","prioridad":"media","accion_recomendada":"Enviar comparativa calidad-precio y promociones actuales","email_detectado":null}`;
    fixes.push('GPT 2b system prompt updated with rich few-shot examples (Grok format)');

    // ======= FIX 3: Guardar Analisis — add email_detectado field =======
    const guardarAnalisis = wf.nodes.find(n => n.name === 'Guardar Analisis');
    if (guardarAnalisis && guardarAnalisis.parameters.fieldsUi) {
      const fields = guardarAnalisis.parameters.fieldsUi.fieldValues;
      const hasEmail = fields.some(f => f.fieldId === 'email_detectado');
      if (!hasEmail) {
        fields.push({
          fieldId: 'email_detectado',
          fieldValue: '={{ $json.email_detectado || null }}'
        });
        fixes.push('Guardar Analisis now writes email_detectado to conversaciones table');
      }
    }

    console.log('Fixes applied:');
    fixes.forEach(f => console.log('  ✅ ' + f));

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
