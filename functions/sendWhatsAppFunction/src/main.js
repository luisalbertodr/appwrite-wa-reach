const { Client, Databases, ID } = require('node-appwrite');
const fetch = require('node-fetch');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// IMPORTANTE: Reemplaza esto con el ID de tu nueva colección
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

  const { clients, template, config, campaignId } = JSON.parse(req.body);

  if (!clients || !Array.isArray(clients) || clients.length === 0) {
    return res.json({ success: false, error: 'Client list is required.' }, 400);
  }
  if (!template || !template.message) {
    return res.json({ success: false, error: 'Template object is required.' }, 400);
  }
  if (!config) {
    return res.json({ success: false, error: 'Config object is required.' }, 400);
  }
  if (!campaignId) {
    return res.json({ success: false, error: 'Campaign ID is required.' }, 400);
  }

  const {
    minDelayMs = 2000, maxDelayMs = 5000,
    batchSizeMin = 15, batchSizeMax = 25,
    batchDelayMsMin = 60000, batchDelayMsMax = 120000,
    adminPhoneNumber, notificationInterval = 50
  } = config;

  res.json({ success: true, message: 'Campaign process started in the background.' });

  log(`Campaña ${campaignId} iniciada para ${clients.length} clientes.`);
  
  const WAHA_API_URL = process.env.WAHA_API_URL;
  const WAHA_API_KEY = process.env.WAHA_API_KEY;

  if (!WAHA_API_URL || !WAHA_API_KEY) {
    error('Variables de entorno de Waha no configuradas.');
    return;
  }

  let messagesSentInBatch = 0;
  let totalSent = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let currentBatchTrigger = getRandomNumber(batchSizeMin, batchSizeMax);

  const logStatus = async (clientId, status, errorMsg = '') => {
    try {
      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        MESSAGE_LOGS_COLLECTION_ID,
        ID.unique(),
        {
          campaignId,
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
    try {
      await fetch(`${WAHA_API_URL}/api/sendText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${WAHA_API_KEY}` },
        body: JSON.stringify({ to: adminPhoneNumber, body: text }),
      });
    } catch (e) {
      error(`Fallo al enviar notificación al admin: ${e.message}`);
    }
  };

  await sendAdminNotification(`🚀 *Inicio de Campaña*\n\n- ID: ${campaignId}\n- Audiencia: ${clients.length} clientes.`);

  for (const [index, client] of clients.entries()) {
    if (client.enviar !== 1 || !client.tel2cli || !/^[67]\d{8}$/.test(client.tel2cli)) {
      log(`Saltando cliente ${client.codcli}: opt-out o teléfono inválido.`);
      totalSkipped++;
      await logStatus(client.codcli, 'skipped', 'Opt-out o teléfono inválido');
      continue;
    }

    const message = template.message
      .replace(/\[nombre\]/g, client.nomcli || '')
      .replace(/\[apellido\]/g, client.ape1cli || '');

    try {
      const response = await fetch(`${WAHA_API_URL}/api/sendText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${WAHA_API_KEY}` },
        body: JSON.stringify({ to: client.tel2cli, body: message }),
      });

      if (response.ok) {
        log(`Mensaje enviado a ${client.codcli}.`);
        totalSent++;
        messagesSentInBatch++;
        await logStatus(client.codcli, 'sent');
      } else {
        const errorData = await response.json();
        const errorMessage = JSON.stringify(errorData);
        error(`Fallo al enviar a ${client.codcli}: ${response.status} - ${errorMessage}`);
        totalFailed++;
        await logStatus(client.codcli, 'failed', errorMessage);
      }
    } catch (e) {
      error(`Excepción al enviar a ${client.codcli}: ${e.message}`);
      totalFailed++;
      await logStatus(client.codcli, 'failed', e.message);
    }

    const processedCount = index + 1;
    if (adminPhoneNumber && processedCount % notificationInterval === 0 && processedCount < clients.length) {
      await sendAdminNotification(`⏳ *Progreso de Campaña*\n\n- ID: ${campaignId}\n- Procesados: ${processedCount}/${clients.length}`);
    }

    if (messagesSentInBatch >= currentBatchTrigger && processedCount < clients.length) {
      const batchDelay = getRandomNumber(batchDelayMsMin, batchDelayMsMax);
      log(`Lote completado. Pausando por ${batchDelay / 1000}s...`);
      await sendAdminNotification(`⏸️ *Pausa de Lote*\n\nCampaña ${campaignId} en pausa por ${batchDelay / 1000} segundos.`);
      await sleep(batchDelay);
      messagesSentInBatch = 0;
      currentBatchTrigger = getRandomNumber(batchSizeMin, batchSizeMax);
    } else if (processedCount < clients.length) {
      const delay = getRandomNumber(minDelayMs, maxDelayMs);
      await sleep(delay);
    }
  }
  
  log(`Campaña ${campaignId} finalizada.`);
  await sendAdminNotification(`✅ *Campaña Finalizada*\n\n- ID: ${campaignId}\n- Total: ${clients.length}\n- Enviados: ${totalSent}\n- Fallidos: ${totalFailed}\n- Saltados: ${totalSkipped}`);
};