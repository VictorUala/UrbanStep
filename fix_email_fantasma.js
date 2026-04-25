const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDNkOTAyNi1lMmIyLTRhNmMtYjUwOC1lZDUyZTJkNjJlNDkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODdhNTBkNDgtYjRjMi00ZTc0LTgzYWItZDUwZDI4OTg1NTU0IiwiaWF0IjoxNzc0OTA1OTg1fQ.jjNcyhuMQX_PslUKL2AjGMPtYAyXbBIik8RtBQS5U5w';
const url = 'https://primary-production-3de5.up.railway.app/api/v1/workflows/SDvniUq2L5axPWWu';

let data = '';
https.get(url, {headers: {'X-N8N-API-KEY': key}}, res => {
  res.on('data', d => data += d);
  res.on('end', () => {
    const wf = JSON.parse(data);
    const fixes = [];

    // ======= PARTE A: Detección de email real en mensajes del cliente =======

    // Nodo 4: Detectar Email Real (CORREGIDO: busca en mensajes del CLIENTE, no en respuesta del bot)
    const detectar = {
      parameters: {
        jsCode: `// Buscar email en los mensajes de ENTRADA del cliente (no en la respuesta del bot)
const items = $('Obtener Historial R1').all();
const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/;
let emailReal = null;

// Buscar en mensajes del cliente (dirección entrada), empezando por el más reciente
const mensajesCliente = items
  .filter(i => i.json.direccion === 'entrada' && i.json.contenido)
  .sort((a, b) => new Date(b.json.timestamp) - new Date(a.json.timestamp));

for (const msg of mensajesCliente) {
  const match = msg.json.contenido.match(regex);
  if (match) {
    emailReal = match[0];
    break;
  }
}

// Pasar datos del Separar Respuesta + email detectado
const sep = $('Separar Respuesta').first().json;
return [{ json: { ...sep, emailReal } }];`
      },
      id: 'v2-detect-email-real',
      name: 'Detectar Email Real',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [2880, -400]
    };

    // Nodo 5: IF Email Real Detectado
    const ifEmailDetectado = {
      parameters: {
        conditions: {
          options: { caseSensitive: true, typeValidation: 'strict' },
          conditions: [{
            id: 'email-real-detectado',
            leftValue: '={{ $json.emailReal }}',
            rightValue: '',
            operator: { type: 'string', operation: 'notEmpty', singleValue: true }
          }],
          combinator: 'and'
        }
      },
      id: 'v2-if-email-real-detectado',
      name: 'IF Email Real Detectado',
      type: 'n8n-nodes-base.if',
      typeVersion: 2,
      position: [3080, -400]
    };

    // Nodo 6: Supabase Update Email Real
    const supaUpdateEmail = {
      parameters: {
        operation: 'update',
        tableId: 'clientes',
        matchingColumns: ['telegram_id'],
        fieldsUi: {
          fieldValues: [
            { fieldId: 'telegram_id', fieldValue: '={{ $json.chat_id }}' },
            { fieldId: 'email', fieldValue: '={{ $json.emailReal }}' }
          ]
        }
      },
      id: 'v2-supa-update-email-real',
      name: 'Actualizar Email en Supabase',
      type: 'n8n-nodes-base.supabase',
      typeVersion: 1,
      position: [3280, -480],
      credentials: { supabaseApi: { id: 'QZ9MiS4xj8Cn3ndq', name: 'Supabase account' } },
      onError: 'continueRegularOutput'
    };

    // Nodo 7: HubSpot Sync Email Real
    const hsSyncEmail = {
      parameters: {
        authentication: 'appToken',
        resource: 'contact',
        operation: 'upsert',
        email: '={{ $json.emailReal }}',
        additionalFields: {
          firstname: '={{ $json.nombre || "" }}'
        }
      },
      id: 'v2-hs-sync-email-real',
      name: 'HubSpot Sync Email Real',
      type: 'n8n-nodes-base.hubspot',
      typeVersion: 2.2,
      position: [3480, -480],
      credentials: { hubspotAppToken: { id: 'eehCZEc7e67tc2w5', name: 'HubSpot App Token account' } },
      onError: 'continueRegularOutput'
    };

    // ======= PARTE B: Email fantasma en Enriquecer Recurrencia =======

    // Modificar Enriquecer Recurrencia: si email es null, crear fantasma
    const enrich = wf.nodes.find(n => n.name === 'Enriquecer Recurrencia');
    const oldReturn = "email,";
    const newReturn = "email: email || ('telegram-' + telegramId + '@urbanstep.internal'),";
    enrich.parameters.jsCode = enrich.parameters.jsCode.replace(oldReturn, newReturn);
    fixes.push('Enriquecer Recurrencia: email fantasma si null');

    // ======= PARTE C: IF antes de Gmail =======

    // Nodo 1: IF Control Email (antes de Gmail)
    const ifEmailReal = {
      parameters: {
        conditions: {
          options: { caseSensitive: true, typeValidation: 'strict' },
          conditions: [{
            id: 'email-no-fantasma',
            leftValue: '={{ $json.email }}',
            rightValue: '@urbanstep.internal',
            operator: { type: 'string', operation: 'notContains' }
          }],
          combinator: 'and'
        }
      },
      id: 'v2-if-email-control',
      name: 'IF Email Real para Gmail',
      type: 'n8n-nodes-base.if',
      typeVersion: 2,
      position: [3960, 176]
    };

    // Nodo extra: Telegram Confirmacion (alternativa a Gmail cuando es fantasma)
    const tgConfirmacion = {
      parameters: {
        operation: 'sendMessage',
        chatId: '={{ $json.telegram_id }}',
        text: '={{ "¡Hola " + $json.nombre + "! Tu consulta fue registrada. El equipo de UrbanStep te va a contactar por este mismo chat. ¡Gracias por elegirnos!" }}',
        additionalFields: {}
      },
      id: 'v2-tg-confirmacion-fantasma',
      name: 'Telegram Confirmacion (sin email)',
      type: 'n8n-nodes-base.telegram',
      typeVersion: 1.2,
      position: [4160, 300],
      credentials: { telegramApi: { id: 'gKN6makwSHpPl3Ln', name: 'Telegram account 2' } },
      onError: 'continueRegularOutput'
    };

    // ======= AGREGAR NODOS =======
    wf.nodes.push(detectar, ifEmailDetectado, supaUpdateEmail, hsSyncEmail, ifEmailReal, tgConfirmacion);
    fixes.push('6 nodos nuevos agregados');

    // ======= RECONECTAR =======

    // Parte A: Separar Respuesta → Detectar Email Real → IF Email Real Detectado
    // Agregar a salidas de Separar Respuesta
    const sepConns = wf.connections['Separar Respuesta'].main[0];
    sepConns.push({ node: 'Detectar Email Real', type: 'main', index: 0 });

    wf.connections['Detectar Email Real'] = {
      main: [[{ node: 'IF Email Real Detectado', type: 'main', index: 0 }]]
    };
    wf.connections['IF Email Real Detectado'] = {
      main: [
        [{ node: 'Actualizar Email en Supabase', type: 'main', index: 0 }], // TRUE
        [] // FALSE → nada
      ]
    };
    wf.connections['Actualizar Email en Supabase'] = {
      main: [[{ node: 'HubSpot Sync Email Real', type: 'main', index: 0 }]]
    };
    fixes.push('Conexiones Parte A: detección email real');

    // Parte C: Crear Deal HubSpot → IF Email Real para Gmail → Gmail / Telegram
    // Desconectar Crear Deal → Gmail Confirmacion Compra
    wf.connections['Crear Deal HubSpot'] = {
      main: [[{ node: 'IF Email Real para Gmail', type: 'main', index: 0 }]]
    };
    wf.connections['IF Email Real para Gmail'] = {
      main: [
        [{ node: 'Gmail Confirmacion Compra', type: 'main', index: 0 }], // TRUE: email real → Gmail
        [{ node: 'Telegram Confirmacion (sin email)', type: 'main', index: 0 }] // FALSE: fantasma → Telegram
      ]
    };
    // Telegram Confirmacion → Slack Alerta Ventas (mismo destino que Gmail)
    wf.connections['Telegram Confirmacion (sin email)'] = {
      main: [[{ node: 'Slack Alerta Ventas', type: 'main', index: 0 }]]
    };
    fixes.push('Conexiones Parte C: IF antes de Gmail + Telegram alternativo');

    console.log('Fixes aplicados:');
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
