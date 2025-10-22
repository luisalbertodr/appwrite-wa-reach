import { z } from 'zod';

// Esquema de Cita (Existente)
export const citaSchema = z.object({
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  hora: z.string().min(1, 'La hora es obligatoria.'),
  clienteId: z.string().min(1, 'El cliente es obligatorio.'),
  empleadoId: z.string().min(1, 'El empleado es obligatorio.'),
  servicios: z.array(z.string()).min(1, 'Debe seleccionar al menos un servicio.'),
  notas: z.string().optional(),
});

// Esquema de Cliente (Existente)
export const clienteSchema = z.object({
    codcli: z.string().optional(),
    nomcli: z.string().min(2, "El nombre es obligatorio."),
    ape1cli: z.string().optional(),
    dnicli: z.string().optional(),
    dircli: z.string().optional(),
    codposcli: z.string().optional(),
    pobcli: z.string().optional(),
    procli: z.string().optional(),
    tel1cli: z.string().optional(),
    tel2cli: z.string().optional(),
    email: z.string().email("Email inválido.").optional().or(z.literal("")),
    fecnac: z.date().optional(),
    sexo: z.string().optional(),
    fecalta: z.date().optional(),
    enviar: z.boolean().default(false),
    notas: z.string().optional(),
});

// Esquema de Configuración (Existente)
export const configurationSchema = z.object({
  nombreClinica: z.string().min(1, "El nombre es obligatorio."),
  cif: z.string().min(1, "El CIF es obligatorio."),
  direccion: z.string().optional(),
  emailContacto: z.string().email("Email inválido").optional().or(z.literal("")),
  telefonoContacto: z.string().optional(),
  serieFactura: z.string().min(1, "La serie de factura es obligatoria."),
  seriePresupuesto: z.string().min(1, "La serie de presupuesto es obligatoria."),
  tipoIvaPredeterminado: z.coerce.number().min(0, "El IVA debe ser positivo.").default(21),
});

// Esquema de Empleado (Existente)
export const empleadoSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio."),
  apellidos: z.string().optional(),
  email: z.string().email("Email inválido.").optional().or(z.literal("")),
  telefono: z.string().optional(),
  color: z.string().optional(),
  servicios: z.array(z.string()).optional(),
  notas: z.string().optional(),
});

// Esquema de Artículo/Servicio (Existente)
export const articuloSchema = z.object({
  codart: z.string().optional(),
  nomart: z.string().min(1, "El nombre es obligatorio."),
  precio: z.coerce.number().min(0, "El precio debe ser 0 o mayor."),
  tipoIva: z.coerce.number().min(0, "El IVA debe ser 0 o mayor.").default(21),
  familiaId: z.string().min(1, "La familia es obligatoria."),
  duracion: z.coerce.number().min(0, "La duración debe ser 0 o mayor.").default(30),
});

// Esquema de Familia (Existente)
export const familiaSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    color: z.string().optional(),
});

// --- Esquemas de MARKETING (Añadidos de 'main') ---

// Esquema de Plantilla
export const templateSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  text: z.string().min(1, 'El texto es obligatorio'),
  variables: z.array(z.string()).optional(),
});

// Esquema de Campaña
export const campaignSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  templateId: z.string().min(1, 'La plantilla es obligatoria'),
  clientIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un cliente'),
  sendTime: z.date({ required_error: 'La fecha y hora de envío son obligatorias' }),
  status: z.literal('pending').default('pending'),
});