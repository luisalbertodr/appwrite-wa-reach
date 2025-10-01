const { Client, Databases, Storage, ID, Query, AppwriteException } = require('node-appwrite');
const Papa = require('papaparse');

// Initialize Appwrite SDK
const client = new Client();

// ***************************************************************
// *** CORRECCIÓN CRÍTICA: Inicialización línea por línea ***
// *** y uso del endpoint interno para evitar errores de red ***
// ***************************************************************
client.setEndpoint('http://appwrite/v1'); // 1. Evita el error 'Protocol https not supported'
client.setProject(process.env.APPWRITE_PROJECT_ID); // 2. Configura el proyecto
client.setKey(process.env.APPWRITE_API_KEY); // 3. Evita el TypeError de la cadena de llamadas

const databases = new Databases(client);
const storage = new Storage(client);

// Appwrite Database and Collection IDs from Environment Variables
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const CLIENTS_COLLECTION_ID = process.env.APPWRITE_CLIENTS_COLLECTION_ID;
const IMPORT_LOGS_COLLECTION_ID = process.env.APPWRITE_IMPORT_LOGS_COLLECTION_ID;

// Helper functions (adapted from frontend)
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

    if (dniRegex.test(dni)) { // DNI Nacional
        const [, num, letter] = dni.match(dniRegex);
        const expectedLetter = letterMap[parseInt(num) % 23];
        if (letter === expectedLetter) {
            return { isValid: true, message: 'DNI válido.' };
        } else {
            return { isValid: false, message: `Letra de DNI incorrecta. La letra correcta es ${expectedLetter}.` };
        }
    } else if (nieRegex.test(dni)) { // NIE Extranjero
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
    // Permite formato sin prefijo de país para el móvil español 
    const mobileRegex = /^[67]\d{8}$/; 
    if (mobileRegex.test(phone)) {
        return { isValid: true, message: 'Teléfono móvil válido.' };
    } else {
        return { isValid: false, message: 'Teléfono principal inválido. Debe ser móvil (empezar por 6 o 7 y tener 9 dígitos).' };
    }
};

const validateClient = (clientData, isStrict = true) => {
    const errors = {};

    // codcli is always strictly required
    if (!clientData.codcli || !/^\d{6}$/.test(clientData.codcli)) {
        errors.codcli = 'El código de cliente es requerido y debe tener 6 dígitos.';
    }

    // For other fields, validate only if present or if strict validation is enabled
    if (isStrict || clientData.nomcli) {
        if (!clientData.nomcli) errors.nomcli = 'El nombre es requerido.';
    }
    if (isStrict || clientData.ape1cli) {
        if (!clientData.ape1cli) errors.ape1cli = 'Los apellidos son requeridos.';
    }
    if (isStrict || clientData.email) {
        // Validación de email solo si se proporciona
        if (clientData.email && !/\S+@\S+\.\S+/.test(clientData.email)) errors.email = 'Email inválido.';
        else if (isStrict && !clientData.email) errors.email = 'Email requerido.';
    }
    
    // Validación de DNI solo si se proporciona
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

    // Validación de Teléfono Principal (móvil) solo si se proporciona
    if (clientData.tel2cli) { 
        const tel2Validation = validateMobilePhone(clientData.tel2cli);
        if (!tel2Validation.isValid) errors.tel2cli = tel2Validation.message;
    } else if (isStrict) {
        errors.tel2cli = 'Teléfono móvil principal requerido.';
    }

    if (clientData.tel1cli) { // tel1cli is optional, only validate if provided
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
    
    // Intenta parsear DD-MMM-AA
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
            // Lógica de inferencia de siglo
            if (fullYear < 30) { 
                fullYear += 2000;
            } else { 
                fullYear += 1900;
            }
            return `${fullYear}-${month}-${day.padStart(2, '0')}`;
        }
    }

    // Intenta parsear YYYY-MM-DD o deja pasar si ya es ISO (para fecnacFormatted)
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj) && dateObj.getFullYear() > 1900) {
        return dateObj.toISOString().split('T')[0];
    }
    
    return undefined; // Devuelve undefined si no se puede parsear
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
        // Check for event data
        const eventData = process.env.APPWRITE_FUNCTION_EVENT_DATA;
        if (!eventData) {
            // Este es el error que veías al ejecutar manualmente. 
            // Ahora lo manejamos para retornar un 400 informativo.
            error('No event data found. This function should be triggered by a storage event.');
            return res.json({ ok: false, message: 'No event data found. This function should be triggered by a storage event.' }, 400);
        }

        const fileEvent = JSON.parse(eventData);
        const fileId = fileEvent.$id;
        const bucketId = fileEvent.bucketId;
        fileName = fileEvent.name;

        if (!fileId || !bucketId) {
            error('Could not extract fileId or bucketId from event data.');
            return res.json({ ok: false, message: 'Could not extract fileId or bucketId from event data.' }, 400);
        }

        log(`Processing file: ${fileName} (ID: ${fileId}) from bucket: ${bucketId}`);

        // Download the file content from Appwrite Storage
        const fileBuffer = await storage.getFileDownload(bucketId, fileId);
        fileContent = fileBuffer.toString('utf8'); // Assuming CSV is UTF-8

        const results = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            // Agrega esto si tienes problemas de codificación con tildes/eñes
            // encoding: 'ISO-8859-1', 
        });

        totalProcessed = results.data.length; // Total rows processed

        if (results.errors.length > 0) {
            results.errors.forEach(err => error(`CSV Parsing Error: ${err.message}`));
            return res.json({ ok: false, message: 'CSV parsing errors.', errors: results.errors }, 400);
        }

        for (const [index, row] of results.data.entries()) {
            const clientData = row; 
            // La fila CSV es index + 2 (header + 1-based index)
            const rowNumber = index + 2; 

            const fecnacFormatted = convertDate(clientData.fecnac);
            const fecaltaFormatted = convertDate(clientData.fecalta);

            // Preparar el objeto para la validación
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
                // Convierte el string '0' o '1' a número 0 o 1
                enviar: clientData.enviar === '1' ? 1 : (clientData.enviar === '0' ? 0 : undefined),
                sexo: (clientData.sexo === 'H' || clientData.sexo === 'M' || clientData.sexo === 'Otro') ? clientData.sexo : undefined,
                fecalta: fecaltaFormatted,
            };

            const errors = validateClient(newClientRecord, false); // Use non-strict validation for import
            if (Object.keys(errors).length > 0) {
                importErrors.push(`Fila ${rowNumber} (Cod. Cliente: ${newClientRecord.codcli || 'N/A'}): ${Object.values(errors).join(', ')}`);
                continue; // Skip this client if there are validation errors
            }

            try {
                const clientToSave = { 
                    ...newClientRecord, 
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
                    // Usamos ID.unique() si no estamos seguros de que codcli sea un ID válido
                    const documentId = newClientRecord.codcli; 
                    
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
            fileName: fileName,
            successfulImports: successfulImports,
            totalProcessed: totalProcessed,
            errors: importErrors.length > 0 ? importErrors : ['Ninguno'], // Guarda errores si los hay
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
        // Attempt to save a failed log if possible
        try {
            await databases.createDocument(
                DATABASE_ID,
                IMPORT_LOGS_COLLECTION_ID,
                ID.unique(),
                {
                    timestamp: timestamp,
                    fileName: fileName,
                    successfulImports: 0,
                    totalProcessed: totalProcessed,
                    errors: [`Unhandled error: ${err.message}`],
                    status: 'failed',
                }
            );
        } catch (logError) {
            error(`Failed to save unhandled error log for ${fileName}: ${logError.message}`);
        }
        return res.json({ ok: false, message: `Error interno del servidor: ${err.message}` }, 500);
    }
};