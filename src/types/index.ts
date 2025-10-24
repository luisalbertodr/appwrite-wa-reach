import { Models } from 'appwrite';

// ============================================
// TIPOS WAHA / MARKETING (funcionalidad original de main)
// ============================================

export interface Client {
  $id?: string;
  codcli: string; 
  nomcli?: string;
  ape1cli?: string;
  nombre_completo?: string;
  email?: string;
  dnicli?: string; 
  dircli?: string;
  codposcli?: string;
  pobcli?: string;
  procli?: string;
  tel1cli?: string; 
  tel2cli?: string; 
  fecnac?: string;
  enviar?: 0 | 1; 
  sexo?: 'H' | 'M' | 'Otro';
  fecalta?: string; 
  edad?: number; 
  facturacion: number; 
  intereses?: string[]; 
  importErrors?: string[];
}

export interface WhatsAppFunctionPayload {
  recipient: string;
  message: string;
  imageUrl?: string;
}

export interface WhatsAppFunctionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface Template {
  $id?: string;
  name: string;
  messages: string[];
  imageUrls: string[];
}

export interface Campaign {
  $id?: string;
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

export interface WahaConfig {
  $id?: string;
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

export interface MessageLog {
  $id?: string;
  campaignId: string;
  clientId: string;
  clientName?: string;
  timestamp: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

export interface CampaignProgress extends Models.Document {
  currentClientName: string;
  currentClientPhone: string;
}

// ============================================
// TIPOS LIPOOUT (nuevas funcionalidades de Migration)
// ============================================

// Type alias para documentos de Lipoout con metadata de Appwrite
export type LipooutDocument = Models.Document;

// Helper type to remove Appwrite metadata for creation/update inputs
export type LipooutUserInput<T> = Omit<T, keyof Models.Document>;

// --- Tipos Core Lipoout ---
export * from './cliente.types';
export * from './articulo.types';
export * from './familia.types';
export * from './empleado.types';
export * from './cita.types';
export * from './factura.types';
export * from './configuracion.types';
export * from './recurso.types';
export * from './aparato.types';
export * from './proveedor.types';
