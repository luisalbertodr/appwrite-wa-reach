import { Models } from 'appwrite';

// Interfaz base para todos los documentos de Lipoout
export interface LipooutDocument extends Models.Document {
  // Aquí podemos añadir campos comunes si los hubiera
}

// --- Tipos Core Lipoout ---
export * from './cliente.types';
export * from './articulo.types';
export * from './familia.types';
export * from './empleado.types'; // Añadido
export * from './cita.types'; // Añadido
// (Próximamente se añadirán: Factura, Proveedor, Recurso)


// --- Tipos Módulo WhatsApp (Migrados de la PoC) ---

export interface WhatsAppFunctionPayload {
  recipient: string;
  message: string;
  imageUrl?: string;
}

export interface WhatsAppFunctionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Template extends LipooutDocument {
  name: string;
  messages: string[];
  imageUrls: string[];
}

export interface Campaign extends LipooutDocument {
  name: string;
  templateId: string;
  filters?: {
    edadMin?: number;
    edadMax?: number;
    facturacionMin?: number;
    facturacionMax?: number;
    intereses?: string[];
  };
  scheduledDate?: string;
  scheduledTime?: string;
  selectedMessageIndex?: number;
  selectedImageIndex?: number;
  status: 'pending' | 'sent' | 'scheduled' | 'failed' | 'sending' | 'completed_with_errors';
  audienceCount: number;
  createdAt: string;
  startTime?: string;
  endTime?: string;
}

export interface WahaConfig extends LipooutDocument {
  apiUrl: string;
  apiKey?: string;
  session?: string;
  minDelayMs?: number; 
  maxDelayMs?: number; 
  batchSizeMin?: number;
  batchSizeMax?: number;
  batchDelayMsMin?: number;
  batchDelayMsMax?: number;
  adminPhoneNumbers?: string[];
  notificationInterval?: number;
  startTime?: string;
  endTime?: string;
}