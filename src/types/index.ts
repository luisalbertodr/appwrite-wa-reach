import { Models } from 'appwrite';

// --- Tipos existentes de AGENDA ---
export * from './cliente.types';
export * from './empleado.types';
export * from './articulo.types';
export * from './familia.types';
export * from './cita.types';
export * from './factura.types';

// --- Tipos importados de MAIN (Marketing) ---

// Configuración de WAHA (ya existe en Agenda, pero la estandarizamos)
export interface WahaConfig extends Models.Document {
  apiUrl: string;
  apiKey?: string;
  session?: string;
}

// Plantillas de mensajes
export interface Template extends Models.Document {
  name: string;
  text: string;
  variables: string[];
}

// Campañas de marketing
export interface Campaign extends Models.Document {
  name: string;
  templateId: string;
  // Almacena los IDs de los clientes de la colección 'clientes'
  clientIds: string[]; 
  sendTime: string; // ISO string
  status: 'pending' | 'sent' | 'failed';
}

// Log de mensajes individuales
export interface MessageLog extends Models.Document {
  campaignId: string;
  // ID del cliente de la colección 'clientes'
  clientId: string; 
  phone: string;
  status: 'sent' | 'failed';
  timestamp: string; // ISO string
  error?: string;
  wahaMessageId?: string;
}

// Progreso de la campaña (para la UI)
export interface CampaignProgress extends Models.Document {
    campaignId: string;
    totalMessages: number;
    sentMessages: number;
    failedMessages: number;
    status: 'processing' | 'completed' | 'failed';
}

// Tipo genérico para evitar enviar metadatos de Appwrite
// (Ya existe en Agenda, solo nos aseguramos de que esté)
export type LipooutUserInput<T> = Omit<T, keyof Models.Document | '$id'>;

// Tipo para el documento de configuración de la clínica
// (Ya existe en Agenda)
export interface Configuracion extends Models.Document {
  nombreClinica: string;
  direccion: string;
  cif: string;
  emailContacto: string;
  telefonoContacto: string;
  serieFactura: string;
  seriePresupuesto: string;
  ultimoNumeroFactura: number;
  ultimoNumeroPresupuesto: number;
  tipoIvaPredeterminado: number;
}