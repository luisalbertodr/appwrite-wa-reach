const { Client, Databases, ID, Storage, Functions, Query } = require('node-appwrite'); // Importar Query
const fetch = require('node-fetch');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const MESSAGE_LOGS_COLLECTION_ID = 'message_logs';
// const CAMPAIGN_PROGRESS_COLLECTION_ID = 'campaign_progress'; // Comentado - Corrección 2
const MAX_EXECUTION_TIME = 270000; // 4.5 minutos en milisegundos

module.exports = async ({ req, res, log, error }) => {
    if (req.method !== 'POST') {
        return res.json({ success: false, error: 'Only POST requests are allowed.' }, 405);
    }

    const executionStartTime = Date.now();

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT || 'http://appwrite/v1')
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const storage = new Storage(client);
    const functions = new Functions(client);

    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
    const CAMPAIGNS_COLLECTION_ID = process.env.APPWRITE_CAMPAIGNS_COLLECTION_ID || 'campaigns';

    if (!DATABASE_ID) {
        error('Variable de entorno APPWRITE_DATABASE_ID no configurada.');
        return res.json({ success: false, error: 'Server configuration is incomplete.' }, 500);
    }

    let payload;
    if (typeof req.body === 'string' && req.body.length > 0) {
        try {
            payload = JSON.parse(req.body);
        } catch (e) {
            error(`Error al parsear el cuerpo de la solicitud JSON: ${e.message}`);
            return res.json({ success: false, error: 'Cuerpo de la solicitud JSON inválido.' }, 400);
        }
    } else if (typeof req.body === 'object' && req.body !== null) {
        payload = req.body;
    } else {
        error('El cuerpo de la solicitud está vacío o tiene un formato no válido.');
        return res.json({ success: false, error: 'El cuerpo de la solicitud está vacío o tiene un formato no válido.' }, 400);
    }

    // 'clients' (original) se usará para el recuento total en la notificación final
    let { clients, template, config, campaignId, remainingClients } = payload;
    const clientList = remainingClients || clients;


    if (!clientList || !Array.isArray(clientList) || !template || !config || !campaignId || !clients) {
        error('Payload inválido. Faltan clients, template, config o campaignId.');
        return res.json({ success: false, error: 'Invalid payload.' }, 400);
    }

    const {
        minDelayMs = 2000, maxDelayMs = 5000,
        batchSizeMin = 15, batchSizeMax = 25,
        batchDelayMsMin = 60000, batchDelayMsMax = 120000,
        adminPhoneNumbers,
        notificationInterval = 50,
        startTime = '09:00',
        endTime = '18:00',
        session = 'default'
    } = config;

    if (!remainingClients) {
        res.json({ success: true, message: 'Campaign process started in the background.' });
    }

    log(`Campaña ${campaignId} iniciada para ${clientList.length} clientes (de un total de ${clients.length}) usando la sesión '${session}'.`);

    const WAHA_API_URL = process.env.WAHA_API_URL;
    const WAHA_API_KEY = process.env.WAHA_API_KEY;

    if (!WAHA_API_URL || !WAHA_API_KEY) {
        error('Variables de entorno de Waha no configuradas.');
        if (remainingClients) { return res.json({ success: false, error: 'Waha environment variables not configured.' }, 500); }
        return;
    }

    // --- CORRECCIÓN 1: 'logStatus' modificado para coincidir con el esquema de 'message_logs' ---
    const logStatus = async (client, status, messageContent = '', errorMsg = '') => {
        try {
            await databases.createDocument(
                DATABASE_ID,
                MESSAGE_LOGS_COLLECTION_ID,
                ID.unique(),
                {
                    campaign_id: campaignId,
                    client_id: String(client.codcli),
                    phone_number: String(client.tel2cli),
                    message: messageContent,
                    status: status,
                    error_message: errorMsg || undefined, // Usar 'undefined' si está vacío
                    sent_at: (status === 'sent' || status === 'failed') ? new Date().toISOString() : undefined,
                }
            );
        } catch (e) {
            // Loguear más detalles en caso de fallo del log
            error(`Failed to log status for client ${client.codcli}: ${e.message} (Status: ${status}, Error: ${errorMsg})`);
        }
    };

    // --- CORRECCIÓN 2: 'updateProgress' comentado porque no coincide con el esquema de 'campaign_progress' ---
    /*
    const updateProgress = async (currentClient) => {
        try {
            await databases.getDocument(DATABASE_ID, CAMPAIGN_PROGRESS_COLLECTION_ID, campaignId);
            await databases.updateDocument(
                DATABASE_ID,
                CAMPAIGN_PROGRESS_COLLECTION_ID,
                campaignId,
                {
                    currentClientName: currentClient.nomcli,
                    currentClientPhone: currentClient.tel2cli
                }
            );
        } catch (e) {
            if (e.code === 404) {
                try {
                    await databases.createDocument(
                        DATABASE_ID,
                        CAMPAIGN_PROGRESS_COLLECTION_ID,
                        campaignId,
                        {
                            currentClientName: currentClient.nomcli,
                            currentClientPhone: currentClient.tel2cli
                        }
                    );
                } catch (e2) {
                    error(`Failed to create progress for campaign ${campaignId}: ${e2.message}`);
                }
            } else {
                error(`Failed to update progress for campaign ${campaignId}: ${e.message}`);
            }
        }
    };
    */
    // --- FIN CORRECCIÓN 2 ---

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
                    body: JSON.stringify({ chatId: formattedAdminPhoneNumber, text: text, session: session }),
                });
                log(`Notificación de admin enviada a ${adminPhoneNumber}`);
            } catch (e) {
                error(`Fallo al enviar notificación de admin a ${adminPhoneNumber}: ${e.message}`);
            }
        }
    };

    if (!remainingClients) {
        await databases.updateDocument(
            DATABASE_ID,
            CAMPAIGNS_COLLECTION_ID,
            campaignId,
            { status: 'running' } // Cambiado de 'sending' a 'running' para coincidir con el enum
        );
        // Usar clients.length (total) en lugar de clientList.length (chunk)
        await sendAdminNotification(`🚀 *Inicio de Campaña*\n\n- ID: ${campaignId}\n- Audiencia: ${clients.length} clientes.`);
    }

    let totalSent = 0; // Estadísticas locales para este chunk
    let totalSkipped = 0;
    let totalFailed = 0;

    const validMessages = template.messages.filter(m => m && m.trim() !== '');
    const validImageUrls = template.imageUrls.filter(url => url && url.trim() !== '');
    
    let currentBatchSize = getRandomNumber(batchSizeMin, batchSizeMax);
    let messagesSinceLastBatchPause = 0;

    for (const [index, c] of clientList.entries()) {
        const elapsedTime = Date.now() - executionStartTime;
        if (elapsedTime > MAX_EXECUTION_TIME) {
            log('Tiempo de ejecución máximo casi alcanzado. Re-planificando la tarea.');
            const nextClients = clientList.slice(index);
            await sleep(1000); // Pausa antes de re-lanzar
            await functions.createExecution(
                'sendWhatsAppFunction',
                JSON.stringify({ ...payload, remainingClients: nextClients }),
                true
            );
            // Salir de la ejecución actual, ya que se ha re-planificado
            if (remainingClients) { return res.json({ success: true, message: 'Chunk rescheduled due to time limit.' }); }
            return; 
        }

        // --- CORRECCIÓN 2: Llamada a updateProgress comentada ---
        // await updateProgress(c);
        // --- FIN CORRECCIÓN 2 ---

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;

        if (currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes >= endTimeInMinutes) {
            log('Fuera del horario de envío. Planificando para el siguiente día.');
            const nextClients = clientList.slice(index);

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(startHour, startMinute, 0, 0);

            await sleep(1000); // Pausa antes de re-lanzar
            await functions.createExecution(
                'sendWhatsAppFunction',
                JSON.stringify({ ...payload, remainingClients: nextClients }),
                true,
                undefined,
                undefined,
                tomorrow.toISOString()
            );
            // Salir de la ejecución actual, ya que se ha re-planificado
            if (remainingClients) { return res.json({ success: true, message: 'Chunk rescheduled for next day.' }); }
            return;
        }

        if (c.enviar !== 1 || !c.tel2cli || !/^[67]\d{8}$/.test(c.tel2cli)) {
            totalSkipped++;
            // --- CORRECCIÓN 1: Actualizada llamada a logStatus ---
            await logStatus(c, 'skipped', '', 'Opt-out o teléfono inválido');
            continue;
        }

        let messageToSend = '';
        if (validMessages.length > 0) {
            const randomIndex = Math.floor(Math.random() * validMessages.length);
            messageToSend = validMessages[randomIndex];
        }

        let imageUrlToSend = '';
        if (validImageUrls.length > 0) {
            const randomIndex = Math.floor(Math.random() * validImageUrls.length);
            imageUrlToSend = validImageUrls[randomIndex];
        }

        if (!messageToSend && !imageUrlToSend) {
            totalSkipped++;
             // --- CORRECCIÓN 1: Actualizada llamada a logStatus ---
            await logStatus(c, 'skipped', '', 'No hay contenido de plantilla para enviar.');
            continue;
        }

        const phoneNumber = c.tel2cli;
        let formattedPhoneNumber = phoneNumber;
        if (!formattedPhoneNumber.startsWith('34') && !formattedPhoneNumber.startsWith('+34')) {
            formattedPhoneNumber = `34${formattedPhoneNumber}`;
        }
        formattedPhoneNumber = formattedPhoneNumber.includes('@c.us') ? formattedPhoneNumber : `${formattedPhoneNumber}@c.us`;

        // --- MODIFICACIÓN (Sin retraso inicial) ---
        // Se comprueba si 'remainingClients' existe. Si NO existe Y es el index 0, es el primer cliente.
        const isFirstClientOfCampaign = !remainingClients && index === 0;

        if (!isFirstClientOfCampaign) {
            const delay = getRandomNumber(minDelayMs, maxDelayMs);
            log(`Retraso individual de ${delay}ms antes de enviar a ${formattedPhoneNumber}`);
            await sleep(delay);
        } else {
            log(`Procesando primer cliente de la campaña ${formattedPhoneNumber} sin retraso individual.`);
        }
        // --- FIN MODIFICACIÓN ---

        let messageContent = messageToSend.replace(/\[nombre\]/g, c.nomcli || '');

        log(`Attempting to send message to ${formattedPhoneNumber}`);

        try {
            let response;
            if (imageUrlToSend && imageUrlToSend.trim() !== '') {
                const url = new URL(imageUrlToSend);
                const pathParts = url.pathname.split('/');
                const bucketId = pathParts[pathParts.indexOf('buckets') + 1];
                const fileId = pathParts[pathParts.indexOf('files') + 1];

                if (!bucketId || !fileId) {
                    throw new Error(`URL de Appwrite Storage no válida: ${imageUrlToSend}`);
                }

                const imageBuffer = await storage.getFileDownload(bucketId, fileId);
                const imageBase64 = imageBuffer.toString('base64');

                const fileMeta = await storage.getFile(bucketId, fileId);
                const mimetype = fileMeta.mimeType || 'image/jpeg';

                response = await fetch(`${WAHA_API_URL}/api/sendImage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
                    body: JSON.stringify({
                        chatId: formattedPhoneNumber,
                        file: {
                            mimetype: mimetype,
                            data: imageBase64,
                            filename: "image.jpg"
                        },
                        caption: messageContent,
                        session: session
                    }),
                });
            } else {
                response = await fetch(`${WAHA_API_URL}/api/sendText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
                    body: JSON.stringify({ chatId: formattedPhoneNumber, text: messageContent, session: session }),
                });
            }

            if (response.ok) {
                totalSent++;
                // --- CORRECCIÓN 1: Actualizada llamada a logStatus (pasando messageContent) ---
                await logStatus(c, 'sent', messageContent);
            } else {
                const errorData = await response.json();
                totalFailed++;
                // --- CORRECCIÓN 1: Actualizada llamada a logStatus (pasando messageContent y error) ---
                await logStatus(c, 'failed', messageContent, `WAHA API error: ${response.status} - ${JSON.stringify(errorData)}`);
            }
        } catch (e) {
            totalFailed++;
            // --- CORRECCIÓN 1: Actualizada llamada a logStatus (pasando messageContent y error) ---
            await logStatus(c, 'failed', messageContent, `Network error: ${e.message}`);
        }
        
        messagesSinceLastBatchPause++;

        // Notificación de progreso (usa 'clients.length' para el total)
        if ((index + 1) % notificationInterval === 0) {
            await sendAdminNotification(`📊 *Progreso de Campaña*\n\n- ID: ${campaignId}\n- Procesados (aprox): ${index + 1}/${clients.length}\n- Enviados (este chunk): ${totalSent}\n- Fallidos (este chunk): ${totalFailed}\n- Saltados (este chunk): ${totalSkipped}`);
        }
        
        // Lógica de pausa de lote (batch)
        if (messagesSinceLastBatchPause >= currentBatchSize) {
            const batchDelay = getRandomNumber(batchDelayMsMin, batchDelayMsMax);
            log(`Pausa de lote de ${batchDelay / 1000}s`);
            await sleep(batchDelay);
            // Reset for the next batch
            messagesSinceLastBatchPause = 0;
            currentBatchSize = getRandomNumber(batchSizeMin, batchSizeMax);
        }
    }

    // --- Si llegamos aquí, este CHUNK ha terminado y NO se ha re-planificado ---
    
    // --- MODIFICACIÓN: Obtener estadísticas finales de los logs (CORREGIDO) ---
    log(`Campaña ${campaignId} finalizada. Obteniendo estadísticas finales...`);
    let finalSent = 0;
    let finalFailed = 0;
    let finalSkipped = 0;

    try {
        // Contar 'sent'
        const sentResponse = await databases.listDocuments(DATABASE_ID, MESSAGE_LOGS_COLLECTION_ID, [
            Query.equal('campaign_id', campaignId),
            Query.equal('status', 'sent'),
            Query.limit(1) // CORRECCIÓN: Usar 1 en lugar de 0
        ]);
        finalSent = sentResponse.total;

        // Contar 'failed'
        const failedResponse = await databases.listDocuments(DATABASE_ID, MESSAGE_LOGS_COLLECTION_ID, [
            Query.equal('campaign_id', campaignId),
            Query.equal('status', 'failed'),
            Query.limit(1) // CORRECCIÓN: Usar 1 en lugar de 0
        ]);
        finalFailed = failedResponse.total;

        // Contar 'skipped'
        const skippedResponse = await databases.listDocuments(DATABASE_ID, MESSAGE_LOGS_COLLECTION_ID, [
            Query.equal('campaign_id', campaignId),
            Query.equal('status', 'skipped'),
            Query.limit(1) // CORRECCIÓN: Usar 1 en lugar de 0
        ]);
        finalSkipped = skippedResponse.total;

        log(`Estadísticas finales obtenidas de los logs: Sent=${finalSent}, Failed=${finalFailed}, Skipped=${finalSkipped}`);

    } catch (e) {
        error(`Error al obtener estadísticas finales de los logs: ${e.message}`);
        // Usar los totales locales como fallback (aunque sean solo de este chunk)
        finalSent = totalSent;
        finalFailed = totalFailed;
        finalSkipped = totalSkipped;
        log('Usando estadísticas locales del chunk como fallback para la notificación final.');
    }
    // --- FIN MODIFICACIÓN ---

    // --- CORRECCIÓN 2: deleteDocument comentado ---
    /*
    try {
        await databases.deleteDocument(DATABASE_ID, CAMPAIGN_PROGRESS_COLLECTION_ID, campaignId);
    } catch (e) {
        error(`Could not delete progress document for campaign ${campaignId}: ${e.message}`);
    }
    */
    // --- FIN CORRECCIÓN 2 ---

    const finalStatus = 'completed'; // El enum es 'completed' o 'completed_with_errors' no existe en el schema
    
    await databases.updateDocument(
        DATABASE_ID,
        CAMPAIGNS_COLLECTION_ID,
        campaignId,
        { 
            status: finalStatus,
            completed_at: new Date().toISOString(),
            messages_sent: finalSent,
            messages_failed: finalFailed,
            // total_recipients se debió setear al crear la campaña
        }
    );

    // Usar 'clients.length' (total) y las estadísticas finales consultadas
    await sendAdminNotification(`✅ *Campaña Finalizada*\n\n- ID: ${campaignId}\n- Total: ${clients.length}\n- Enviados: ${finalSent}\n- Fallidos: ${finalFailed}\n- Saltados: ${finalSkipped}`);

    if (remainingClients) {
        return res.json({ success: true, message: 'Chunk processed successfully.' });
    }

    // Si era una llamada síncrona (improbable, pero por si acaso)
    return res.json({ success: true, message: 'Campaign finished successfully.' });
};