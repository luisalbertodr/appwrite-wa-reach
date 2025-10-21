import { z } from 'zod';
import { differenceInYears, parseISO } from 'date-fns';

// --- Helper Functions ---

export const calculateAge = (fecnac: string | Date | undefined): number | undefined => {
  if (!fecnac) return undefined;
  try {
    const birthDate = (typeof fecnac === 'string') ? parseISO(fecnac) : fecnac;
    return differenceInYears(new Date(), birthDate);
  } catch (e) {
    return undefined;
  }
};

// --- Esquemas de Formulario ---

// 1. Cliente
export const clienteSchema = z.object({
  codcli: z.string().min(1, "El código es obligatorio").max(10, "Código demasiado largo"),
  nomcli: z.string().min(1, "El nombre es obligatorio"),
  ape1cli: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  dnicli: z.string().optional(),
  dircli: z.string().optional(),
  codposcli: z.string().optional(),
  pobcli: z.string().optional(),
  procli: z.string().optional(),
  tel1cli: z.string().optional(),
  tel2cli: z.string().optional(),
  fecnac: z.string().optional().nullable(), // Se envía como YYYY-MM-DD
  sexo: z.enum(['H', 'M', 'Otro']).optional(),
  fecalta: z.string().optional().nullable(), // Se envía como YYYY-MM-DD
  enviar: z.union([z.literal(0), z.literal(1)]).optional(),
  facturacion: z.number().optional(),
  intereses: z.array(z.string()).optional(),
});
export type ClienteFormData = z.infer<typeof clienteSchema>;


// 2. Empleado
export const empleadoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellidos: z.string().min(1, "Los apellidos son obligatorios"),
  email: z.string().email("Email inválido"),
  telefono: z.string().optional(),
  rol: z.enum(['Admin', 'Médico', 'Recepción', 'Lectura']),
  activo: z.boolean(),
});
export type EmpleadoFormData = z.infer<typeof empleadoSchema>;


// 3. Factura
export const lineaFacturaSchema = z.object({
  articulo_id: z.string().min(1, "Se requiere artículo").nullable(),
  descripcion: z.string().min(1, "Se requiere descripción"),
  cantidad: z.number().min(0.01, "Cantidad debe ser positiva"),
  precioUnitario: z.number().min(0, "Precio no puede ser negativo"),
  tipoIva: z.number().min(0, "IVA no puede ser negativo"),
  descuentoPorcentaje: z.number().min(0).max(100).optional(),
});
export type LineaFacturaFormData = z.infer<typeof lineaFacturaSchema>;

export const facturaSchema = z.object({
  fechaEmision: z.string().min(10, "Fecha de emisión obligatoria"), // YYYY-MM-DD
  fechaVencimiento: z.string().optional().nullable(),
  estado: z.enum(['borrador', 'finalizada', 'cobrada', 'anulada', 'presupuesto']),
  cliente_id: z.string().min(1, "Cliente obligatorio"),
  empleado_id: z.string().optional().nullable(),
  lineas: z.array(lineaFacturaSchema).min(1, "Se requiere al menos una línea"),
  descuentoGlobalPorcentaje: z.number().min(0).max(100).optional().nullable(),
  metodoPago: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});
export type FacturaFormData = z.infer<typeof facturaSchema>;


// 4. Artículo
export const articuloSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  precio: z.number().min(0, "El precio debe ser 0 o mayor"),
  tipo: z.enum(['producto', 'servicio', 'bono']),
  familia_id: z.string().min(1, "La familia es obligatoria"),
  stock: z.number().optional().nullable(),
  sesiones_bono: z.number().optional().nullable(),
  activo: z.boolean(),
});
export type ArticuloFormData = z.infer<typeof articuloSchema>;


// 5. Cita
export const citaSchema = z.object({
  fecha_hora_inicio: z.string().min(1, "Fecha y hora de inicio obligatorias"), // Se enviará como ISO string
  fecha_hora_fin: z.string().min(1, "Fecha y hora de fin obligatorias"), // Se enviará como ISO string
  cliente_id: z.string().min(1, "Cliente obligatorio"),
  empleado_id: z.string().min(1, "Empleado obligatorio"),
  articulo_id: z.string().min(1, "Tratamiento obligatorio"),
  estado: z.enum(['agendada', 'confirmada', 'realizada', 'cancelada', 'no_asistio']),
  notas_internas: z.string().optional(),
  notas_cliente: z.string().optional(),
});
export type CitaFormData = z.infer<typeof citaSchema>;

// 6. Familia
export const familiaSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    descripcion: z.string().optional().nullable(),
    icono: z.string().optional().nullable(),
});
export type FamiliaFormData = z.infer<typeof familiaSchema>;

// 7. Configuración Clínica (NUEVO)
export const configurationSchema = z.object({
  nombreClinica: z.string().min(1, "Nombre obligatorio"),
  direccion: z.string().optional(),
  cif: z.string().min(1, "CIF obligatorio"),
  emailContacto: z.string().email("Email inválido").optional().or(z.literal('')),
  telefonoContacto: z.string().optional(),
  serieFactura: z.string().min(1, "Prefijo obligatorio").max(5, "Máx 5 chars"),
  seriePresupuesto: z.string().min(1, "Prefijo obligatorio").max(5, "Máx 5 chars"),
  tipoIvaPredeterminado: z.number().min(0, "IVA no puede ser negativo").max(100),
  ultimoNumeroFactura: z.number().min(0).optional(),
  ultimoNumeroPresupuesto: z.number().min(0).optional(),
});
export type ConfigurationFormData = z.infer<typeof configurationSchema>;
