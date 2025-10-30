// ==============================================================================
// SCRIPT PARA POBLAR EL CAMPO nombre_completo EN TODOS LOS CLIENTES
// ==============================================================================

import { Client, Databases, Query } from 'node-appwrite';
import dotenv from 'dotenv';

const DATABASE_ID = '68d78cb20028fac621d4';
const COLLECTION_ID = 'clients';

// Leer variables de entorno del archivo .env
dotenv.config();

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function updateNombreCompleto() {
    try {
        console.log('Obteniendo todos los clientes...');
        
        let allClients = [];
        let offset = 0;
        let hasMore = true;
        
        // Obtener todos los clientes paginados
        while (hasMore) {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID,
                [Query.limit(100), Query.offset(offset)]
            );
            
            allClients = allClients.concat(response.documents);
            offset += response.documents.length;
            hasMore = response.documents.length === 100;
            
            console.log(`Obtenidos ${allClients.length} de ${response.total} clientes...`);
        }
        
        console.log(`\nTotal de clientes a actualizar: ${allClients.length}\n`);
        
        let count = 0;
        let errors = 0;
        
        for (const client of allClients) {
            count++;
            const docId = client.$id;
            const nomcli = client.nomcli || '';
            const ape1cli = client.ape1cli || '';
            
            // Concatenar nombre y apellido
            const nombreCompleto = `${nomcli} ${ape1cli}`.trim();
            
            console.log(`[${count}/${allClients.length}] Actualizando ${docId}: ${nombreCompleto}`);
            
            try {
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTION_ID,
                    docId,
                    { nombre_completo: nombreCompleto }
                );
            } catch (err) {
                console.error(`  ❌ Error actualizando ${docId}: ${err.message}`);
                errors++;
            }
        }
        
        console.log(`\n✅ Proceso completado: ${count} clientes procesados, ${errors} errores`);
        
    } catch (err) {
        console.error('❌ Error general:', err.message);
        process.exit(1);
    }
}

updateNombreCompleto();
