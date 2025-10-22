import { z } from 'zod';
import { differenceInYears, parseISO } from 'date-fns';
import { Client } from "@/types"; // Asumiendo que Client es un tipo local

// ============================================
// HELPER FUNCTIONS (mejoradas de Migration)
// ============================================

export const calculateAge = (fecnac: string | Date | undefined): number | undefined => {
  if (!fecnac) return undefined;
  try {
    const birthDate = (typeof fecnac === 'string') ? parseISO(fecnac) : fecnac;
    const age = differenceInYears(new Date(), birthDate);
    return age < 0 ? undefined : age; // No permitir edades futuras
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

  // --- CORRECCIÓN DE LÓGICA ---
  // Alinear con la validación estricta del backend (6 dígitos)
  if (!clientData.codcli || !/^\d{6}$/.test(clientData.codcli)) {
    errors.codcli = 'El código de cliente es requerido y debe tener 6 dígitos.';
  }
  // --- FIN CORRECCIÓN ---

  if ((isStrict || clientData.nomcli) && !clientData.nomcli) {
    errors.nomcli = 'El nombre es requerido.';
  }

  if (clientData.email && !/\S+@\S+\.\S+/.test(clientData.email)) {
    errors.email = 'Email inválido.';
  } else if (isStrict && !clientData.email) {
    errors.email = 'Email requerido.';
  }
  
  // --- CORRECCIÓN DE LÓGICA ---
  // Aplicar la validación real de DNI/NIE
  if (isStrict && !clientData.dnicli) {
    errors.dnicli = 'DNI/NIE requerido.';
  } else if (clientData.dnicli && !validateDniNie(clientData.dnicli)) {
    errors.dnicli = 'DNI/NIE inválido (formato o letra incorrectos).';
  }
  // --- FIN CORRECCIÓN ---

  if ((isStrict || clientData.tel2cli) && !clientData.tel2cli) {
    errors.tel2cli = 'Teléfono móvil principal requerido.';
  // --- CORRECCIÓN DE LÓGICA ---
  // Aplicar la validación real de móvil
  } else if (clientData.tel2cli && !validateMobilePhone(clientData.tel2cli)) {
    errors.tel2cli = 'Teléfono principal inválido (debe empezar por 6 o 7 y tener 9 dígitos).';
  }
  // --- FIN CORRECCIÓN ---

  if (clientData.fecnac && calculateAge(clientData.fecnac) === undefined) {
      errors.fecnac = 'La fecha de nacimiento no es válida (no puede ser futura).';
  }

  return errors;
};

// ============================================
// ESQUEMAS ZOD LIPOOUT (nuevas funcionalidades de Migration)
// ============================================

// 1. Cliente
export const clienteSchema = z.object({
  // --- CORRECCIÓN ---
  // Alinear con las reglas estrictas del backend
  codcli: z.string()
    .min(1, "El código es obligatorio")
    .regex(/^\d{6}$/, "El código de cliente debe tener 6 dígitos numéricos."),
  // --- FIN CORRECCIÓN ---
  nomcli: z.string().min(1, "El nombre es obligatorio"),
  ape1cli: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  // --- CORRECCIÓN ---
  // Usar .refine para aplicar la validación de formato
  dnicli: z.string().optional().or(z.literal(''))
    .refine((val) => !val || validateDniNie(val), {
        message: "DNI/NIE inválido (formato o letra incorrectos)."
    }),
  // --- FIN CORRECCIÓN ---
  dircli: z.string().optional(),
  codposcli: z.string().optional(),
  pobcli: z.string().optional(),
  procli: z.string().optional(),
  tel1cli: z.string().optional(),
  // --- CORRECCIÓN ---
  // Usar .refine para aplicar la validación de formato
  tel2cli: z.string().optional().or(z.literal(''))
    .refine((val) => !val || validateMobilePhone(val), {
        message: "Teléfono principal inválido (debe empezar por 6 o 7 y tener 9 dígitos)."
    }),
  // --- FIN CORRECCIÓN ---
  fecnac: z.string().optional().nullable()
    .refine((val) => !val || calculateAge(val) !== undefined, {
        message: "La fecha de nacimiento no puede ser futura."
    }),
  sexo: z.enum(['H', 'M', 'Otro']).optional(),
  fecalta: z.string().optional().nullable(),
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
  // --- CORRECCIÓN (Añadido) ---
  // Añadir campo denormalizado para que el servicio de facturas no tenga que hacer N+1
  cliente_nombre: z.string().optional().nullable(),
  // --- FIN CORRECCIÓN ---
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