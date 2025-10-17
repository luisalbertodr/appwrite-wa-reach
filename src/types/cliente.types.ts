import { LipooutDocument } from './index';

export interface Cliente extends LipooutDocument {
  codcli: string;
  nomcli?: string;
  ape1cli?: string;
  nombre_completo?: string;
  email?: string;
  dnicli?: string;
  dircli?: string;
  codposcli?: string;
  pobcli?: string;
  procli?: string;
  tel1cli?: string;
  tel2cli?: string;
  fecnac?: string; // Formato YYYY-MM-DD
  enviar?: 0 | 1;
  sexo?: 'H' | 'M' | 'Otro';
  fecalta?: string; // Formato YYYY-MM-DD
  edad?: number;
  facturacion: number;
  intereses?: string[];
  importErrors?: string[];
}