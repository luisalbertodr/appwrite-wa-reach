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

  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

  if (!DATABASE_ID) {
      error('Variable de entorno APPWRITE_DATABASE_ID no configurada.');
      return res.json({ success: false, error: 'Server configuration is incomplete.' }, 500);
  }

  const { clients, template, config, campaignId, selectedMessageIndex, selectedImageIndex } = JSON.parse(req.body);

  if (!clients || !Array.isArray(clients) || !template || !config || !campaignId) {
    error('Payload inválido.');
    return res.json({ success: false, error: 'Invalid payload.' }, 400);
  }
  
  const {
    minDelayMs = 2000, maxDelayMs = 5000,
    batchSizeMin = 15, batchSizeMax = 25,
    batchDelayMsMin = 60000, batchDelayMsMax = 120000,
    adminPhoneNumbers,
    notificationInterval = 50
  } = config;

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
            DATABASE_ID,
            MESSAGE_LOGS_COLLECTION_ID,
            ID.unique(),
            {
                campaignId: campaignId,
                clientId: clientId,
                status: status,
                timestamp: new Date().toISOString(),
                error: errorMsg,
            }
        );
      } catch (e) {
        error(`Failed to log status for client ${clientId}: ${e.message}`);
      }
  };

  const sendAdminNotification = async (text) => {
    if (!adminPhoneNumbers || !Array.isArray(adminPhoneNumbers) || adminPhoneNumbers.length === 0) {
      return;
    }

    for (const adminPhoneNumber of adminPhoneNumbers) {
      if (!adminPhoneNumber) continue;

      let formattedAdminPhoneNumber = adminPhoneNumber.trim();
      if (!formattedAdminPhoneNumber.startsWith('34') && !formattedAdminPhoneNumber.startsWith('+34')) {
        formattedAdminPhoneNumber = `34${formattedAdminPhoneNumber}`;
      }
      formattedAdminPhoneNumber = formattedAdminPhoneNumber.includes('@c.us') ? formattedAdminPhoneNumber : `${formattedAdminPhoneNumber}@c.us`;
      
      try {
          await fetch(`${WAHA_API_URL}/api/sendText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
              body: JSON.stringify({ chatId: formattedAdminPhoneNumber, text: text, session: "default" }),
          });
          log(`Notificación de admin enviada a ${adminPhoneNumber}`);
      } catch (e) {
          error(`Fallo al enviar notificación de admin a ${adminPhoneNumber}: ${e.message}`);
      }
    }
  };

  await sendAdminNotification(`🚀 *Inicio de Campaña*\n\n- ID: ${campaignId}\n- Audiencia: ${clients.length} clientes.`);

  let totalSent = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  
  const messageToSend = selectedMessageIndex !== null && template.messages[selectedMessageIndex] 
    ? template.messages[selectedMessageIndex] 
    : template.messages[0] || '';
    
  const imageUrlToSend = selectedImageIndex !== null && template.imageUrls[selectedImageIndex]
    ? template.imageUrls[selectedImageIndex]
    : undefined;

  for (const [index, c] of clients.entries()) {
    if (c.enviar !== 1 || !c.tel2cli || !/^[67]\d{8}$/.test(c.tel2cli)) {
      totalSkipped++;
      await logStatus(c.codcli, 'skipped', 'Opt-out o teléfono inválido');
      continue;
    }

    const phoneNumber = c.tel2cli;
    let formattedPhoneNumber = phoneNumber;
    if (!formattedPhoneNumber.startsWith('34') && !formattedPhoneNumber.startsWith('+34')) {
      formattedPhoneNumber = `34${formattedPhoneNumber}`;
    }
    formattedPhoneNumber = formattedPhoneNumber.includes('@c.us') ? formattedPhoneNumber : `${formattedPhoneNumber}@c.us`;
    
    let messageContent = messageToSend.replace(/\[nombre\]/g, c.nomcli || '');
    
    log(`Attempting to send message to ${formattedPhoneNumber}`);

    try {
      let response;
      if (imageUrlToSend) {
        // Enviar imagen con texto
        response = await fetch(`${WAHA_API_URL}/api/sendImage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
            body: JSON.stringify({ 
                chatId: formattedPhoneNumber, 
                image: imageUrlToSend,
                caption: messageContent,
                session: "default" 
            }),
        });
      } else {
        // Enviar solo texto
        response = await fetch(`${WAHA_API_URL}/api/sendText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
          body: JSON.stringify({ chatId: formattedPhoneNumber, text: messageContent, session: "default" }),
        });
      }

      if (response.ok) {
        totalSent++;
        await logStatus(c.codcli, 'sent');
      } else {
        const errorData = await response.json();
        totalFailed++;
        await logStatus(c.codcli, 'failed', `WAHA API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
    } catch (e) {
      totalFailed++;
      await logStatus(c.codcli, 'failed', `Network error: ${e.message}`);
    }

    if ((index + 1) % notificationInterval === 0) {
      await sendAdminNotification(`📊 *Progreso de Campaña*\n\n- ID: ${campaignId}\n- Procesados: ${index + 1}/${clients.length}\n- Enviados: ${totalSent}\n- Fallidos: ${totalFailed}\n- Saltados: ${totalSkipped}`);
    }

    const delay = getRandomNumber(minDelayMs, maxDelayMs);
    await sleep(delay);

    if ((index + 1) % getRandomNumber(batchSizeMin, batchSizeMax) === 0) {
      const batchDelay = getRandomNumber(batchDelayMsMin, batchDelayMsMax);
      log(`Pausa de lote de ${batchDelay / 1000}s`);
      await sleep(batchDelay);
    }
  }
  
  log(`Campaña ${campaignId} finalizada.`);
  await sendAdminNotification(`✅ *Campaña Finalizada*\n\n- ID: ${campaignId}\n- Total: ${clients.length}\n- Enviados: ${totalSent}\n- Fallidos: ${totalFailed}\n- Saltados: ${totalSkipped}`);

  return res.empty();
};