import { LipooutDocument } from './index';
import { Familia } from './familia.types';

export type TipoArticulo = 'producto' | 'servicio' | 'bono';

export interface Articulo extends LipooutDocument {
  nombre: string;
  descripcion?: string;
  precio: number;
  tipo: TipoArticulo;
  
  // Relación con Familias
  familia: Familia; // (Asumimos objeto anidado por Appwrite)
  familia_id: string; // (ID para la relación)

  // (Opcional) Campos para control de stock si 'tipo' es 'producto'
  stock?: number;
  // (Opcional) Campos para 'bono'
  sesiones_bono?: number;

  activo: boolean;
}