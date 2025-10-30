import { Client, Databases, Account, Storage } from 'appwrite';

export const client = new Client();
export const storage = new Storage(client);

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_PUBLIC_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const account = new Account(client);

export const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
export const DATABASE_ID = '68d78cb20028fac621d4';
export const CLIENTS_COLLECTION_ID = 'clients';
export const CAMPAIGNS_COLLECTION_ID = 'campaigns';
export const TEMPLATES_COLLECTION_ID = 'templates';
export const CONFIG_COLLECTION_ID = 'config';
export const IMPORT_BUCKET_ID = '68d7cd3a0019edb5703b';
export const IMPORT_LOGS_COLLECTION_ID = 'IMPORT_LOGS_COLLECTION_ID';
export const MESSAGE_LOGS_COLLECTION_ID = 'message_logs';
// AÑADIDO: ID para la colección de progreso en tiempo real
export const CAMPAIGN_PROGRESS_COLLECTION_ID = 'campaign_progress';