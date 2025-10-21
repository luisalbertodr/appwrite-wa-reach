import { Client, Databases, Account, Storage } from 'appwrite';

export const client = new Client();
export const storage = new Storage(client);

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_PUBLIC_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const account = new Account(client);

export const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

// === IDS BASE DE DATOS ===
// Base de datos del proyecto Lipoout
export const DATABASE_ID = '68b1d7530028045d94d3'; // Lipoout Database

// === COLECCIONES LIPOOUT (NUEVAS) ===
// Basado en Planning 2.md
export const CLIENTES_COLLECTION_ID = 'clientes';
export const EMPLEADOS_COLLECTION_ID = 'empleados';
export const ARTICULOS_COLLECTION_ID = 'articulos';
export const FAMILIAS_COLLECTION_ID = 'familias';
export const CITAS_COLLECTION_ID = 'citas';
export const FACTURAS_COLLECTION_ID = 'facturas';
export const PROVEEDORES_COLLECTION_ID = 'proveedores';
export const RECURSOS_COLLECTION_ID = 'recursos';
export const ASISTENCIA_COLLECTION_ID = 'asistencia';
export const LIPOOUT_CONFIG_COLLECTION_ID = 'configuracion'; // Config general Lipoout
export const CONFIGURATION_COLLECTION_ID = 'configuracion'; // Alias para compatibilidad

// === COLECCIONES WHATSAPP (MANTENIDAS DE LA PoC) ===
export const CAMPAIGNS_COLLECTION_ID = 'campaigns';
export const TEMPLATES_COLLECTION_ID = 'templates';
export const MESSAGE_LOGS_COLLECTION_ID = 'message_logs';
export const CAMPAIGN_PROGRESS_COLLECTION_ID = 'campaign_progress';
export const WAHA_CONFIG_COLLECTION_ID = 'config'; // Config de sesiones WAHA (se mantiene de la PoC)
export const IMPORT_LOGS_COLLECTION_ID = 'IMPORT_LOGS_COLLECTION_ID';

// === BUCKETS (Almacenamiento) ===
export const IMPORT_BUCKET_ID = '68d7cd3a0019edb5703b'; // (Mantenido de la PoC para CSV)
// Añadir buckets para Lipoout si es necesario (ej. fotos clientes, documentos)
// export const CLIENTES_BUCKET_ID = 'documentos_clientes';

// === COLECCIONES DEPRECADAS (de la PoC) ===
// Se reemplaza por CLIENTES_COLLECTION_ID ('clientes')
export const LEGACY_CLIENTS_COLLECTION_ID_DEPRECATED = 'clients';
