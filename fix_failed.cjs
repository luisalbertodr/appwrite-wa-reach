const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
    .setEndpoint(process.env.VITE_APPWRITE_PUBLIC_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = '68b1d7530028045d94d3';
const COLLECTION_ID = 'clientes'; // ID de tu colección de clientes

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Atributos fallidos que necesitan recrearse
const failedAttributes = [
    { key: 'nombre_completo', type: 'string', size: 255, required: false },
    { key: 'email', type: 'email', required: false },
    { key: 'dnicli', type: 'string', size: 50, required: false },
    { key: 'dircli', type: 'string', size: 500, required: false },
    { key: 'procli', type: 'string', size: 100, required: false },
    { key: 'tel1cli', type: 'string', size: 50, required: false },
    { key: 'tel2cli', type: 'string', size: 50, required: false },
    { key: 'importErrors', type: 'string', size: 1000, required: false, array: true }
];

async function deleteFailedAttribute(key) {
    try {
        console.log(`🗑️  Eliminando atributo fallido: ${key}`);
        await databases.deleteAttribute(DATABASE_ID, COLLECTION_ID, key);
        await sleep(2000);
        console.log(`  ✓ Atributo ${key} eliminado`);
        return true;
    } catch (error) {
        if (error.code === 404) {
            console.log(`  ℹ️  Atributo ${key} no existe, continuando...`);
            return true;
        }
        console.error(`  ✗ Error eliminando ${key}:`, error.message);
        return false;
    }
}

async function createAttribute(attr) {
    const { key, type, size, required = false, array = false } = attr;
    
    try {
        console.log(`➕ Creando atributo: ${key} (${type})`);
        
        switch (type) {
            case 'string':
                await databases.createStringAttribute(
                    DATABASE_ID,
                    COLLECTION_ID,
                    key,
                    size,
                    required,
                    undefined, // default value
                    array
                );
                break;
                
            case 'email':
                await databases.createEmailAttribute(
                    DATABASE_ID,
                    COLLECTION_ID,
                    key,
                    required,
                    undefined,
                    array
                );
                break;
                
            default:
                console.warn(`  ⚠️  Tipo desconocido: ${type}`);
                return false;
        }
        
        await sleep(2000);
        console.log(`  ✓ Atributo ${key} creado exitosamente`);
        return true;
        
    } catch (error) {
        console.error(`  ✗ Error creando ${key}:`, error.message);
        return false;
    }
}

async function fixFailedAttributes() {
    console.log('='.repeat(60));
    console.log('CORRECCIÓN DE ATRIBUTOS FALLIDOS EN CLIENTES');
    console.log('='.repeat(60));
    console.log();
    
    // Paso 1: Eliminar atributos fallidos
    console.log('PASO 1: Eliminando atributos fallidos...');
    console.log('-'.repeat(60));
    
    for (const attr of failedAttributes) {
        await deleteFailedAttribute(attr.key);
    }
    
    console.log('\n⏳ Esperando 5 segundos para que Appwrite procese las eliminaciones...\n');
    await sleep(5000);
    
    // Paso 2: Recrear atributos
    console.log('PASO 2: Recreando atributos...');
    console.log('-'.repeat(60));
    
    let successCount = 0;
    let failCount = 0;
    
    for (const attr of failedAttributes) {
        const success = await createAttribute(attr);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('RESUMEN');
    console.log('='.repeat(60));
    console.log(`✓ Atributos creados exitosamente: ${successCount}`);
    console.log(`✗ Atributos con errores: ${failCount}`);
    console.log('='.repeat(60));
}

// Ejecutar
fixFailedAttributes()
    .then(() => {
        console.log('\n✓ Script finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n✗ Error:', error);
        process.exit(1);
    });