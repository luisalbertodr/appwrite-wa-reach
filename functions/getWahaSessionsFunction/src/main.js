const fetch = require('node-fetch');
// Importar el SDK de Appwrite para servidor
const { Client, Databases } = require('node-appwrite');

// Constantes de tu base de datos (obtenidas de tu app)
const DATABASE_ID = '68b1d7530028045d94d3';
const WAHA_CONFIG_COLLECTION_ID = 'config';

module.exports = async ({ res, log, error }) => {
  
  // 1. Configurar el Cliente de Appwrite
  // Estas variables (APPWRITE_...) SÍ son las variables de entorno
  // estándar que Appwrite proporciona a todas las funciones.
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://appwrite.lipoout.com/v1') // Usamos tu endpoint como fallback
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY); // API Key de servidor

  const databases = new Databases(client);

  let wahaConfig;
  let WAHA_API_URL, WAHA_API_KEY;

  // 2. Obtener la configuración de WAHA desde la base de datos
  try {
    log('Obteniendo configuración de WAHA desde la base de datos...');
    const response = await databases.listDocuments(DATABASE_ID, WAHA_CONFIG_COLLECTION_ID);
    
    if (response.documents.length === 0) {
      error('No se encontró ningún documento en la colección "config".');
      return res.json({ success: false, error: 'No se ha guardado ninguna configuración de WAHA. Guarde la configuración primero.' }, 500);
    }
    
    wahaConfig = response.documents[0]; // Usamos el primer (y único) documento
    WAHA_API_URL = wahaConfig.apiUrl;
    WAHA_API_KEY = wahaConfig.apiKey; // Puede ser null o undefined, está bien

  } catch (dbError) {
    error(`Error al obtener la configuración de la BD: ${dbError.message}`);
    return res.json({ success: false, error: 'Error al leer la configuración interna.' }, 500);
  }

  // 3. Comprobar la configuración obtenida
  if (!WAHA_API_URL) {
    error('La apiUrl está vacía en el documento de configuración de la BD.');
    return res.json({ success: false, error: 'La URL de la API de WAHA no está configurada. Guarde la configuración.' }, 500);
  }

  // 4. Ejecutar la lógica original (llamar a la API de WAHA)
  try {
    log(`Llamando a la API de WAHA: ${WAHA_API_URL}`);
    
    const response = await fetch(`${WAHA_API_URL}/api/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Añadir la cabecera X-Api-Key solo si tiene un valor
        ...(WAHA_API_KEY && { 'X-Api-Key': WAHA_API_KEY }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      error(`Error al obtener sesiones de Waha: ${response.status} ${errorText}`);
      return res.json({ success: false, error: `Error de la API de Waha: ${response.status}` }, 500);
    }

    const sessions = await response.json(); // Esto es: [{ name, status }, ...]

    // --- CORRECCIÓN DE RESPUESTA ---
    // El frontend (Configuracion.tsx) espera el array de objetos completo,
    // no solo los nombres.
    log(`Se encontraron ${sessions.length} sesiones.`);
    
    // Devolvemos el array de sesiones tal cual lo da WAHA
    return res.json(sessions);

  } catch (err) {
    error(`Error inesperado al conectar con Waha: ${err.message}`);
    return res.json({ success: false, error: (err.message || 'No se pudieron obtener las sesiones de Waha.') }, 500);
  }
};