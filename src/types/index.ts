export interface Client {
  $id?: string;
  codcli: string; 
  nomcli?: string;
  ape1cli?: string;
  nombre_completo?: string; // <--- AÑADIDO
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
  data?: any;
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
  startTime?: string;
  endTime?: string;
  selectedMessageIndex?: number;
  selectedImageIndex?: number;
  status: 'pending' | 'sent' | 'scheduled' | 'failed';
  audienceCount: number;
  createdAt: string;
}

export interface WahaConfig {
  $id?: string;
  apiUrl: string;
  apiKey?: string;
  minDelayMs?: number; 
  maxDelayMs?: number; 
  batchSizeMin?: number;
  batchSizeMax?: number;
  batchDelayMsMin?: number;
  batchDelayMsMax?: number;
  adminPhoneNumbers?: string[];
  notificationInterval?: number;
}