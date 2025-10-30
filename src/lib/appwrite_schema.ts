import { client, databases, DATABASE_ID, CLIENTS_COLLECTION_ID, CAMPAIGNS_COLLECTION_ID, TEMPLATES_COLLECTION_ID, CONFIG_COLLECTION_ID, IMPORT_LOGS_COLLECTION_ID, MESSAGE_LOGS_COLLECTION_ID, CAMPAIGN_PROGRESS_COLLECTION_ID } from './appwrite';
import { ID, Permission, Role } from 'appwrite';
import { toast } from '@/hooks/use-toast';

// Define la estructura de la base de datos
const schema = {
  databaseId: DATABASE_ID,
  collections: [
    {
      id: CLIENTS_COLLECTION_ID,
      name: 'clients',
      permissions: [
        Permission.create(Role.any()),
        Permission.read(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
      attributes: [
        // NOTE: These attributes are for manual configuration in Appwrite Console or via Appwrite CLI/Functions.
        // Direct schema modification from the frontend is not supported.
        { key: 'codcli', type: 'string', size: 6, required: true, unique: true },
        { key: 'nomcli', type: 'string', size: 255, required: true },
        { key: 'ape1cli', type: 'string', size: 255, required: true },
        { key: 'email', type: 'string', size: 255, required: true, email: true },
        { key: 'dnicli', type: 'string', size: 255, required: true },
        { key: 'dircli', type: 'string', size: 255, required: true },
        { key: 'codposcli', type: 'string', size: 10, required: true },
        { key: 'pobcli', type: 'string', size: 255, required: true },
        { key: 'procli', type: 'string', size: 255, required: true },
        { key: 'tel1cli', type: 'string', size: 255, required: false },
        { key: 'tel2cli', type: 'string', size: 255, required: true },
        { key: 'fecnac', type: 'datetime', required: true },
        { key: 'enviar', type: 'integer', required: true }, // 0 or 1
        { key: 'sexo', type: 'string', size: 50, required: true }, // Enum: H, M, Otro
        { key: 'fecalta', type: 'datetime', required: true },
        { key: 'edad', type: 'integer', required: false }, // Calculated, not stored directly in Appwrite schema
        { key: 'nombre_completo', type: 'string', size: 512, required: false }, // Concatenación de nomcli y ape1cli
      ],
    },
    {
      id: TEMPLATES_COLLECTION_ID,
      name: 'templates',
      permissions: [
        Permission.create(Role.any()),
        Permission.read(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
      attributes: [
        { key: 'name', type: 'string', size: 255, required: true },
        { key: 'message', type: 'string', size: 10000, required: true },
      ],
    },
    {
      id: CAMPAIGNS_COLLECTION_ID,
      name: 'campaigns',
      permissions: [
        Permission.create(Role.any()),
        Permission.read(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
      attributes: [
        { key: 'name', type: 'string', size: 255, required: true },
        { key: 'templateId', type: 'string', size: 255, required: true },
        { key: 'filters', type: 'string', size: 10000, required: false }, // JSON como string
        { key: 'scheduledDate', type: 'datetime', required: false },
        { key: 'status', type: 'string', size: 50, required: true },
        { key: 'audienceCount', type: 'integer', required: true },
        { key: 'createdAt', type: 'datetime', required: true },
      ],
    },
    {
      id: CONFIG_COLLECTION_ID,
      name: 'config',
      permissions: [
        Permission.create(Role.any()),
        Permission.read(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
      attributes: [
        { key: 'apiUrl', type: 'string', size: 255, required: true },
        // { key: 'apiKey', type: 'string', size: 1024, required: true }, // API Key is handled securely on the backend
      ],
    },
    {
      id: IMPORT_LOGS_COLLECTION_ID,
      name: IMPORT_LOGS_COLLECTION_ID,
      permissions: [
        Permission.read(Role.any()), // Frontend needs to read logs
      ],
      attributes: [
        { key: 'timestamp', type: 'datetime', required: true },
        { key: 'fileName', type: 'string', size: 255, required: true },
        { key: 'successfulImports', type: 'integer', required: true },
        { key: 'totalProcessed', type: 'integer', required: true },
        { key: 'errors', type: 'string', array: true, size: 2000, required: false }, // Store errors as string array
        { key: 'status', type: 'string', size: 50, required: true }, // Enum: completed, completed_with_errors, failed
      ],
    },
    {
      id: MESSAGE_LOGS_COLLECTION_ID,
      name: 'message_logs',
      permissions: [
        Permission.create(Role.any()),
        Permission.read(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
      attributes: [
        { key: 'campaignId', type: 'string', size: 255, required: true },
        { key: 'clientId', type: 'string', size: 255, required: true },
        { key: 'clientName', type: 'string', size: 512, required: false },
        { key: 'status', type: 'string', size: 50, required: true }, // Enum: sent, failed, skipped
        { key: 'timestamp', type: 'datetime', required: true },
        { key: 'error', type: 'string', size: 2000, required: false },
      ],
    },
    {
      id: CAMPAIGN_PROGRESS_COLLECTION_ID,
      name: 'campaign_progress',
      permissions: [
        Permission.create(Role.any()),
        Permission.read(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
      attributes: [
        { key: 'currentClientName', type: 'string', size: 255, required: false },
        { key: 'currentClientPhone', type: 'string', size: 255, required: false },
      ],
    },
  ],
};

// Función para crear un atributo si no existe (no se usará directamente desde el frontend para la creación de esquema)
const createAttributeIfNotExists = async (collectionId: string, attribute: any) => {
  console.warn(`Intento de crear atributo '${attribute.key}' en '${collectionId}' desde el frontend. Esta operación no es compatible.`);
  // Aquí se podría añadir lógica para llamar a una Appwrite Function si fuera necesario
};

// Función principal para configurar la base de datos (ahora solo informativa)
export const setupAppwrite = async () => {
  toast({ 
    title: 'Configuración de Appwrite (solo informativa)', 
    description: 'La creación de bases de datos, colecciones y atributos no es compatible directamente desde el frontend. Por favor, usa el CLI de Appwrite, la consola o una Appwrite Function para configurar el esquema.',
    variant: 'destructive',
    duration: 8000
  });
  console.warn('La función setupAppwrite se ha modificado para no realizar operaciones de creación de esquema desde el frontend.');
};
