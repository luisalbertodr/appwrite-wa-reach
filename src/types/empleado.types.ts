import { LipooutDocument } from './index';

export type RolEmpleado = 'Admin' | 'Médico' | 'Recepción' | 'Lectura'; // Basado en Planning 2.md

export interface Empleado extends LipooutDocument {
  nombre: string;
  apellidos: string;
  nombre_completo: string; // Generado automáticamente
  email: string; // Usado para login?
  telefono?: string;
  rol: RolEmpleado;
  activo: boolean;
  // (Opcional) Campos para horarios
  // horario_lun?: string; // ej. "09:00-13:00,15:00-19:00"
  // horario_mar?: string;
  // ...
}