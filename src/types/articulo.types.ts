import { LipooutDocument } from './index';

export type TipoArticulo = 'producto' | 'servicio' | 'bono';

// Tipo para LEER desde Appwrite (con relaciones pobladas)
export interface Articulo extends LipooutDocument {
  nombre: string;
  descripcion?: string;
  precio: number;
  tipo: TipoArticulo;

  // Relación con Familias (objeto completo cuando se lee de Appwrite)
  familia: any; // Familia completa poblada por Appwrite

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
