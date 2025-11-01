import { LipooutDocument } from './index';

export interface Recurso extends LipooutDocument {
  nombre: string;
  descripcion?: string;
  tipo: TipoRecurso;
  activo: boolean;
  color?: string;
}

export type TipoRecurso = 'cabina' | 'equipos';
