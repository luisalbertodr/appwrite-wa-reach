import { Models } from 'appwrite';

// Interfaz base para todos los documentos de Lipoout
export interface LipooutDocument extends Models.Document {
  // Aquí podemos añadir campos comunes si los hubiera
}

// Helper type to remove Appwrite metadata for creation/update inputs
// Adjusted the helper type to be more flexible
export type LipooutUserInput<T> = Omit<T, keyof Models.Document>;


// --- Tipos Core Lipoout ---
export * from './cliente.types'; // Verificado
export * from './articulo.types';
export * from './familia.types';
export * from './empleado.types';
export * from './cita.types';
export * from './factura.types'; // <-- Añadido
// (Próximamente se añadirán: Proveedor, Recurso)

// Exportar tipos Input específicos (Si se definen en los archivos correspondientes)
// export type { CitaInput } from './cita.types'; // Example if defined
// export type { ArticuloInput } from './articulo.types'; // Example if defined
// export type { CreateFacturaInput, UpdateFacturaInput } from './factura.types'; // Example if defined


// --- Tipos Módulo WhatsApp (Migrados de la PoC) ---

// Definimos MessageLog aquí
export interface MessageLog extends LipooutDocument { // Inherit from LipooutDocument
  clientId: string;
  clientName?: string;
  timestamp: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  campaignId?: string;
}


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
  createdAt: string; // Mantenido como string ISO
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

// --- Tipo Configuración Clínica (AÑADIDO) ---
export interface Configuracion extends LipooutDocument {
  nombreClinica?: string;
  direccion?: string;
  cif?: string;
  emailContacto?: string;
  telefonoContacto?: string;
  serieFactura?: string;
  seriePresupuesto?: string;
  ultimoNumeroFactura: number; // Campo requerido según el setup
  ultimoNumeroPresupuesto: number; // Campo requerido según el setup
  tipoIvaPredeterminado?: number;
}

// --- Tipo para Logs de Importación (AÑADIDO) ---
export interface ImportLog extends LipooutDocument {
  timestamp: string;
  filename: string;
  successfulImports: number;
  totalProcessed: number;
  errors?: string[];
  status: 'completed' | 'completed_with_errors' | 'failed';
}
