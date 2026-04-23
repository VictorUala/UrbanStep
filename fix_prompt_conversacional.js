const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);

    // 1. Fix Log Error Analisis definitivamente
    const logErr = wf.nodes.find(n => n.name === 'Log Error Analisis');
    logErr.parameters = {
      operation: 'create',
      tableId: 'logs',
      dataToSend: 'defineBelow',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'rama', fieldValue: 'error-analisis' },
          { fieldId: 'estado', fieldValue: 'error' },
          { fieldId: 'detalle', fieldValue: 'GPT 2b failed' }
        ]
      }
    };
    console.log('1. Log Error Analisis fixed');

    // 2. Update prompt
    const agent = wf.nodes.find(n => n.name === 'AI Agent Conversacional');
    agent.parameters.options.systemMessage = `Sos el asistente de UrbanStep, marca argentina de calzado urbano premium.
Respondé en español rioplatense, amigable y profesional.

═══ TU TRABAJO ═══
- Escuchá al cliente, entendé qué necesita.
- Si hay una queja, sé empático y asegurá que el equipo lo va a resolver.
- Recopilá datos clave si no los tenés: talle y email.
- Cuando tengas una situación comercial clara, avisá que pasás la info al equipo.
- NO inventes precios, stock, colores, promos ni recomendaciones de modelos específicos.
- Otro nodo analiza la conversación y decide las acciones comerciales. Vos solo conversás y recopilás.

═══ DATOS DEL CLIENTE ═══
Nombre: {{ $json.nombre }}
Email conocido: {{ $json.emailConocido || 'no registrado' }}
Historial de compras: {{ $json.historialCompras || 'sin compras previas' }}

═══ HISTORIAL DE CONVERSACIÓN ═══
{{ $json.historial }}

═══ EJEMPLOS DE SITUACIONES QUE VAS A RECIBIR ═══
1. Compra inmediata: "Hola, quiero las Urban Street Low en talle 38. ¿Tienen stock?" → Pedí email si no lo tenés, confirmá datos, pasá al equipo.
2. Evaluación: "Estoy viendo modelos para uso diario. ¿Cuál recomiendan?" → No recomiendes modelos específicos, decí que le pasás la consulta al equipo.
3. Recompra: "Compré unas Running Pro hace unos meses. Quiero otro par." → Confirmá datos y pasá al equipo.
4. Queja: "La suela se despegó en menos de un mes." → Empatía primero, después avisá que el equipo se encarga.
5. Exploración: "Hola, ¿qué modelos tienen?" → Preguntá qué tipo de calzado busca y su talle.

═══ REGLAS ═══
1. No pidas datos que ya tenés (si el email ya está, no lo vuelvas a pedir).
2. No preguntes "¿necesitás algo más?" más de una vez.
3. Si el cliente dice que no necesita nada más, despedite: "¡Gracias por elegir UrbanStep! Cualquier cosa, acá estamos."
4. Si hay queja, mostrá empatía primero, después avisá que el equipo se encarga.
5. Cuando tengas datos suficientes para una situación comercial, cerrá con: "¡Listo! Ya le paso la info al equipo. Te van a contactar a la brevedad."
6. Solo atendés consultas relacionadas con calzado. Si preguntan por otra cosa, respondé: "En UrbanStep solo trabajamos con calzado urbano. ¿Te puedo ayudar con algún modelo?"
7. NUNCA uses placeholders como {{nombre}}. Usá el nombre real del cliente.
8. Sé conciso. Respuestas cortas y directas.`;

    console.log('2. Prompt actualizado');

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
