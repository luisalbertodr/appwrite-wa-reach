import { z } from 'zod';
import { TipoArticulo, RolEmpleado, EstadoFactura } from '@/types'; // Importar tipos necesarios

// --- Funciones auxiliares ---
export const calculateAge = (dob: string): number => { /* ... */ };
export const validateDniNie = (dni: string): boolean => { /* ... */ };
export const validateMobilePhone = (phone: string): boolean => { /* ... */ };

// --- Esquema Zod para Cliente ---
export const clienteSchema = z.object({ /* ... */ });
export type ClienteFormData = z.infer<typeof clienteSchema>;

// --- Esquema Zod para Artículo ---
export const articuloSchema = z.object({ /* ... */ });
export type ArticuloFormData = z.infer<typeof articuloSchema>;

// --- Esquema Zod para Empleado ---
//export const empleadoSchema = z.object({ /* ... */ });
//export type EmpleadoFormData = z.infer<typeof empleadoSchema>;

// --- NUEVO: Esquema Zod para Empleado ---
export const empleadoSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(255),
  apellidos: z.string().min(1, "Apellidos requeridos").max(255),
  email: z.string().email("Email inválido"), // Requerido para login? Asumimos que sí.
  telefono: z.string().max(20).optional(),
  rol: z.enum(['Admin', 'Médico', 'Recepción', 'Lectura'], { required_error: "Rol requerido" }),
  activo: z.boolean().default(true),
  // nombre_completo se calcula, no va en el form
});

// --- NUEVO: Esquema Zod para Línea de Factura ---
// (Usado internamente en el esquema de Factura)
const lineaFacturaSchema = z.object({
  // id: z.string().uuid(), // El ID interno no necesita validarse aquí
  articulo_id: z.string().min(1, "Artículo requerido"),
  descripcion: z.string().min(1, "Descripción requerida").max(255),
  cantidad: z.preprocess(
      (val) => parseInt(String(val), 10) || 1,
      z.number().int().min(1, "Mínimo 1")
  ),
  precioUnitario: z.preprocess(
      (val) => parseFloat(String(val).replace(',', '.')) || 0,
      z.number().min(0, "Precio >= 0")
  ),
  tipoIva: z.preprocess(
      (val) => parseFloat(String(val).replace(',', '.')) || 21, // IVA por defecto 21%
      z.number().min(0).max(100)
  ),
  descuentoPorcentaje: z.preprocess(
      (val) => parseFloat(String(val).replace(',', '.')) || 0,
      z.number().min(0).max(100, "Máximo 100%")
  ),
  // Campos calculados (ivaImporte, totalSinIva, totalConIva) no se validan en el input, se calculan al guardar/mostrar
});

// --- NUEVO: Esquema Zod para Factura (Input Data) ---
export const facturaSchema = z.object({
  // numeroFactura se genera/asigna fuera del form básico, no se valida aquí
  fechaEmision: z.string().min(1, "Fecha requerida"), // Podría ser z.date() si usamos date picker
  fechaVencimiento: z.string().optional().nullable(),
  estado: z.enum(['borrador', 'finalizada', 'cobrada', 'anulada', 'presupuesto'], { required_error: "Estado requerido" }),
  cliente_id: z.string().min(1, "Cliente requerido"),
  empleado_id: z.string().optional().nullable(),
  lineas: z.array(lineaFacturaSchema).min(1, "Añade al menos una línea"), // Array de líneas validado
  // Totales (baseImponible, totalIva, totalFactura, totalAPagar) se calculan, no se validan aquí directamente
  descuentoGlobalPorcentaje: z.preprocess(
      (val) => parseFloat(String(val).replace(',', '.')) || 0,
      z.number().min(0).max(100).optional()
  ).optional(),
  metodoPago: z.string().max(100).optional().nullable(),
  notas: z.string().max(4096).optional().nullable(),
  // facturaRectificada_id no se suele editar en el form principal
});

// Tipo TypeScript para el formulario
export type FacturaFormData = z.infer<typeof facturaSchema>;
// Tipo para las líneas dentro del formulario
export type LineaFacturaFormData = z.infer<typeof lineaFacturaSchema>;

export type EmpleadoFormData = z.infer<typeof empleadoSchema>;