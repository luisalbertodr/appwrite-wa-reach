import { LipooutDocument } from './index';

export interface Aparato extends LipooutDocument {
  nombre: string;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  fecha_compra?: string;
  fecha_proximo_mantenimiento?: string;
  proveedor_id?: string;
  activo: boolean;
}
