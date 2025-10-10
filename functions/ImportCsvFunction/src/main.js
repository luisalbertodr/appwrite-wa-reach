const { Client, Databases, Storage, ID, Query, AppwriteException } = require('node-appwrite');
const Papa = require('papaparse');

// Initialize Appwrite SDK
const client = new Client();

// ***************************************************************
// *** CONEXIÓN FINAL: Usamos el Gateway de Docker y Project ID fijo ***
// ***************************************************************
client.setEndpoint('http://172.19.0.1/v1'); // IP del Gateway de la red 'appwrite'
client.setProject('68d6d4060020e39899f6'); // Project ID fijo
client.setKey(process.env.APPWRITE_API_KEY); // API Key de entorno

const databases = new Databases(client);
const storage = new Storage(client);

// Variables de Entorno para IDs de Bases de Datos y Colecciones
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const CLIENTS_COLLECTION_ID = process.env.APPWRITE_CLIENTS_COLLECTION_ID;
const IMPORT_LOGS_COLLECTION_ID = process.env.APPWRITE_IMPORT_LOGS_COLLECTION_ID;

// Helper functions 
const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const validateDniNie = (dni) => {
    dni = dni.toUpperCase().trim();
    const dniRegex = /^(\d{8})([A-Z])$/;
    const nieRegex = /^[XYZ]\d{7}[A-Z]$/;
    const letterMap = 'TRWAGMYFPDXBNJZSQVHLCKE';

    if (dniRegex.test(dni)) {
        const [, num, letter] = dni.match(dniRegex);
        const expectedLetter = letterMap[parseInt(num) % 23];
        if (letter === expectedLetter) {
            return { isValid: true, message: 'DNI válido.' };
        } else {
            return { isValid: false, message: `Letra de DNI incorrecta. La letra correcta es ${expectedLetter}.` };
        }
    } else if (nieRegex.test(dni)) { 
        const niePrefix = dni.charAt(0);
        const nieNum = (niePrefix === 'X' ? '0' : niePrefix === 'Y' ? '1' : '2') + dni.substring(1, 8);
        const letter = dni.charAt(8);
        const expectedLetter = letterMap[parseInt(nieNum) % 23];
        if (letter === expectedLetter) {
            return { isValid: true, message: 'NIE válido.' };
        } else {
            return { isValid: false, message: `Letra de NIE incorrecta. La letra correcta es ${expectedLetter}.` };
        }
    } else {
        return { isValid: false, message: 'Formato de DNI/NIE inválido.' };
    }
};

const validateMobilePhone = (phone) => {
    const mobileRegex = /^[67]\d{8}$/; 
    if (mobileRegex.test(phone)) {
        return { isValid: true, message: 'Teléfono móvil válido.' };
    } else {
        return { isValid: false, message: 'Teléfono principal inválido. Debe ser móvil (empezar por 6 o 7 y tener 9 dígitos).' };
    }
};

const validateClient = (clientData, isStrict = true) => {
    const errors = {};

    if (!clientData.codcli || !/^\d{6}$/.test(clientData.codcli)) {
        errors.codcli = 'El código de cliente es requerido y debe tener 6 dígitos.';
    }

    if (isStrict || clientData.nomcli) {
        if (!clientData.nomcli) errors.nomcli = 'El nombre es requerido.';
    }
    if (isStrict || clientData.ape1cli) {
        if (!clientData.ape1cli) errors.ape1cli = 'Los apellidos son requeridos.';
    }
    if (isStrict || clientData.email) {
        if (clientData.email && !/\S+@\S+\.\S+/.test(clientData.email)) errors.email = 'Email inválido.';
        else if (isStrict && !clientData.email) errors.email = 'Email requerido.';
    }
    
    if (clientData.dnicli) {
        const dniValidation = validateDniNie(clientData.dnicli);
        if (!dniValidation.isValid) errors.dnicli = dniValidation.message;
    } else if (isStrict) {
        errors.dnicli = 'DNI/NIE requerido.';
    }

    if (isStrict || clientData.dircli) {
        if (!clientData.dircli) errors.dircli = 'La dirección es requerida.';
    }
    if (isStrict || clientData.codposcli) {
        if (!clientData.codposcli || !/^\d{5}$/.test(clientData.codposcli)) errors.codposcli = 'Código postal inválido (5 dígitos).';
    }
    if (isStrict || clientData.pobcli) {
        if (!clientData.pobcli) errors.pobcli = 'La localidad es requerida.';
    }
    if (isStrict || clientData.procli) {
        if (!clientData.procli) errors.procli = 'La provincia es requerida.';
    }

    if (clientData.tel2cli) { 
        const tel2Validation = validateMobilePhone(clientData.tel2cli);
        if (!tel2Validation.isValid) errors.tel2cli = tel2Validation.message;
    } else if (isStrict) {
        errors.tel2cli = 'Teléfono móvil principal requerido.';
    }

    if (clientData.tel1cli) { 
        if (!/^\d{9}$/.test(clientData.tel1cli)) errors.tel1cli = 'Teléfono secundario inválido (9 dígitos).';
    }

    if (isStrict || clientData.fecnac) {
        if (!clientData.fecnac) errors.fecnac = 'La fecha de nacimiento es requerida.';
        else if (calculateAge(clientData.fecnac) < 0) errors.fecnac = 'Fecha de nacimiento futura.';
    }

    if (isStrict || clientData.enviar !== undefined) {
        if (clientData.enviar === undefined || (clientData.enviar !== 0 && clientData.enviar !== 1)) errors.enviar = 'El campo "enviar" es requerido (0 o 1).';
    }
    if (isStrict || clientData.sexo) {
        if (!clientData.sexo || !['H', 'M', 'Otro'].includes(clientData.sexo)) errors.sexo = 'Sexo inválido.';
    }
    if (isStrict || clientData.fecalta) {
        if (!clientData.fecalta) errors.fecalta = 'La fecha de alta es requerida.';
    }

    return errors;
};

// Date conversion logic 
const convertDate = (dateStr) => {
    if (!dateStr) return undefined;
    
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const [day, monthStr, yearShort] = parts;
        const monthMap = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
        };
        const month = monthMap[monthStr];
        if (month) {
            let fullYear = parseInt(yearShort, 10);
            if (fullYear < 30) { 
                fullYear += 2000;
            } else { 
                fullYear += 1900;
            }
            return `${fullYear}-${month}-${day.padStart(2, '0')}`;
        }
    }

    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj) && dateObj.getFullYear() > 1900) {
        return dateObj.toISOString().split('T')[0];
    }
    
    return undefined;
};


module.exports = async ({ req, res, log, error }) => {
    log('CSV Import Function started.');

    let successfulImports = 0;
    let totalProcessed = 0;
    const importErrors = [];
    const timestamp = new Date().toISOString();
    let fileName = 'unknown-file.csv'; 
    let fileContent = '';

    try {
        // *********************************************************************************
        // * BLOQUE DE PRODUCCIÓN: Lee la variable de entorno del evento *
        // *********************************************************************************
        const eventData = process.env.APPWRITE_FUNCTION_EVENT_DATA;
        let fileId, bucketId;

        if (!eventData) {
            // Si no hay payload, salimos con un 400 informativo
            error('No event data found. This function must be triggered by a storage event.');
            return res.json({ ok: false, message: 'No event data found. Please trigger via file upload.' }, 400);
        }

        // Si el payload sí llega, lo usamos normalmente
        const fileEvent = JSON.parse(eventData);
        fileId = fileEvent.$id;
        bucketId = fileEvent.bucketId;
        fileName = fileEvent.name; 

        if (!fileId || !bucketId) {
            error('Could not extract fileId or bucketId from event data.');
            return res.json({ ok: false, message: 'Could not extract fileId or bucketId from event data.' }, 400);
        }
        // *********************************************************************************

        log(`Processing file: ${fileName} (ID: ${fileId}) from bucket: ${bucketId}`);

        // Download the file content from Appwrite Storage
        const fileBuffer = await storage.getFileDownload(bucketId, fileId);
        fileContent = fileBuffer.toString('utf8'); 

        const results = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            delimiter: ';', // CORRECCIÓN CRÍTICA PARA CSV EUROPEO
        });

        totalProcessed = results.data.length;

        if (results.errors.length > 0) {
            results.errors.forEach(err => error(`CSV Parsing Error: ${err.message}`));
            return res.json({ ok: false, message: 'CSV parsing errors.', errors: results.errors }, 400);
        }

        for (const [index, row] of results.data.entries()) {
            const clientData = row; 
            const rowNumber = index + 2; 

            const fecnacFormatted = convertDate(clientData.fecnac);
            const fecaltaFormatted = convertDate(clientData.fecalta);

            const newClientRecord = {
                codcli: clientData.codcli || '',
                nomcli: clientData.nomcli || undefined,
                ape1cli: clientData.ape1cli || undefined,
                email: clientData.email || undefined,
                dnicli: clientData.dnicli || undefined,
                dircli: clientData.dircli || undefined,
                codposcli: clientData.codposcli || undefined,
                pobcli: clientData.pobcli || undefined,
                procli: clientData.procli || undefined,
                tel1cli: clientData.tel1cli || undefined,
                tel2cli: clientData.tel2cli || undefined,
                fecnac: fecnacFormatted,
                enviar: clientData.enviar === '1' ? 1 : (clientData.enviar === '0' ? 0 : undefined),
                sexo: (clientData.sexo === 'H' || clientData.sexo === 'M' || clientData.sexo === 'Otro') ? clientData.sexo : undefined,
                fecalta: fecaltaFormatted,
            };

            const errors = validateClient(newClientRecord, false); 
            if (Object.keys(errors).length > 0) {
                importErrors.push(`Fila ${rowNumber} (Cod. Cliente: ${newClientRecord.codcli || 'N/A'}): ${Object.values(errors).join(', ')}`);
                continue; 
            }

            try {
                const clientToSave = { 
                    ...newClientRecord,
                      nombre_completo: `${newClientRecord.nomcli || ''} ${newClientRecord.ape1cli || ''}`.trim(),
                    edad: newClientRecord.fecnac ? calculateAge(newClientRecord.fecnac) : undefined,
                };
                
                // Check if client with codcli already exists
                const existingClients = await databases.listDocuments(
                    DATABASE_ID,
                    CLIENTS_COLLECTION_ID,
                    [Query.equal('codcli', newClientRecord.codcli)]
                );

                if (existingClients.documents.length > 0) {
                    // Update existing client
                    await databases.updateDocument(
                        DATABASE_ID,
                        CLIENTS_COLLECTION_ID,
                        existingClients.documents[0].$id,
                        clientToSave
                    );
                    log(`Cliente actualizado: ${newClientRecord.codcli}`);
                    successfulImports++;
                } else {
                    // Create new client
                    await databases.createDocument(
                        DATABASE_ID,
                        CLIENTS_COLLECTION_ID,
                        ID.unique(), // Usar ID.unique() para que Appwrite genere el ID
                        clientToSave
                    );
                    log(`Cliente creado: ${newClientRecord.codcli}`);
                    successfulImports++;
                }
            } catch (dbError) {
                if (dbError instanceof AppwriteException) {
                    error(`Error al guardar cliente ${newClientRecord.codcli}: Tipo: ${dbError.type}, Código: ${dbError.code}, Mensaje: ${dbError.message}`);
                    importErrors.push(`Fallo al guardar cliente ${newClientRecord.codcli} (Fila ${rowNumber}): ${dbError.message} (Tipo: ${dbError.type}, Código: ${dbError.code})`);
                } else {
                    error(`Error al guardar cliente ${newClientRecord.codcli}: ${dbError.message}`);
                    importErrors.push(`Fallo al guardar cliente ${newClientRecord.codcli} (Fila ${rowNumber}): ${dbError.message}`);
                }
            }
        }

        // Save import log to Appwrite database
        const importLogDocument = {
            timestamp: timestamp,
            filename: fileName, // ¡Corregido a minúscula!
            successfulImports: successfulImports,
            totalProcessed: totalProcessed,
            errors: importErrors.length > 0 ? importErrors : ['Ninguno'], 
            status: importErrors.length > 0 ? 'completed_with_errors' : 'completed',
        };

        try {
            await databases.createDocument(
                DATABASE_ID,
                IMPORT_LOGS_COLLECTION_ID,
                ID.unique(), 
                importLogDocument
            );
            log(`Import log saved for ${fileName}. Status: ${importLogDocument.status}`);
        } catch (logError) {
            error(`Failed to save import log for ${fileName}: ${logError.message}`);
        }

        // Final Response
        if (importErrors.length > 0) {
            return res.json({ 
                ok: true, 
                message: `Importación completada con ${successfulImports} éxitos y ${importErrors.length} errores.`, 
                successfulImports, 
                totalProcessed,
                importErrors 
            }, 200);
        } else {
            return res.json({ 
                ok: true, 
                message: `Importación exitosa. Se procesaron ${successfulImports} clientes.`, 
                successfulImports,
                totalProcessed
            }, 200);
        }

    } catch (err) {
        error(`Unhandled error during CSV import: ${err.message}`);
        
        let errorFileName = fileName || 'unknown-file.csv'; 
        
        // Attempt to save a failed log if possible
        try {
            await databases.createDocument(
                DATABASE_ID,
                IMPORT_LOGS_COLLECTION_ID,
                ID.unique(),
                {
                    timestamp: timestamp,
                    filename: errorFileName, 
                    successfulImports: 0,
                    totalProcessed: totalProcessed,
                    errors: [`Unhandled error: ${err.message}`],
                    status: 'failed',
                }
            );
        } catch (logError) {
            error(`Failed to save unhandled error log for ${errorFileName}: ${logError.message}`);
        }
        return res.json({ ok: false, message: `Error interno del servidor: ${err.message}` }, 500);
    }
};