const { Client, Databases, ID } = require('node-appwrite');
const fetch = require('node-fetch');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const MESSAGE_LOGS_COLLECTION_ID = 'message_logs'; 

module.exports = async ({ req, res, log, error }) => {
  if (req.method !== 'POST') {
    return res.json({ success: false, error: 'Only POST requests are allowed.' }, 405);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'http://appwrite/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const databases = new Databases(client);

  // ***** CORRECCIÓN 1: OBTENER DATABASE_ID DE LAS VARIABLES DE ENTORNO *****
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

  if (!DATABASE_ID) {
      error('Variable de entorno APPWRITE_DATABASE_ID no configurada.');
      // Devolvemos un error aquí para que la función se detenga si la configuración es incorrecta.
      return res.json({ success: false, error: 'Server configuration is incomplete.' }, 500);
  }

  const { clients, template, config, campaignId } = JSON.parse(req.body);

  if (!clients || !Array.isArray(clients) || !template || !config || !campaignId) {
    error('Payload inválido. Faltan clientes, plantilla, config o campaignId.');
    return res.json({ success: false, error: 'Invalid payload.' }, 400);
  }
  
  const {
    minDelayMs = 2000, maxDelayMs = 5000,
    batchSizeMin = 15, batchSizeMax = 25,
    batchDelayMsMin = 60000, batchDelayMsMax = 120000,
    adminPhoneNumber, notificationInterval = 50
  } = config;

  // Devolvemos la respuesta al frontend para que no espere.
  res.json({ success: true, message: 'Campaign process started in the background.' });

  log(`Campaña ${campaignId} iniciada para ${clients.length} clientes.`);
  
  const WAHA_API_URL = process.env.WAHA_API_URL;
  const WAHA_API_KEY = process.env.WAHA_API_KEY;

  if (!WAHA_API_URL || !WAHA_API_KEY) {
    error('Variables de entorno de Waha no configuradas.');
    return;
  }

  const logStatus = async (clientId, status, errorMsg = '') => {
    try {
      await databases.createDocument(
        DATABASE_ID, // ***** CORRECCIÓN 2: Usar la variable DATABASE_ID
        MESSAGE_LOGS_COLLECTION_ID,
        ID.unique(),
        {
          campaignId: campaignId, // Asegúrate que este atributo se llama 'campaignId' en tu colección
          clientId,
          status,
          timestamp: new Date().toISOString(),
          error: errorMsg,
        }
      );
    } catch (dbError) {
      error(`Fallo al guardar log para cliente ${clientId}: ${dbError.message}`);
    }
  };

  const sendAdminNotification = async (text) => {
    if (!adminPhoneNumber) return;
    let formattedAdminPhoneNumber = adminPhoneNumber;
    if (!formattedAdminPhoneNumber.startsWith('34') && !formattedAdminPhoneNumber.startsWith('+34')) {
      formattedAdminPhoneNumber = `34${formattedAdminPhoneNumber}`; // Prepend 34 if missing, without '+'
    }
    formattedAdminPhoneNumber = formattedAdminPhoneNumber.includes('@c.us') ? formattedAdminPhoneNumber : `${formattedAdminPhoneNumber}@c.us`;
    try {
        await fetch(`${WAHA_API_URL}/api/sendText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
            body: JSON.stringify({ chatId: formattedAdminPhoneNumber, text: text, session: "default" }),
        });
    } catch (e) {
        error(`Fallo al enviar notificación al admin: ${e.message}`);
    }
  };

  await sendAdminNotification(`🚀 *Inicio de Campaña*\n\n- ID: ${campaignId}\n- Audiencia: ${clients.length} clientes.`);

  let totalSent = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  
  for (const [index, client] of clients.entries()) {
    if (client.enviar !== 1 || !client.tel2cli || !/^[67]\d{8}$/.test(client.tel2cli)) {
      totalSkipped++;
      await logStatus(client.codcli, 'skipped', 'Opt-out o teléfono inválido');
      continue;
    }

    const phoneNumber = client.tel2cli;
    let formattedPhoneNumber = phoneNumber;
    if (!formattedPhoneNumber.startsWith('34') && !formattedPhoneNumber.startsWith('+34')) {
      formattedPhoneNumber = `34${formattedPhoneNumber}`; // Prepend 34 if missing, without '+'
    }
    formattedPhoneNumber = formattedPhoneNumber.includes('@c.us') ? formattedPhoneNumber : `${formattedPhoneNumber}@c.us`;
    
    let messageContent = template.message;
    if (client.nomcli) {
      messageContent = messageContent.replace(/\[nombre\]/g, client.nomcli);
    }
    
    log(`Attempting to send message to ${formattedPhoneNumber} with content: ${messageContent}`);

    try {
      const response = await fetch(`${WAHA_API_URL}/api/sendText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
        body: JSON.stringify({ chatId: formattedPhoneNumber, text: messageContent, session: "default" }),
      });

      if (response.ok) {
        totalSent++;
        await logStatus(client.codcli, 'sent');
        log(`Mensaje enviado a ${phoneNumber} para cliente ${client.codcli}.`);
      } else {
        const errorData = await response.json();
        totalFailed++;
        await logStatus(client.codcli, 'failed', `WAHA API error: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`);
        error(`Fallo al enviar mensaje a ${phoneNumber} para cliente ${client.codcli}: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`);
      }
    } catch (e) {
      totalFailed++;
      await logStatus(client.codcli, 'failed', `Network error: ${e.message}`);
      error(`Fallo de red al enviar mensaje a ${phoneNumber} para cliente ${client.codcli}: ${e.message}`);
    }

    // Implement delays to avoid rate limiting
    const delay = getRandomNumber(minDelayMs, maxDelayMs);
    await sleep(delay);

    // Implement batch delays
    if ((index + 1) % getRandomNumber(batchSizeMin, batchSizeMax) === 0) {
      const batchDelay = getRandomNumber(batchDelayMsMin, batchDelayMsMax);
      log(`Pausa de lote de ${batchDelay / 1000} segundos después de ${index + 1} mensajes.`);
      await sleep(batchDelay);
    }

    // Send admin notification periodically
    if ((index + 1) % notificationInterval === 0) {
      await sendAdminNotification(`📊 *Progreso de Campaña*\n\n- ID: ${campaignId}\n- Procesados: ${index + 1}/${clients.length}\n- Enviados: ${totalSent}\n- Fallidos: ${totalFailed}\n- Saltados: ${totalSkipped}`);
    }
  }
  
  log(`Campaña ${campaignId} finalizada.`);
  await sendAdminNotification(`✅ *Campaña Finalizada*\n\n- ID: ${campaignId}\n- Total: ${clients.length}\n- Enviados: ${totalSent}\n- Fallidos: ${totalFailed}\n- Saltados: ${totalSkipped}`);

  return res.empty();
};
