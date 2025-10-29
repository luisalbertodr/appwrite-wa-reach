const fetch = require('node-fetch');

module.exports = async ({ res, log, error }) => {
  const WAHA_API_URL = process.env.WAHA_API_URL;
  const WAHA_API_KEY = process.env.WAHA_API_KEY;

  // 1. Añadido: Controlador de Abort para manejar timeouts de red antes del timeout de Appwrite (15s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout de WAHA

  if (!WAHA_API_URL || !WAHA_API_KEY) {
    error('Las variables de entorno de Waha (WAHA_API_URL, WAHA_API_KEY) no están configuradas en Appwrite.');
    return res.json({ success: false, error: 'La configuración del servidor está incompleta.' }, 500);
  }

  try {
    log('Fetching sessions from Waha API...');
    const response = await fetch(`${WAHA_API_URL}/api/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WAHA_API_KEY,
      },
      signal: controller.signal, // Se añade el signal para el AbortController
    });

    clearTimeout(timeoutId); // Limpiar el timeout si la petición finaliza a tiempo

    if (!response.ok) {
      const errorData = await response.text();
      error(`Error al obtener sesiones de Waha: ${response.status} ${errorData}`);
      
      // Manejo explícito de 401/404/etc. que no confunda al frontend.
      return res.json({ success: false, error: `Error de la API de Waha: ${response.status}`, details: errorData.substring(0, 100) }, response.status === 401 ? 401 : 502);
    }

    const sessions = await response.json();
    const sessionNames = sessions.map(session => session.name);
    
    log(`Se encontraron las siguientes sesiones: ${sessionNames.join(', ')}`);
    
    // Devolver un JSON estándar (el array de strings) que el frontend espera
    return res.json(sessionNames, 200);

  } catch (err) {
    clearTimeout(timeoutId); // Asegurar la limpieza del timeout

    if (err.name === 'AbortError') {
      error('Error de red: La API de WAHA ha excedido el tiempo de espera (8s).');
      return res.json({ success: false, error: 'WAHA_TIMEOUT' }, 504); // 504 Gateway Timeout
    }
    
    // Manejar cualquier otro error de red o fallo de JSON parsing
    error(`Error de red inesperado al obtener sesiones de Waha: ${err.message}`);
    return res.json({ success: false, error: 'Fallo de Red con Waha.', details: err.message }, 503); // 503 Service Unavailable
  }
};