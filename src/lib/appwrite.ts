import { Client, Databases, Account, Storage } from 'appwrite';

export const client = new Client();
export const storage = new Storage(client);

client
  .setEndpoint(import.meta.env.VITE_APP_ENDPOINT)
  .setProject(import.meta.env.VITE_APP_PROJECT_ID);

export const databases = new Databases(client);
export const account = new Account(client);

export const PROJECT_ID = import.meta.env.VITE_APP_PROJECT_ID;

// === IDS BASE DE DATOS ===
// Base de datos unificada Lipoout (incluye funcionalidad WAHA y gestión de clínica)
export const DATABASE_ID = '68b1d7530028045d94d3'; // Lipoout Database

// Colecciones consolidadas
export const CLIENTS_COLLECTION_ID = 'clientes';
export const CAMPAIGNS_COLLECTION_ID = 'campaigns';
export const TEMPLATES_COLLECTION_ID = 'templates';
export const CONFIG_COLLECTION_ID = 'configuracion';
export const WAHA_CONFIG_COLLECTION_ID = 'configuracion'; // Alias para claridad en funcionalidad WAHA
export const IMPORT_BUCKET_ID = 'lipoout';
export const IMPORT_LOGS_COLLECTION_ID = 'import_logs';
export const MESSAGE_LOGS_COLLECTION_ID = 'message_logs';
export const CAMPAIGN_PROGRESS_COLLECTION_ID = 'campaign_progress';

// Colecciones de gestión de clínica
export const CLIENTES_COLLECTION_ID = 'clientes';
export const EMPLEADOS_COLLECTION_ID = 'empleados';
export const ARTICULOS_COLLECTION_ID = 'articulos';
export const FAMILIAS_COLLECTION_ID = 'familias';
export const CITAS_COLLECTION_ID = 'citas';
export const FACTURAS_COLLECTION_ID = 'facturas';
export const CONFIGURATION_COLLECTION_ID = 'configuracion';
export const RECURSOS_COLLECTION_ID = 'recursos';
export const APARATOS_COLLECTION_ID = 'aparatos';
export const PROVEEDORES_COLLECTION_ID = 'proveedores';
