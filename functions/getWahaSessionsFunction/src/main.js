const fetch = require('node-fetch');

module.exports = async ({ res, log, error }) => {
  const WAHA_API_URL = process.env.WAHA_API_URL;
  const WAHA_API_KEY = process.env.WAHA_API_KEY;

  if (!WAHA_API_URL || !WAHA_API_KEY) {
    error('Las variables de entorno de Waha (WAHA_API_URL, WAHA_API_KEY) no están configuradas.');
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      error(`Error al obtener sesiones de Waha: ${response.status} ${errorText}`);
      return res.json({ success: false, error: `Error de la API de Waha: ${response.status}` }, 500);
    }

    const sessions = await response.json();
    const sessionNames = sessions.map(session => session.name);
    
    log(`Se encontraron las siguientes sesiones: ${sessionNames.join(', ')}`);
    
    // --- CORRECCIÓN ---
    // Simplificado a res.json()
    return res.json(sessionNames, 200);
    // --- FIN CORRECCIÓN ---

  } catch (err) {
    error(`Error inesperado al obtener sesiones de Waha: ${err.message}`);
    return res.json({ success: false, error: 'No se pudieron obtener las sesiones de Waha.' }, 500);
  }
};