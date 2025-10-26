import { z } from 'zod';
import { differenceInYears, parseISO } from 'date-fns';
import { Client } from "@/types";

// ============================================
// HELPER FUNCTIONS (mejoradas de Migration)
// ============================================

export const calculateAge = (fecnac: string | Date | undefined): number | undefined => {
  if (!fecnac) return undefined;
  try {
    const birthDate = (typeof fecnac === 'string') ? parseISO(fecnac) : fecnac;
    return differenceInYears(new Date(), birthDate);
  } catch (e) {
    return undefined;
  }
};

// ============================================
// VALIDACIONES WAHA / MARKETING (funcionalidad original de main)
// ============================================

export const validateDniNie = (dni: string) => {
  if (!dni) return false;
  dni = dni.toUpperCase().trim();
  const dniRegex = /^(\d{8})([A-Z])$/;
  const nieRegex = /^[XYZ]\d{7}[A-Z]$/;
  const letterMap = 'TRWAGMYFPDXBNJZSQVHLCKE';

  if (dniRegex.test(dni)) {
      const [, num, letter] = dni.match(dniRegex)!;
      const expectedLetter = letterMap[parseInt(num) % 23];
      return letter === expectedLetter;
  } else if (nieRegex.test(dni)) { 
      const niePrefix = dni.charAt(0);
      const nieNum = (niePrefix === 'X' ? '0' : niePrefix === 'Y' ? '1' : '2') + dni.substring(1, 8);
      const letter = dni.charAt(8);
      const expectedLetter = letterMap[parseInt(nieNum) % 23];
      return letter === expectedLetter;
  }
  return false;
};

export const validateMobilePhone = (phone: string) => {
  if (!phone) return false;
  const mobileRegex = /^[67]\d{8}$/; 
  return mobileRegex.test(phone);
};

export const validateClient = (clientData: Partial<Client>, isStrict = true): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!clientData.codcli || !/^\d{6}$/.test(clientData.codcli)) {
    errors.codcli = 'El código de cliente es requerido y debe tener 6 dígitos.';
  }

  if ((isStrict || clientData.nomcli) && !clientData.nomcli) {
    errors.nomcli = 'El nombre es requerido.';
  }

  if (clientData.email && !/\S+@\S+\.\S+/.test(clientData.email)) {
    errors.email = 'Email inválido.';
  } else if (isStrict && !clientData.email) {
    errors.email = 'Email requerido.';
  }
  
  if (clientData.dnicli && !validateDniNie(clientData.dnicli)) {
    errors.dnicli = 'DNI/NIE inválido.';
  } else if (isStrict && !clientData.dnicli) {
    errors.dnicli = 'DNI/NIE requerido.';
  }

  if ((isStrict || clientData.tel2cli) && !clientData.tel2cli) {
    errors.tel2cli = 'Teléfono móvil principal requerido.';
  } else if (clientData.tel2cli && !validateMobilePhone(clientData.tel2cli)) {
    errors.tel2cli = 'Teléfono principal inválido (debe empezar por 6 o 7 y tener 9 dígitos).';
  }

  if (clientData.fecnac && calculateAge(clientData.fecnac) === undefined) {
      errors.fecnac = 'La fecha de nacimiento no es válida.';
  }

  return errors;
};

// ============================================
// ESQUEMAS ZOD LIPOOUT (nuevas funcionalidades de Migration)
// ============================================

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
  duracion: z.number().min(0, "La duración debe ser 0 o mayor").max(500, "Duración máxima 500 minutos").optional().nullable(),
  stock: z.number().optional().nullable(),
  sesiones_bono: z.number().optional().nullable(),
  activo: z.boolean(),
});
export type ArticuloFormData = z.infer<typeof articuloSchema>;


// 5. Cita
export const citaSchema = z.object({
  fecha_hora: z.string().min(1, "Fecha y hora obligatorias"), // Se enviará como ISO string
  duracion: z.number().min(1, "Duración obligatoria"),
  cliente_id: z.string().min(1, "Cliente obligatorio"),
  empleado_id: z.string().min(1, "Empleado obligatorio"),
  articulos: z.string().min(1, "Artículos/Servicios obligatorios"), // JSON string
  recursos_cabina: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  recursos_aparatos: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  estado: z.enum(['agendada', 'confirmada', 'realizada', 'cancelada', 'no_asistio']),
  comentarios: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  datos_clinicos: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  precio_total: z.number().min(0, "Precio total obligatorio"),
});
export type CitaFormData = z.infer<typeof citaSchema>;

// 6. Familia
export const familiaSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    descripcion: z.string().optional().nullable(),
    icono: z.string().optional().nullable(),
});
export type FamiliaFormData = z.infer<typeof familiaSchema>;

// 7. Configuración Clínica
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

// 8. Recurso
export const recursoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  tipo: z.enum(['sala', 'camilla', 'equipamiento', 'otro']),
  activo: z.boolean(),
});
export type RecursoFormData = z.infer<typeof recursoSchema>;

// 9. Aparato
export const aparatoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  numero_serie: z.string().optional(),
  fecha_compra: z.string().optional(),
  fecha_proximo_mantenimiento: z.string().optional(),
  proveedor_id: z.string().optional(),
  activo: z.boolean(),
});
export type AparatoFormData = z.infer<typeof aparatoSchema>;

// 10. Proveedor
export const proveedorSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  cif: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  codigo_postal: z.string().optional(),
  provincia: z.string().optional(),
  contacto: z.string().optional(),
  activo: z.boolean(),
});
export type ProveedorFormData = z.infer<typeof proveedorSchema>;
