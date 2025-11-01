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
  // (Opcional) Duración en minutos para servicios y bonos
  duracion?: number | null;

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
  // (Opcional) Duración en minutos para servicios y bonos
  duracion?: number | null;

  activo: boolean;
}

// Tipo para artículos programados dentro de una cita con su horario específico
export interface ArticuloEnCita {
  articulo_id: string;
  articulo_nombre: string;
  duracion: number; // Duración en minutos
  hora_inicio: string; // ISO 8601 string - hora de inicio dentro de la cita
  precio: number;
  cantidad: number; // Para productos o sesiones de bono usadas
  // NUEVO: Recursos asignados a este tratamiento
  sala_id?: string; // Una única sala por tratamiento
  equipamiento_ids?: string[]; // Múltiples equipos por tratamiento
}

// Tipo para tiempos no billables (descansos, reuniones, etc.)
export interface TiempoNoBillable {
  tipo: 'tiempo_no_billable';
  nombre: string; // Texto personalizable por el usuario
  duracion: number; // Duración en minutos
  hora_inicio: string; // ISO 8601 string
  sala_id?: string; // Sala ocupada durante este tiempo
  equipamiento_ids?: string[]; // Equipamiento ocupado durante este tiempo
}

// Tipo unión para items en una cita (puede ser tratamiento o tiempo no billable)
export type ItemCita = ArticuloEnCita | TiempoNoBillable;

// Type guard para distinguir entre tratamientos y tiempos no billables
export function esTiempoNoBillable(item: ItemCita): item is TiempoNoBillable {
  return 'tipo' in item && item.tipo === 'tiempo_no_billable';
}

export function esArticuloEnCita(item: ItemCita): item is ArticuloEnCita {
  return 'articulo_id' in item;
}
