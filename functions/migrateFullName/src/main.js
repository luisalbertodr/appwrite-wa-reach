const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'http://appwrite/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
  const CLIENTS_COLLECTION_ID = 'clients';

  log('Iniciando migración de nombres completos...');

  try {
    let offset = 0;
    let documents;
    let updatedCount = 0;

    do {
      documents = await databases.listDocuments(
        DATABASE_ID,
        CLIENTS_COLLECTION_ID,
        [Query.limit(100), Query.offset(offset)]
      );

      for (const doc of documents.documents) {
        const fullName = `${doc.nomcli || ''} ${doc.ape1cli || ''}`.trim();
        if (doc.nombre_completo !== fullName) {
          await databases.updateDocument(
            DATABASE_ID,
            CLIENTS_COLLECTION_ID,
            doc.$id,
            { nombre_completo: fullName }
          );
          updatedCount++;
        }
      }

      offset += documents.documents.length;
    } while (documents.documents.length > 0);

    log(`Migración completada. ${updatedCount} clientes actualizados.`);
    return res.json({ success: true, updated: updatedCount });

  } catch (e) {
    error(`Error durante la migración: ${e.message}`);
    return res.json({ success: false, error: e.message }, 500);
  }
};