import { LipooutDocument } from './index';
// (Opcional) Añadir Recurso si se usa la colección 'recursos'
// import { Recurso } from './recurso.types';

export type EstadoCita = 'agendada' | 'confirmada' | 'realizada' | 'cancelada' | 'no_asistio';

// Tipo para LEER desde Appwrite (con relaciones pobladas)
export interface Cita extends LipooutDocument {
  fecha_hora: string; // ISO 8601 string - fecha y hora de inicio
  duracion: number; // Duración en minutos

  // IDs de las relaciones
  cliente_id: string;
  empleado_id: string;
  articulos: string; // JSON string con array de artículos
  
  // Recursos (campos opcionales según el esquema)
  recursos_cabina?: string;
  recursos_aparatos?: string;
  
  estado: EstadoCita;
  comentarios?: string;
  datos_clinicos?: string;
  precio_total: number;
}

// Tipo para CREAR/ACTUALIZAR (solo IDs)
export interface CitaInput {
  fecha_hora: string; // ISO 8601 string
  duracion: number; // Duración en minutos

  // Solo IDs para crear/actualizar
  cliente_id: string;
  empleado_id: string;
  articulos: string; // JSON string con array de artículos

  recursos_cabina?: string;
  recursos_aparatos?: string;

  estado: EstadoCita;
  comentarios?: string;
  datos_clinicos?: string;
  precio_total: number;
}
