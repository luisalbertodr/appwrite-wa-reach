export interface Client {
  $id?: string;
  nombre: string;
  edad: number;
  facturacion: number;
  intereses: string[];
  telefono: string;
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
  status: 'pending' | 'sent' | 'scheduled';
  audienceCount: number;
  createdAt: string;
}

export interface WahaConfig {
  $id?: string;
  apiUrl: string;
  apiKey: string;
}