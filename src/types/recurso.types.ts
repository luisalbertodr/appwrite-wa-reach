import { LipooutDocument } from './index';

export interface Recurso extends LipooutDocument {
  nombre: string;
  descripcion?: string;
  tipo: TipoRecurso;
  activo: boolean;
}

export type TipoRecurso = 'sala' | 'camilla' | 'equipamiento' | 'otro';
