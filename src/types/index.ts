export interface Client {
  $id?: string;
  codcli: string; // Client code, 6 digits, required
  nomcli?: string;
  ape1cli?: string;
  email?: string;
  dnicli?: string; // DNI/NIE
  dircli?: string;
  codposcli?: string;
  pobcli?: string;
  procli?: string; // Assuming procli is 'provincia' (province)
  tel1cli?: string; // Secondary phone, no notifications
  tel2cli?: string; // Primary phone, for notifications (must be mobile)
  fecnac?: string; // Date of birth (YYYY-MM-DD)
  enviar?: 0 | 1; // 1 for send notifications, 0 for not
  sexo?: 'H' | 'M' | 'Otro'; // H: Hombre, M: Mujer, Otro: Other
  fecalta?: string; // Date of registration (YYYY-MM-DD)
  edad?: number; // Calculated age
  facturacion: number; // Client's billing amount
  intereses?: string[]; // Client's interests as an array of strings
  importErrors?: string[]; // To store errors for display after import
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
  message: string;
}

export interface Campaign {
  $id?: string;
  name: string;
  templateId: string;
  filters: {
    edadMin?: number;
    edadMax?: number;
    facturacionMin?: number;
    facturacionMax?: number;
    intereses?: string[];
  };
  scheduledDate?: string;
  status: 'pending' | 'sent' | 'scheduled' | 'failed';
  audienceCount: number;
  createdAt: string;
}

export interface WahaConfig {
  $id?: string;
  apiUrl: string;
  apiKey: string; // API Key should not be exposed to the frontend
}
