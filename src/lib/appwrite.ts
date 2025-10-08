import { Client, Databases, Account, Storage } from 'appwrite'; // Import Storage

export const client = new Client();
export const storage = new Storage(client); // Initialize Storage service

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
export const IMPORT_BUCKET_ID = '68d7cd3a0019edb5703b'; // New: Appwrite Storage Bucket ID for CSV imports
export const IMPORT_LOGS_COLLECTION_ID = 'IMPORT_LOGS_COLLECTION_ID'; // New: Collection to store import results
export const MESSAGE_LOGS_COLLECTION_ID = 'message_logs';