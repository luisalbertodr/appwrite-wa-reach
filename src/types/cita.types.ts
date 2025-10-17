import { LipooutDocument } from './index';
import { Cliente } from './cliente.types';
import { Empleado } from './empleado.types';
import { Articulo } from './articulo.types';
// (Opcional) Añadir Recurso si se usa la colección 'recursos'
// import { Recurso } from './recurso.types';

export type EstadoCita = 'agendada' | 'confirmada' | 'realizada' | 'cancelada' | 'no_asistio';

export interface Cita extends LipooutDocument {
  fecha_hora_inicio: string; // ISO 8601 string
  fecha_hora_fin: string; // ISO 8601 string
  duracion_minutos: number; // Calculado
  
  // Relaciones
  cliente: Cliente; // Objeto anidado
  cliente_id: string;
  empleado: Empleado; // Objeto anidado
  empleado_id: string;
  articulo: Articulo; // Objeto anidado (¿o lista de artículos?)
  articulo_id: string;
  // recurso?: Recurso; // Objeto anidado (cabina, máquina)
  // recurso_id?: string;

  estado: EstadoCita;
  notas_internas?: string;
  notas_cliente?: string; // (Visible por el cliente si hay portal)
}