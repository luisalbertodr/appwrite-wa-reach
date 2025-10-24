import { LipooutDocument } from './index';

export type TipoArticulo = 'producto' | 'servicio' | 'bono';

// Tipo para LEER desde Appwrite (con relaciones pobladas)
export interface Articulo extends LipooutDocument {
  nombre: string;
  descripcion?: string;
  precio: number;
  tipo: TipoArticulo;

  // Appwrite devuelve tanto el ID como el objeto poblado
  familia_id: string; // ID original almacenado en Appwrite
  familia: any; // Familia completa poblada manualmente en getArticulos

  // (Opcional) Campos para control de stock si 'tipo' es 'producto'
  stock?: number | null;
  // (Opcional) Campos para 'bono'
  sesiones_bono?: number | null;

  activo: boolean;
}

// Tipo para CREAR/ACTUALIZAR (solo IDs)
export interface ArticuloInput {
  nombre: string;
  descripcion?: string;
  precio: number;
  tipo: TipoArticulo;

  // Solo ID para crear/actualizar
  familia_id: string;

  // (Opcional) Campos para control de stock si 'tipo' es 'producto'
  stock?: number | null;
  // (Opcional) Campos para 'bono'
  sesiones_bono?: number | null;

  activo: boolean;
}
