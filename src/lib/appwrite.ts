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
// Base de datos de WhatsApp/Marketing (funcionalidad original de main)
export const DATABASE_ID_WAHA = '68d78cb20028fac621d4';
export const CLIENTS_COLLECTION_ID = 'clients';
export const CAMPAIGNS_COLLECTION_ID = 'campaigns';
export const TEMPLATES_COLLECTION_ID = 'templates';
export const CONFIG_COLLECTION_ID = 'config';
export const WAHA_CONFIG_COLLECTION_ID = 'config'; // Alias para claridad en funcionalidad WAHA
export const IMPORT_BUCKET_ID = '68d7cd3a0019edb5703b';
export const IMPORT_LOGS_COLLECTION_ID = 'IMPORT_LOGS_COLLECTION_ID';
export const MESSAGE_LOGS_COLLECTION_ID = 'message_logs';
export const CAMPAIGN_PROGRESS_COLLECTION_ID = 'campaign_progress';

// Base de datos del proyecto Lipoout (nuevas funcionalidades)
export const DATABASE_ID = '68b1d7530028045d94d3'; // Lipoout Database

// Colecciones de Lipoout
export const CLIENTES_COLLECTION_ID = 'clientes';
export const EMPLEADOS_COLLECTION_ID = 'empleados';
export const ARTICULOS_COLLECTION_ID = 'articulos';
export const FAMILIAS_COLLECTION_ID = 'familias';
export const CITAS_COLLECTION_ID = 'citas';
export const FACTURAS_COLLECTION_ID = 'facturas';
export const LINEAS_FACTURA_COLLECTION_ID = 'lineas_factura';
export const CONFIGURATION_COLLECTION_ID = 'configuration';
