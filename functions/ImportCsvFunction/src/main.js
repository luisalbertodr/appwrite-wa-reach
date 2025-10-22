const { Client, Databases, Storage, ID, Query, AppwriteException } = require('node-appwrite');
const Papa = require('papaparse');

module.exports = async ({ req, res, log, error }) => {
    log('CSV Import Function started.');

    const client = new Client();
    client
        .setEndpoint(process.env.APPWRITE_ENDPOINT || 'http://appwrite/v1')
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const storage = new Storage(client);

    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
    
    // --- MODIFICACIÓN DEL PLAN ---
    // Apuntamos explícitamente a la nueva colección de Lipoout 'clientes'.
    const CLIENTS_COLLECTION_ID = 'clientes'; // (Anteriormente: process.env.APPWRITE_CLIENTS_COLLECTION_ID)
    // ---------------------------

    const IMPORT_LOGS_COLLECTION_ID = 'IMPORT_LOGS_COLLECTION_ID';
    const IMPORT_BUCKET_ID = 'lipoout';

    let successfulImports = 0;
    let totalProcessed = 0;
    const importErrors = [];
    const importWarnings = [];
    let errorSummary = {};
    const timestamp = new Date().toISOString();
    let fileName = 'unknown-file';

    const addIssue = (issueList, message) => {
        const messageStr = String(message);
        issueList.push(messageStr);
        try {
            const errorType = messageStr.split(':')[1]?.split('(')[0].trim() || 'Desconocido';
            errorSummary[errorType] = (errorSummary[errorType] || 0) + 1;
        } catch (e) {
            errorSummary['Error no categorizado'] = (errorSummary['Error no categorizado'] || 0) + 1;
        }
    };

    const calculateAge = (dob) => {
        if (!dob) return 0;
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
        if (!dni) return { isValid: true, message: 'DNI/NIE no proporcionado (advertencia).', isWarning: true };
        dni = dni.toUpperCase().trim();
        const dniRegex = /^(\d{8})([A-Z])$/;
        const nieRegex = /^[XYZ]\d{7}[A-Z]$/;
        const letterMap = 'TRWAGMYFPDXBNJZSQVHLCKE';

        if (dniRegex.test(dni)) {
            const [, num, letter] = dni.match(dniRegex);
            const expectedLetter = letterMap[parseInt(num) % 23];
            if (letter !== expectedLetter) {
                return { isValid: true, message: `DNI con letra incorrecta. Se esperaba ${expectedLetter} (advertencia).`, isWarning: true };
            }
            return { isValid: true, message: 'DNI válido.' };
        } else if (nieRegex.test(dni)) {
            const niePrefix = dni.charAt(0);
            const nieNum = (niePrefix === 'X' ? '0' : niePrefix === 'Y' ? '1' : '2') + dni.substring(1, 8);
            const letter = dni.charAt(8);
            const expectedLetter = letterMap[parseInt(nieNum) % 23];
            if (letter !== expectedLetter) {
                return { isValid: true, message: `NIE con letra incorrecta. Se esperaba ${expectedLetter} (advertencia).`, isWarning: true };
            }
            return { isValid: true, message: 'NIE válido.' };
        } else {
            return { isValid: false, message: 'Formato de DNI/NIE inválido.' };
        }
    };
    
    const validateMobilePhone = (phone) => {
        if (!phone || phone.trim() === '0' || phone.trim() === '') {
            return { isValid: true, message: 'Teléfono no proporcionado o es cero (omitido).', isWarning: true };
        }
        const mobileRegex = /^[67]\d{8}$/;
        return { isValid: mobileRegex.test(phone), message: mobileRegex.test(phone) ? 'Teléfono móvil válido.' : 'Teléfono principal inválido (debe empezar por 6 o 7 y tener 9 dígitos).' };
    };
    
    const validateClient = (clientData, isStrict = true) => {
        const errors = {};
        const warnings = {};
    
        if (!clientData.codcli || !/^\d{6}$/.test(clientData.codcli)) errors.codcli = 'El código de cliente es requerido y debe tener 6 dígitos.';
        if ((isStrict || clientData.nomcli) && !clientData.nomcli) errors.nomcli = 'El nombre es requerido.';
        
        if (clientData.email && !/\S+@\S+\.\S+/.test(clientData.email)) {
            errors.email = 'Email inválido.';
        } else if (isStrict && !clientData.email) {
            errors.email = 'Email requerido.';
        }
      
        const dniValidation = validateDniNie(clientData.dnicli);
        if (!dniValidation.isValid) {
            errors.dnicli = dniValidation.message;
        } else if (dniValidation.isWarning) {
            warnings.dnicli = dniValidation.message;
        }
    
        const tel2Validation = validateMobilePhone(clientData.tel2cli);
        if (!tel2Validation.isValid) {
            errors.tel2cli = tel2Validation.message;
        } else if (tel2Validation.isWarning) {
            warnings.tel2cli = tel2Validation.message;
        }
    
        if (clientData.fecnac && calculateAge(clientData.fecnac) < 0) errors.fecnac = 'La fecha de nacimiento no puede ser futura.';
    
        return { errors, warnings };
    };
    
    const convertDate = (dateStr) => {
        if (!dateStr) return undefined;
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const [day, monthStr, yearShort] = parts;
            const monthMap = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
            const month = monthMap[monthStr];
            if (month) {
                let fullYear = parseInt(yearShort, 10);
                fullYear += (fullYear < 30) ? 2000 : 1900;
                return `${fullYear}-${month}-${day.padStart(2, '0')}`;
            }
        }
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj) && dateObj.getFullYear() > 1900) {
            return dateObj.toISOString().split('T')[0];
        }
        return undefined;
    };

    try {
        log('Searching for the latest file in the import bucket...');
        const fileList = await storage.listFiles(IMPORT_BUCKET_ID, [
            Query.orderDesc('$createdAt'),
            Query.limit(1)
        ]);

        if (fileList.total === 0 || fileList.files.length === 0) {
            throw new Error('No files found in the import bucket.');
        }

        const latestFile = fileList.files[0];
        const fileId = latestFile.$id;
        fileName = latestFile.name;

        if (!fileName.toLowerCase().endsWith('.csv')) {
            log(`Ignoring non-CSV file: ${fileName}.`);
            return res.json({ ok: true, message: `Archivo ${fileName} ignorado por no ser CSV.` }, 200);
        }

        log(`Processing CSV file: ${fileName} (ID: ${fileId}) from bucket: ${IMPORT_BUCKET_ID}`);

        const fileBuffer = await storage.getFileDownload(IMPORT_BUCKET_ID, fileId);
        const fileContent = fileBuffer.toString('utf8');

        const results = Papa.parse(fileContent, { header: true, skipEmptyLines: true, delimiter: ',' });
        totalProcessed = results.data.length;

        if (results.errors.length > 0) {
            results.errors.forEach(err => error(`CSV Parsing Error: ${err.message}`));
            results.errors.forEach(e => addIssue(importErrors, `Error de parseo: ${e.message} en fila ${e.row}`));
        }

        for (const [index, row] of results.data.entries()) {
            const clientData = row;
            const rowNumber = index + 2;

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
                fecnac: convertDate(clientData.fecnac),
                enviar: clientData.enviar === '1' ? 1 : (clientData.enviar === '0' ? 0 : undefined),
                sexo: ['H', 'M', 'Otro'].includes(clientData.sexo) ? clientData.sexo : undefined,
                fecalta: convertDate(clientData.fecalta),
            };

            const { errors, warnings } = validateClient(newClientRecord, false);

            if (Object.keys(warnings).length > 0) {
                 Object.values(warnings).forEach(msg => addIssue(importWarnings, `Fila ${rowNumber} (Cod: ${newClientRecord.codcli || 'N/A'}): ${msg}`));
            }

            if (Object.keys(errors).length > 0) {
                Object.values(errors).forEach(msg => addIssue(importErrors, `Fila ${rowNumber} (Cod: ${newClientRecord.codcli || 'N/A'}): ${msg}`));
                continue;
            }

            try {
                const clientToSave = {
                    ...newClientRecord,
                    nombre_completo: `${newClientRecord.nomcli || ''} ${newClientRecord.ape1cli || ''}`.trim(),
                    edad: newClientRecord.fecnac ? calculateAge(newClientRecord.fecnac) : undefined,
                    importErrors: Object.values(warnings),
                    // Añadimos campos que falten en el tipo Cliente si es necesario
                    facturacion: parseFloat(clientData.facturacion) || 0,
                    intereses: clientData.intereses ? clientData.intereses.split(',').map(i => i.trim()) : [],
                };
                
                // Aseguramos que la búsqueda se hace contra la colección correcta
                const existing = await databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, [Query.equal('codcli', newClientRecord.codcli)]);

                if (existing.documents.length > 0) {
                    await databases.updateDocument(DATABASE_ID, CLIENTS_COLLECTION_ID, existing.documents[0].$id, clientToSave);
                    successfulImports++;
                } else {
                    await databases.createDocument(DATABASE_ID, CLIENTS_COLLECTION_ID, ID.unique(), clientToSave);
                    successfulImports++;
                }
            } catch (dbError) {
                const msg = (dbError instanceof AppwriteException) ? `${dbError.message} (Type: ${dbError.type})` : dbError.message;
                error(`DB Error for client ${newClientRecord.codcli}: ${msg}`);
                addIssue(importErrors, `Fila ${rowNumber} (Cod: ${newClientRecord.codcli}): ${msg}`);
            }
        }
        
        let logStatus = 'completed';
        if (importErrors.length > 0 && successfulImports === 0) {
            logStatus = 'failed';
        } else if (importErrors.length > 0 || importWarnings.length > 0) {
            logStatus = 'completed_with_errors';
        }
        
        const summaryLines = Object.entries(errorSummary).map(([key, value]) => String(`- Total de ${key}: ${value}`));
        const combinedLog = ['--- RESUMEN ---']
            .concat(summaryLines)
            .concat(['--- DETALLES ---'])
            .concat(importWarnings.map(String))
            .concat(importErrors.map(String));

        const logDoc = { 
            timestamp, 
            filename: fileName, 
            successfulImports, 
            totalProcessed, 
            errors: combinedLog.length > 3 ? combinedLog : ['Ninguno'], 
            status: logStatus 
        };

        await databases.createDocument(DATABASE_ID, IMPORT_LOGS_COLLECTION_ID, ID.unique(), logDoc);
        log(`Import log saved for ${fileName}. Status: ${logStatus}`);
        
        return res.json({ ok: true, message: `Importación finalizada.`, ...logDoc }, 200);

    } catch (err) {
        error(`Unhandled error during import: ${err.message}`);
        const errorMessage = (err instanceof AppwriteException) ? `${err.message} (Type: ${err.type})` : err.message;
        try {
            await databases.createDocument(DATABASE_ID, IMPORT_LOGS_COLLECTION_ID, ID.unique(), {
                timestamp, filename: fileName, successfulImports: 0, totalProcessed,
                errors: [`Error no controlado: ${errorMessage}`], status: 'failed',
            });
        } catch (logError) {
            error(`Failed to save failure log: ${logError.message}`);
        }
        return res.json({ ok: false, message: `Error interno del servidor: ${errorMessage}` }, 500);
    }
};
