import { LipooutDocument, LipooutUserInput } from './index';
import { Cliente } from './cliente.types';
import { Articulo } from './articulo.types';
import { Empleado } from './empleado.types'; // Para saber quién emite/realiza servicio
// import { Cita } from './cita.types'; // Descomentar si se vincula directamente a cita

export type EstadoFactura = 'borrador' | 'finalizada' | 'cobrada' | 'anulada' | 'presupuesto'; // Incluye presupuesto

// Definimos cómo será una línea dentro de la factura
// Similar a LineaTicket, pero puede tener más detalles (ej. impuestos)
export interface LineaFactura {
  id: string; // ID único interno para la línea (UUID)
  articulo?: Articulo; // Objeto completo (opcional, para visualización)
  articulo_id: string;
  descripcion: string; // Descripción en la factura (puede diferir del artículo base)
  cantidad: number;
  precioUnitario: number; // Precio sin impuestos
  tipoIva: number; // Ej: 21, 10, 4, 0
  ivaImporte: number; // Calculado (precioUnitario * cantidad * tipoIva / 100)
  descuentoPorcentaje: number; // Descuento de línea (0-100)
  totalSinIva: number; // Calculado (precioUnitario * cantidad * (1 - descuento/100))
  totalConIva: number; // Calculado (totalSinIva + ivaImporte)
}

export interface Factura extends LipooutDocument {
  numeroFactura: string; // Ej: "FRA2025-0001", "PRE2025-0010"
  fechaEmision: string; // ISO 8601 string (YYYY-MM-DD)
  fechaVencimiento?: string; // ISO 8601 string (YYYY-MM-DD)
  estado: EstadoFactura;

  // Relaciones (solo IDs, Appwrite no devuelve objetos anidados)
  cliente_id: string;
  empleado_id?: string;
  // cita_id?: string; // ID de la cita relacionada (opcional)

  // Líneas (Almacenado como JSON string en Appwrite)
  lineas: string; // JSON.stringify(LineaFactura[])

  // Totales Calculados
  baseImponible: number; // Suma de totalSinIva de las líneas
  totalIva: number; // Suma de ivaImporte de las líneas
  totalFactura: number; // Suma de totalConIva (o baseImponible + totalIva)
  descuentoGlobalPorcentaje?: number; // Descuento aplicado al total (0-100)
  importeDescuentoGlobal?: number; // Calculado
  totalAPagar: number; // Calculado (totalFactura - importeDescuentoGlobal)

  // Otros
  metodoPago?: string; // Ej: "Tarjeta", "Efectivo", "Transferencia"
  notas?: string;
  // Referencia a factura rectificada si es abono
  facturaRectificada_id?: string;
}

// Tipo para la creación/actualización (sin campos calculados ni anidados, líneas como string)
export interface FacturaInputData {
    numeroFactura: string;
    fechaEmision: string; // ISO 8601 string (YYYY-MM-DD)
    fechaVencimiento?: string; // ISO 8601 string (YYYY-MM-DD)
    estado: EstadoFactura;
    cliente_id: string;
    empleado_id?: string;
    // cita_id?: string;
    lineas: string; // JSON.stringify(LineaFactura[])
    baseImponible: number;
    totalIva: number;
    totalFactura: number;
    descuentoGlobalPorcentaje?: number;
    importeDescuentoGlobal?: number;
    totalAPagar: number;
    metodoPago?: string;
    notas?: string;
    facturaRectificada_id?: string;
}

export type CreateFacturaInput = LipooutUserInput<FacturaInputData>;
export type UpdateFacturaInput = Partial<CreateFacturaInput>;

// Tipo extendido para facturas con datos poblados (para visualización y PDF)
// Appwrite solo devuelve IDs, pero para el PDF y visualización necesitamos los objetos completos
export interface FacturaConDatos extends Omit<Factura, 'lineas'> {
  cliente?: Cliente; // Objeto cliente completo (populado manualmente)
  empleado?: Empleado; // Objeto empleado completo (opcional)
  lineas: LineaFactura[]; // Líneas parseadas como array (no string)
}
