import { LipooutDocument } from './index';

export interface Proveedor extends LipooutDocument {
  nombre: string;
  cif?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  codigo_postal?: string;
  provincia?: string;
  contacto?: string;
  activo: boolean;
}
