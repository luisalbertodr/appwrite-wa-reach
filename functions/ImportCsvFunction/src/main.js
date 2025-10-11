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
    const CLIENTS_COLLECTION_ID = process.env.APPWRITE_CLIENTS_COLLECTION_ID;
    const IMPORT_LOGS_COLLECTION_ID = process.env.APPWRITE_IMPORT_LOGS_COLLECTION_ID;
    const IMPORT_BUCKET_ID = '68d7cd3a0019edb5703b'; // ID de tu bucket de importación

    let successfulImports = 0;
    let totalProcessed = 0;
    const importErrors = [];
    const timestamp = new Date().toISOString();
    let fileName = 'unknown-file.csv';

    // Helper functions
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
        if (!dni) return { isValid: false, message: 'DNI/NIE no proporcionado.' };
        dni = dni.toUpperCase().trim();
        const dniRegex = /^(\d{8})([A-Z])$/;
        const nieRegex = /^[XYZ]\d{7}[A-Z]$/;
        const letterMap = 'TRWAGMYFPDXBNJZSQVHLCKE';

        if (dniRegex.test(dni)) {
            const [, num, letter] = dni.match(dniRegex);
            const expectedLetter = letterMap[parseInt(num) % 23];
            return { isValid: letter === expectedLetter, message: letter === expectedLetter ? 'DNI válido.' : `Letra de DNI incorrecta. La correcta es ${expectedLetter}.` };
        } else if (nieRegex.test(dni)) {
            const niePrefix = dni.charAt(0);
            const nieNum = (niePrefix === 'X' ? '0' : niePrefix === 'Y' ? '1' : '2') + dni.substring(1, 8);
            const letter = dni.charAt(8);
            const expectedLetter = letterMap[parseInt(nieNum) % 23];
            return { isValid: letter === expectedLetter, message: letter === expectedLetter ? 'NIE válido.' : `Letra de NIE incorrecta. La correcta es ${expectedLetter}.` };
        } else {
            return { isValid: false, message: 'Formato de DNI/NIE inválido.' };
        }
    };
    
    const validateMobilePhone = (phone) => {
        if (!phone) return { isValid: false, message: 'Teléfono no proporcionado.' };
        const mobileRegex = /^[67]\d{8}$/;
        return { isValid: mobileRegex.test(phone), message: mobileRegex.test(phone) ? 'Teléfono móvil válido.' : 'Teléfono principal inválido (debe empezar por 6 o 7 y tener 9 dígitos).' };
    };
    
    const validateClient = (clientData, isStrict = true) => {
        const errors = {};
        if (!clientData.codcli || !/^\d{6}$/.test(clientData.codcli)) errors.codcli = 'El código de cliente es requerido y debe tener 6 dígitos.';
        if ((isStrict || clientData.nomcli) && !clientData.nomcli) errors.nomcli = 'El nombre es requerido.';
        if (clientData.email && !/\S+@\S+\.\S+/.test(clientData.email)) errors.email = 'Email inválido.';
        else if (isStrict && !clientData.email) errors.email = 'Email requerido.';
        if (clientData.dnicli) { const dniValidation = validateDniNie(clientData.dnicli); if (!dniValidation.isValid) errors.dnicli = dniValidation.message; }
        else if (isStrict) errors.dnicli = 'DNI/NIE requerido.';
        if (clientData.tel2cli) { const tel2Validation = validateMobilePhone(clientData.tel2cli); if (!tel2Validation.isValid) errors.tel2cli = tel2Validation.message; }
        else if (isStrict) errors.tel2cli = 'Teléfono móvil principal requerido.';
        if (clientData.fecnac && calculateAge(clientData.fecnac) < 0) errors.fecnac = 'La fecha de nacimiento no puede ser futura.';
        return errors;
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

        log(`Processing latest file: ${fileName} (ID: ${fileId}) from bucket: ${IMPORT_BUCKET_ID}`);

        const fileBuffer = await storage.getFileDownload(IMPORT_BUCKET_ID, fileId);
        const fileContent = fileBuffer.toString('utf8');

        const results = Papa.parse(fileContent, { header: true, skipEmptyLines: true, delimiter: ',' }); // <-- AQUÍ ESTÁ EL CAMBIO
        totalProcessed = results.data.length;

        if (results.errors.length > 0) {
            results.errors.forEach(err => error(`CSV Parsing Error: ${err.message}`));
            importErrors.push(...results.errors.map(e => `Error de parseo: ${e.message} en fila ${e.row}`));
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

            const clientSpecificErrors = [];
            const errors = validateClient(newClientRecord, false);
            if (Object.keys(errors).length > 0) {
                clientSpecificErrors.push(...Object.values(errors));
                importErrors.push(`Fila ${rowNumber} (Cod: ${newClientRecord.codcli || 'N/A'}): ${clientSpecificErrors.join(', ')}`);
            }

            try {
                const clientToSave = {
                    ...newClientRecord,
                    nombre_completo: `${newClientRecord.nomcli || ''} ${newClientRecord.ape1cli || ''}`.trim(),
                    edad: newClientRecord.fecnac ? calculateAge(newClientRecord.fecnac) : undefined,
                    importErrors: clientSpecificErrors,
                };
                
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
                importErrors.push(`Fila ${rowNumber} (Cod: ${newClientRecord.codcli}): ${msg}`);
            }
        }
        
        const logStatus = importErrors.length > 0 ? 'completed_with_errors' : 'completed';
        const logDoc = { timestamp, filename: fileName, successfulImports, totalProcessed, errors: importErrors.length > 0 ? importErrors : ['Ninguno'], status: logStatus };

        await databases.createDocument(DATABASE_ID, IMPORT_LOGS_COLLECTION_ID, ID.unique(), logDoc);
        log(`Import log saved for ${fileName}. Status: ${logStatus}`);
        
        return res.json({ ok: true, message: `Importación finalizada.`, ...logDoc }, 200);

    } catch (err) {
        error(`Unhandled error during import: ${err.message}`);
        try {
            await databases.createDocument(DATABASE_ID, IMPORT_LOGS_COLLECTION_ID, ID.unique(), {
                timestamp, filename: fileName, successfulImports: 0, totalProcessed,
                errors: [`Error no controlado: ${err.message}`], status: 'failed',
            });
        } catch (logError) {
            error(`Failed to save failure log: ${logError.message}`);
        }
        return res.json({ ok: false, message: `Error interno del servidor: ${err.message}` }, 500);
    }
};
