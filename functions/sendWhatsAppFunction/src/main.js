const { Client, Databases, Query, ID } = require('node-appwrite');
const fetch = require('node-fetch'); // Asegúrate de tener node-fetch v2 (npm install node-fetch@^2.6.1)

// Constantes de Appwrite
const DATABASE_ID = '68d78cb20028fac621d4';
const CLIENTS_COLLECTION_ID = 'clients';
const CAMPAIGNS_COLLECTION_ID = 'campaigns';
const TEMPLATES_COLLECTION_ID = 'templates';
const CONFIG_COLLECTION_ID = 'config';
const MESSAGE_LOGS_COLLECTION_ID = 'message_logs';

// --- Helpers (sin cambios) ---
const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const sendMessage = async (apiUrl, apiKey, phone, message) => {
    const url = `${apiUrl}/sendText`;
    console.log(`Sending message to ${phone}...`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey,
            },
            body: JSON.stringify({ chatId: `${phone}@c.us`, text: message }),
        });
        let responseData;
        try {
            responseData = await response.json();
        } catch (jsonError) {
            responseData = await response.text();
        }
        console.log(`Response from WAHA for ${phone}: ${response.status}`, responseData);
        if (!response.ok) {
            console.error(`WAHA API Error for ${phone}: ${response.status}`, responseData);
            const errorMessage = (typeof responseData === 'object' && responseData !== null && responseData.message) ? responseData.message : `HTTP error ${response.status} - ${responseData}`;
            return { success: false, error: errorMessage };
        }
        const messageId = (typeof responseData === 'object' && responseData !== null && responseData.id) ? responseData.id : null;
        return { success: true, messageId: messageId };
    } catch (error) {
        console.error(`Network or Fetch Error sending to ${phone}:`, error);
        return { success: false, error: error.message };
    }
};
// --- Fin Helpers ---

module.exports = async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    let campaignId, templateId, sessionName, audienceFilters;

    // --- Validación inicial del payload ---
    try {
        if (!req.body) {
          throw new Error('Request body is missing');
        }
        const payload = JSON.parse(req.body);
        campaignId = payload.campaignId;
        templateId = payload.templateId;
        sessionName = payload.sessionName || 'default';
        audienceFilters = payload.audienceFilters || {};
        log(`Payload received: campaignId=${campaignId}, templateId=${templateId}, sessionName=${sessionName}, filters=${JSON.stringify(audienceFilters)}`);

        if (!campaignId || !templateId) {
            throw new Error('campaignId and templateId are required');
        }
    } catch (e) {
        error('Invalid request body:', e.message);
        // **RETURN TEMPRANO EN CASO DE ERROR DE PAYLOAD**
        return res.json({ success: false, error: `Invalid payload: ${e.message}` }, 400);
    }
    // --- Fin Validación inicial ---

    let config = null;
    let apiKey = null;

    try {
        // --- Obtener configuración ---
        log('Fetching system configuration...');
        const configResponse = await databases.listDocuments(DATABASE_ID, CONFIG_COLLECTION_ID, [Query.limit(1)]);
        if (configResponse.documents.length === 0) throw new Error('System configuration not found.');
        config = configResponse.documents[0];
        apiKey = config.apiKey;
        log('System configuration fetched successfully.');
        if (!config.apiUrl || !apiKey) throw new Error('WAHA API URL or API Key not configured.');
        // --- Fin Obtener configuración ---

        // --- Obtener Campaña y Plantilla ---
        log(`Fetching campaign ${campaignId}...`);
        const campaign = await databases.getDocument(DATABASE_ID, CAMPAIGNS_COLLECTION_ID, campaignId);
        log(`Campaign fetched. Status: ${campaign.status}`);
        log(`Fetching template ${templateId}...`);
        const template = await databases.getDocument(DATABASE_ID, TEMPLATES_COLLECTION_ID, templateId);
        log('Template fetched.');
        // --- Fin Obtener Campaña y Plantilla ---

        // --- Validar estado y Notificar Admins (Sin cambios) ---
        if (campaign.status !== 'pending' && campaign.status !== 'paused') {
             log(`Campaign ${campaignId} has invalid status for start: ${campaign.status}. Aborting.`);
             // **RETURN TEMPRANO**
             return res.json({ success: false, error: `Campaign cannot be started with status ${campaign.status}.` });
        }
        if (config.adminPhoneNumbers && config.adminPhoneNumbers.length > 0) {
            log(`Notifying ${config.adminPhoneNumbers.length} admins...`);
            let realAudienceCount = campaign.targetAudienceCount || '(calculating...)';
            try {
                 let countQueries = [Query.limit(0)];
                 if (audienceFilters.tagsInclude && audienceFilters.tagsInclude.length > 0) {
                   countQueries.push(Query.search('tags', audienceFilters.tagsInclude.join(' ')));
                 }
                 const countResponse = await databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, countQueries);
                 realAudienceCount = countResponse.total;
            } catch (countError) {
                 error("Could not calculate real audience count for admin message:", countError);
            }
            const adminMessage = `🚀 *Inicio de Campaña*\n\n- ID: ${campaignId}\n- Audiencia: ${realAudienceCount} clientes.`;
            for (const adminPhone of config.adminPhoneNumbers) {
                log(`Attempting to send admin notification to ${adminPhone}...`);
                const adminSendResult = await sendMessage(config.apiUrl, apiKey, adminPhone, adminMessage);
                log(`Admin notification result for ${adminPhone}: success=${adminSendResult.success}`);
            }
        } else {
            log('No admin phone numbers configured for notification.');
        }
         // --- Fin Validar estado y Notificar Admins ---


        // --- Marcar como 'running' y Obtener Clientes (Sin cambios) ---
        log(`Updating campaign ${campaignId} status to running...`);
        await databases.updateDocument(DATABASE_ID, CAMPAIGNS_COLLECTION_ID, campaignId, { status: 'running', startedAt: new Date().toISOString() });
        log(`Campaign ${campaignId} status updated to running.`);
        log('Building client queries...');
        let clientQueries = [Query.limit(5000)];
        if (audienceFilters.tagsInclude && audienceFilters.tagsInclude.length > 0) {
            clientQueries.push(Query.search('tags', audienceFilters.tagsInclude.join(' ')));
             log(`Added tag filter: ${audienceFilters.tagsInclude.join(' ')}`);
        }
        log(`Fetching clients with queries: ${JSON.stringify(clientQueries)}`);
        const clientResponse = await databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, clientQueries);
        const clients = clientResponse.documents;
        log(`Fetched ${clients.length} clients (Total potentially matching: ${clientResponse.total}).`);
        // --- Fin Marcar como 'running' y Obtener Clientes ---

        // --- Obtener Logs para evitar duplicados (Sin cambios) ---
        log('Fetching message logs for this campaign to avoid duplicates...');
        let loggedPhones = new Set();
        let logOffset = 0;
        let logLimit = 100;
        let logResponse;
        do {
            log(`Fetching message logs batch: offset=${logOffset}, limit=${logLimit}`);
            logResponse = await databases.listDocuments(DATABASE_ID, MESSAGE_LOGS_COLLECTION_ID, [
                Query.equal('campaignId', campaignId),
                Query.limit(logLimit),
                Query.offset(logOffset)
            ]);
            log(`Fetched ${logResponse.documents.length} log entries in this batch.`);
            logResponse.documents.forEach(logEntry => loggedPhones.add(logEntry.clientPhone));
            logOffset += logResponse.documents.length;
        } while (logResponse.documents.length === logLimit && logOffset < 5000);
        log(`Found ${loggedPhones.size} phones that already received messages for campaign ${campaignId}.`);
        // --- Fin Obtener Logs ---


        // --- Bucle principal de envío (Sin cambios en la lógica interna, solo en el control de errores general) ---
        let processedCount = campaign.processedCount || 0;
        let successCount = campaign.successCount || 0;
        let failedCount = campaign.failedCount || 0;
        let batchCounter = 0;
        let notificationCounter = 0;

        log('Starting client loop...');
        for (const client of clients) {
            console.log(`Processing client ${client.$id} - ${client.phone}`);
            if (loggedPhones.has(client.phone)) {
                 log(`Skipping client ${client.phone} - already processed.`);
                 continue;
            }

            log(`Checking campaign ${campaignId} status before processing client ${client.phone}...`);
            const currentCampaignState = await databases.getDocument(DATABASE_ID, CAMPAIGNS_COLLECTION_ID, campaignId);
            log(`Current campaign status: ${currentCampaignState.status}`);
            if (currentCampaignState.status !== 'running') {
                log(`Campaign ${campaignId} status changed to ${currentCampaignState.status}. Stopping execution.`);
                break;
            }

            const messageDelay = getRandomInt(config.minDelayMs || 1000, config.maxDelayMs || 3000);
            log(`Delaying for ${messageDelay}ms before sending to ${client.phone}`);
            await delay(messageDelay);

            let personalizedMessage = template.body.replace(/{{name}}/g, client.name || '');

            const result = await sendMessage(config.apiUrl, apiKey, client.phone, personalizedMessage);

            try {
                log(`Attempting to log message result for ${client.phone}...`);
                await databases.createDocument(DATABASE_ID, MESSAGE_LOGS_COLLECTION_ID, ID.unique(), {
                    campaignId: campaignId, clientId: client.$id, clientPhone: client.phone, templateId: templateId,
                    status: result.success ? 'sent' : 'failed', errorMessage: result.success ? null : result.error,
                    sentAt: new Date().toISOString(), wahaMessageId: result.messageId || null
                });
                log(`Message log created successfully for ${client.phone}.`);
            } catch (logError) {
                error(`Failed to create message log for client ${client.phone}:`, logError);
            }

            processedCount++;
            if (result.success) { successCount++; notificationCounter++; } else { failedCount++; }

            try {
                log(`Attempting to update campaign progress: processed=${processedCount}, success=${successCount}, failed=${failedCount}`);
                await databases.updateDocument(DATABASE_ID, CAMPAIGNS_COLLECTION_ID, campaignId, {
                    processedCount, successCount, failedCount, lastUpdatedAt: new Date().toISOString()
                });
                log('Campaign progress updated.');
            } catch (updateError) {
                error(`Failed to update campaign progress for ${campaignId}:`, updateError);
            }

            const notifyInterval = config.notificationInterval || 50;
            if (notificationCounter >= notifyInterval && config.adminPhoneNumbers && config.adminPhoneNumbers.length > 0) {
                 log(`Reached notification interval (${notifyInterval}). Notifying admins...`);
                 const progressMessage = `📊 *Progreso Campaña ${campaignId}*\n\n- Enviados: ${successCount}\n- Fallidos: ${failedCount}\n- Total Procesados: ${processedCount}`;
                 for (const adminPhone of config.adminPhoneNumbers) {
                     log(`Sending progress update to admin ${adminPhone}...`);
                     await sendMessage(config.apiUrl, apiKey, adminPhone, progressMessage);
                     log(`Progress update sent to admin ${adminPhone}.`);
                 }
                 notificationCounter = 0;
            }

            batchCounter++;
            const batchSize = getRandomInt(config.batchSizeMin || 5, config.batchSizeMax || 15);
            if (batchCounter >= batchSize) {
                const batchDelay = getRandomInt(config.batchDelayMsMin || 30000, config.batchDelayMsMax || 60000);
                log(`Batch size ${batchSize} reached. Pausing for ${batchDelay}ms...`);
                await delay(batchDelay);
                batchCounter = 0;
            }
        } // Fin del bucle for
        log('Finished client loop.');
        // --- Fin Bucle principal ---


        // --- Finalización de campaña (Sin cambios) ---
        log(`Checking final campaign status for ${campaignId}...`);
        const finalCampaignState = await databases.getDocument(DATABASE_ID, CAMPAIGNS_COLLECTION_ID, campaignId);
        log(`Final campaign status before completion check: ${finalCampaignState.status}`);

        if (finalCampaignState.status === 'running') {
            log(`Marking campaign ${campaignId} as completed...`);
            await databases.updateDocument(DATABASE_ID, CAMPAIGNS_COLLECTION_ID, campaignId, {
                status: 'completed', completedAt: new Date().toISOString(),
                processedCount, successCount, failedCount
            });
            log(`Campaign ${campaignId} marked as completed.`);
            if (config.adminPhoneNumbers && config.adminPhoneNumbers.length > 0) {
                 log('Sending final completion notification to admins...');
                 const finalMessage = `✅ *Campaña Finalizada*\n\n- ID: ${campaignId}\n- Enviados: ${successCount}\n- Fallidos: ${failedCount}\n- Total Procesados: ${processedCount}`;
                 for (const adminPhone of config.adminPhoneNumbers) {
                    log(`Sending final notification to admin ${adminPhone}...`);
                    await sendMessage(config.apiUrl, apiKey, adminPhone, finalMessage);
                    log(`Final notification sent to admin ${adminPhone}.`);
                 }
            }
        } else {
             log(`Campaign ${campaignId} was not in 'running' state at the end. Final status: ${finalCampaignState.status}`);
        }
        // --- Fin Finalización ---

        // **RETURN EN CASO DE ÉXITO**
        return res.json({ success: true, message: 'Campaign processing finished or stopped.' });

    } catch (err) {
        error('Error during campaign execution:', err.message, err.stack); // Loguear más detalle del error
         // --- Marcar campaña como fallida (Sin cambios) ---
        if (campaignId && config) {
            try {
                 log(`Attempting to mark campaign ${campaignId} as failed due to error...`);
                 await databases.updateDocument(DATABASE_ID, CAMPAIGNS_COLLECTION_ID, campaignId, {
                    status: 'failed', errorMessage: err.message || 'Unknown error during execution.',
                    lastUpdatedAt: new Date().toISOString()
                 });
                 log(`Campaign ${campaignId} marked as failed.`);
                 if (config.adminPhoneNumbers && config.adminPhoneNumbers.length > 0 && apiKey) {
                     log('Notifying admins about the failure...');
                     const failMessage = `❌ *Error en Campaña*\n\n- ID: ${campaignId}\n- Error: ${err.message || 'Unknown error'}`;
                     for (const adminPhone of config.adminPhoneNumbers) {
                         log(`Sending failure notification to admin ${adminPhone}...`);
                         await sendMessage(config.apiUrl, apiKey, adminPhone, failMessage);
                          log(`Failure notification sent to admin ${adminPhone}.`);
                     }
                 }
            } catch (updateError) {
                error(`Failed to update campaign ${campaignId} status to failed:`, updateError);
            }
        }
        // **RETURN EN CASO DE ERROR EN EL BLOQUE TRY PRINCIPAL**
        return res.json({ success: false, error: err.message || 'An unknown error occurred' }, 500);
    }
    // **AÑADIDO: RETURN DE SEGURIDAD POR SI ALGO FALLA ANTES DEL TRY PRINCIPAL (IMPROBABLE)**
    // Si la ejecución llega aquí, algo muy raro ocurrió antes del bloque try principal.
    error('Execution reached unexpected end without returning response.');
    return res.json({ success: false, error: 'Function ended unexpectedly.' }, 500);
};