import { LipooutDocument } from './index';

export interface Familia extends LipooutDocument {
  nombre: string;
  descripcion?: string;
  // (Opcional) 'icono' o 'color' según se definió en la UI
  icono?: string; 
}