import { Client, Databases, Account } from 'appwrite';

const client = new Client();

client
  .setEndpoint('https://appwrite.lipoout.com/v1')
  .setProject('68d6d4060020e39899f6');

export const databases = new Databases(client);
export const account = new Account(client);

export const DATABASE_ID = '68d6d4060020e39899f6';
export const CLIENTS_COLLECTION_ID = 'clients';
export const CAMPAIGNS_COLLECTION_ID = 'campaigns';
export const TEMPLATES_COLLECTION_ID = 'templates';
export const CONFIG_COLLECTION_ID = 'config';

export { client };