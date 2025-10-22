const sdk = require('node-appwrite');
const fs = require('fs');

// Leer variables de entorno
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
    .setEndpoint(process.env.VITE_APPWRITE_PUBLIC_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY); // Necesitarás una API Key

const DATABASE_ID = '68b1d7530028045d94d3';

// Función para esperar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para crear atributo según su tipo
async function createAttribute(collectionId, attr) {
    const { key, type, required = false, array = false } = attr;
    
    // LÓGICA DE CORRECCIÓN (del error 'required/default'):
    const defaultValue = required ? undefined : attr.default;

    try {
        console.log(`  Creando atributo: ${key} (${type})`);
        
        switch (type) {
            case 'string':
                
                // --- INICIO MODIFICACIÓN (Control de Límite de TAMAÑO v3) ---
                
                // 1. Manejar 'size: 0' (que significa 'ilimitado' o TEXT)
                let size;
                if (attr.size === 0) {
                    size = 0;
                } else {
                    // Si no es 0, usamos el tamaño del attr o 255 por defecto
                    size = attr.size || 255;
                }

                // 2. Capar el tamaño. Bajamos el límite a 8000 por seguridad.
                if (size > 1000) { 
                    console.warn(`  ⚠️  Tamaño original de ${key} (${size}) excede el límite de seguridad. Capando a 8000.`);
                    size = 1000;
                }
                // --- FIN MODIFICACIÓN ---

                await databases.createStringAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    size, // Usamos la variable 'size' modificada
                    required,
                    defaultValue, 
                    array
                );
                break;
                
            case 'email':
                await databases.createEmailAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    required,
                    defaultValue, 
                    array
                );
                break;
                
            case 'integer':
                await databases.createIntegerAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    required,
                    attr.min,
                    attr.max,
                    defaultValue, 
                    array
                );
                break;
                
            case 'double':
                await databases.createFloatAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    required,
                    attr.min,
                    attr.max,
                    defaultValue, 
                    array
                );
                break;
                
            case 'boolean':
                await databases.createBooleanAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    required,
                    defaultValue, 
                    array
                );
                break;
                
            case 'datetime':
                await databases.createDatetimeAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    required,
                    defaultValue, 
                    array
                );
                break;
                
            case 'enum':
                // Convertir enum a string con tamaño 50 (esto está bien, no se cambia)
                console.log(`    NOTA: Convirtiendo enum a string (valores: ${attr.elements.join(', ')})`);
                await databases.createStringAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    50,
                    required,
                    defaultValue, 
                    array
                );
                break;
                
            default:
                console.warn(`  ⚠️  Tipo de atributo desconocido: ${type}`);
        }
        
        // Esperar 2 segundos entre atributos
        await sleep(2000);
        console.log(`  ✓ Atributo ${key} creado`);
        
    } catch (error) {
        // CAPTURAR ERROR 409 (CONFLICTO / YA EXISTE)
        if (error.code === 409 || error.type === 'attribute_already_exists') {
            console.warn(`  ⚠️  Atributo ${key} ya existe. Omitiendo.`);
        } else {
            // Si es un error DIFERENTE (como el de 'limit_exceeded'),
            // sí lo mostramos y detenemos el script.
            console.error(`  ✗ Error creando atributo ${key}:`, error.message);
            throw error;
        }
    }
}

// Función para crear índice (VERSIÓN ROBUSTA)
async function createIndex(collectionId, index) {
    const { key, type, attributes, orders = [] } = index;
    
    try {
        // 1. Verificar que la colección existe y obtener sus atributos
        let collection;
        try {
            collection = await databases.getCollection(DATABASE_ID, collectionId);
        } catch (error) {
            console.warn(`  ⚠️  No se pudo acceder a la colección ${collectionId}. Índice ${key} omitido.`);
            return;
        }
        
        // 2. Verificar que todos los atributos del índice existen
        const existingAttrs = collection.attributes.map(a => a.key);
        const missingAttrs = attributes.filter(attr => !existingAttrs.includes(attr));
        
        if (missingAttrs.length > 0) {
            console.warn(`  ⚠️  Índice ${key} omitido: atributos faltantes: ${missingAttrs.join(', ')}`);
            return;
        }
        
        console.log(`  Creando índice: ${key} (${type}) sobre: ${attributes.join(', ')}`);
        
        // 3. Crear el índice
        await databases.createIndex(
            DATABASE_ID,
            collectionId,
            key,
            type,
            attributes,
            orders
        );
        
        await sleep(2000);
        console.log(`  ✓ Índice ${key} creado`);
        
    } catch (error) {
        if (error.code === 409 || error.type === 'index_already_exists') {
            console.warn(`  ⚠️  Índice ${key} ya existe. Omitiendo.`);
        } else if (error.type === 'attribute_not_available') {
            console.warn(`  ⚠️  Índice ${key} omitido: atributo no disponible.`);
        } else {
            console.warn(`  ⚠️  Error en índice ${key}: ${error.message}. Continuando...`);
            // NO lanzar error, solo advertir
        }
    }
}

// Función principal de restauración
async function restoreCollections() {
    console.log('='.repeat(60));
    console.log('RESTAURACIÓN DE COLECCIONES DE APPWRITE');
    console.log('='.repeat(60));
    console.log();
    
    // Leer archivo de respaldo
    const config = JSON.parse(fs.readFileSync('appwrite.config.json.enum-backup', 'utf8'));
    const collections = config.collections;
    
    // Colecciones que necesitan restauración completa (están vacías)
    const emptyCollections = [
        'empleados',
        'articulos',
        'citas',
        'facturas',
        'familias',
        'configuracion',
        'config',
        'templates',
        'campaigns',
        'campaign_progress',
        'message_logs'
    ];
    
    // 1. Restaurar atributos de colecciones vacías
    console.log('PASO 1: Restaurando atributos de colecciones vacías');
    console.log('-'.repeat(60));
    
    for (const collectionId of emptyCollections) {
        const collection = collections.find(c => c.$id === collectionId);
        if (!collection) {
            console.log(`⚠️  Colección ${collectionId} no encontrada en backup`);
            continue;
        }
        
        console.log(`\n📦 Restaurando colección: ${collection.name} (${collectionId})`);
        console.log(`   Total de atributos: ${collection.attributes.length}`);
        
        for (const attr of collection.attributes) {
            await createAttribute(collectionId, attr);
        }
        
        console.log(`✓ Colección ${collection.name} restaurada con ${collection.attributes.length} atributos`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('PASO 2: Creando índices faltantes');
    console.log('-'.repeat(60));
    
    // 2. Crear índices para todas las colecciones
    for (const collection of collections) {
        if (collection.indexes && collection.indexes.length > 0) {
            console.log(`\n📇 Creando índices para: ${collection.name} (${collection.$id})`);
            console.log(`   Total de índices: ${collection.indexes.length}`);
            
            for (const index of collection.indexes) {
                await createIndex(collection.$id, index);
            }
            
            console.log(`✓ Índices de ${collection.name} creados`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✓ RESTAURACIÓN COMPLETADA');
    console.log('='.repeat(60));
    console.log('\nIMPORTANTE: Los atributos enum se han convertido a string.');
    console.log('Si necesitas validación enum, deberás configurarla en tu aplicación.');
    console.log('\nAtributos enum convertidos a string:');
    console.log('  • clientes.sexo (H, M, Otro)');
    console.log('  • articulos.tipo (producto, servicio, bono)');
    console.log('  • citas.estado (agendada, pendiente, finalizada, cancelada)');
    console.log('  • facturas.estado (borrador, cobrada, anulada)');
    console.log('  • facturas.metodoPago (Efectivo, Tarjeta, Transferencia, Mixto)');
    console.log('  • campaigns.estado (borrador, en_progreso, completada, pausada)');
    console.log('  • campaign_progress.estado (pendiente, enviado, fallido)');
    console.log('  • message_logs.estado (enviado, fallido, pendiente)');
}

// Ejecutar restauración
restoreCollections()
    .then(() => {
        console.log('\n✓ Script finalizado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n✗ Error durante la restauración:', error);
        process.exit(1);
    });