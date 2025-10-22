import { LipooutDocument } from './index';
// (Opcional) Añadir Recurso si se usa la colección 'recursos'
// import { Recurso } from './recurso.types';

export type EstadoCita = 'agendada' | 'confirmada' | 'realizada' | 'cancelada' | 'no_asistio';

// Tipo para LEER desde Appwrite (con relaciones pobladas)
export interface Cita extends LipooutDocument {
  fecha_hora_inicio: string; // ISO 8601 string
  fecha_hora_fin: string; // ISO 8601 string
  duracion_minutos: number; // Calculado

  // Relaciones (objetos completos cuando se leen de Appwrite)
  cliente: any; // Cliente completo poblado por Appwrite
  empleado: any; // Empleado completo poblado por Appwrite
  articulo: any; // Articulo completo poblado por Appwrite

  estado: EstadoCita;
  notas_internas?: string;
  notas_cliente?: string; // (Visible por el cliente si hay portal)
}

// Tipo para CREAR/ACTUALIZAR (solo IDs)
export interface CitaInput {
  fecha_hora_inicio: string; // ISO 8601 string
  fecha_hora_fin: string; // ISO 8601 string
  duracion_minutos: number; // Calculado

  // Solo IDs para crear/actualizar
  cliente_id: string;
  empleado_id: string;
  articulo_id: string;

  estado: EstadoCita;
  notas_internas?: string;
  notas_cliente?: string; // (Visible por el cliente si hay portal)
}
