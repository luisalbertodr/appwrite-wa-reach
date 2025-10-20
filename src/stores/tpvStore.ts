import { create } from 'zustand';
import { Cliente, Articulo, LipooutUserInput } from '@/types'; // Importamos los tipos necesarios

// Definimos cómo será una línea en nuestro ticket/carrito
export interface LineaTicket {
  id: string; // ID único para la línea (podemos usar crypto.randomUUID())
  articulo: Articulo; // El artículo o servicio añadido
  cantidad: number;
  precioUnitario: number; // Podría diferir del precio base por descuentos, etc.
  descuentoPorcentaje: number; // Descuento aplicado a esta línea (0-100)
  importeTotal: number; // Calculado (cantidad * precioUnitario * (1 - descuento / 100))
}

// Definimos el estado del TPV
interface TpvState {
  clienteSeleccionado: Cliente | null;
  lineas: LineaTicket[];
  totalNeto: number; // Suma de importeTotal de las líneas (BASE IMPONIBLE)
  descuentoGlobalPorcentaje: number; // (NUEVO) Descuento global
  metodoPago: string; // (NUEVO) Ej: 'Efectivo', 'Tarjeta'
}

// Definimos las acciones que podemos realizar sobre el estado
interface TpvActions {
  seleccionarCliente: (cliente: Cliente | null) => void;
  limpiarCliente: () => void;
  agregarLinea: (articulo: Articulo, cantidad?: number) => void;
  eliminarLinea: (lineaId: string) => void;
  actualizarCantidadLinea: (lineaId: string, nuevaCantidad: number) => void;
  actualizarPrecioLinea: (lineaId: string, nuevoPrecio: number) => void;
  actualizarDescuentoLinea: (lineaId: string, nuevoDescuento: number) => void;
  setDescuentoGlobalPorcentaje: (descuento: number) => void; // (NUEVO)
  setMetodoPago: (metodo: string) => void; // (NUEVO)
  limpiarTicket: () => void;
}

// Función auxiliar para calcular el importe de una línea (Base imponible de línea)
const calcularImporteLinea = (linea: Omit<LineaTicket, 'importeTotal' | 'id'>): number => {
  const importeBase = linea.cantidad * linea.precioUnitario;
  const descuento = importeBase * (linea.descuentoPorcentaje / 100);
  return importeBase - descuento;
};

// Función auxiliar para calcular el total del ticket (Suma de bases imponibles)
const calcularTotalNeto = (lineas: LineaTicket[]): number => {
  return lineas.reduce((total, linea) => total + linea.importeTotal, 0);
};

// Creamos el store de Zustand
export const useTpvStore = create<TpvState & TpvActions>((set) => ({
  // Estado inicial
  clienteSeleccionado: null,
  lineas: [],
  totalNeto: 0,
  descuentoGlobalPorcentaje: 0,
  metodoPago: 'Efectivo', // Valor por defecto

  // --- Acciones ---
  seleccionarCliente: (cliente) => set({ clienteSeleccionado: cliente }),
  limpiarCliente: () => set({ clienteSeleccionado: null }),

  agregarLinea: (articulo, cantidad = 1) => set((state) => {
    // Verificar si el artículo ya está en el ticket
    const lineaExistente = state.lineas.find(l => l.articulo.$id === articulo.$id);

    if (lineaExistente) {
      // Si existe, actualizamos la cantidad
      const nuevasLineas = state.lineas.map(l => {
        if (l.id === lineaExistente.id) {
          const nuevaCantidad = l.cantidad + cantidad;
          const lineaActualizada = { ...l, cantidad: nuevaCantidad };
          return { ...lineaActualizada, importeTotal: calcularImporteLinea(lineaActualizada) };
        }
        return l;
      });
      return { lineas: nuevasLineas, totalNeto: calcularTotalNeto(nuevasLineas) };
    } else {
      // Si no existe, creamos una nueva línea
      const nuevaLinea: Omit<LineaTicket, 'importeTotal'> = {
        id: crypto.randomUUID(), // Generamos un ID único para la línea
        articulo: articulo,
        cantidad: cantidad,
        precioUnitario: articulo.precio, // Precio base inicial
        descuentoPorcentaje: 0, // Sin descuento inicial
      };
      const lineaCompleta: LineaTicket = {
        ...nuevaLinea,
        importeTotal: calcularImporteLinea(nuevaLinea),
      };
      const nuevasLineas = [...state.lineas, lineaCompleta];
      return { lineas: nuevasLineas, totalNeto: calcularTotalNeto(nuevasLineas) };
    }
  }),

  eliminarLinea: (lineaId) => set((state) => {
    const nuevasLineas = state.lineas.filter(l => l.id !== lineaId);
    return { lineas: nuevasLineas, totalNeto: calcularTotalNeto(nuevasLineas) };
  }),

  actualizarCantidadLinea: (lineaId, nuevaCantidad) => set((state) => {
    if (nuevaCantidad <= 0) { // Si la cantidad es 0 o menos, eliminamos la línea
      const nuevasLineas = state.lineas.filter(l => l.id !== lineaId);
      return { lineas: nuevasLineas, totalNeto: calcularTotalNeto(nuevasLineas) };
    }
    const nuevasLineas = state.lineas.map(l => {
      if (l.id === lineaId) {
        const lineaActualizada = { ...l, cantidad: nuevaCantidad };
        return { ...lineaActualizada, importeTotal: calcularImporteLinea(lineaActualizada) };
      }
      return l;
    });
    return { lineas: nuevasLineas, totalNeto: calcularTotalNeto(nuevasLineas) };
  }),

   actualizarPrecioLinea: (lineaId, nuevoPrecio) => set((state) => {
    const nuevasLineas = state.lineas.map(l => {
      if (l.id === lineaId) {
        const lineaActualizada = { ...l, precioUnitario: nuevoPrecio };
        return { ...lineaActualizada, importeTotal: calcularImporteLinea(lineaActualizada) };
      }
      return l;
    });
    return { lineas: nuevasLineas, totalNeto: calcularTotalNeto(nuevasLineas) };
  }),

   actualizarDescuentoLinea: (lineaId, nuevoDescuento) => set((state) => {
    const descuentoValido = Math.max(0, Math.min(100, nuevoDescuento)); // Asegurar 0-100
    const nuevasLineas = state.lineas.map(l => {
      if (l.id === lineaId) {
        const lineaActualizada = { ...l, descuentoPorcentaje: descuentoValido };
        return { ...lineaActualizada, importeTotal: calcularImporteLinea(lineaActualizada) };
      }
      return l;
    });
    return { lineas: nuevasLineas, totalNeto: calcularTotalNeto(nuevasLineas) };
  }),
  
  // (NUEVO)
  setDescuentoGlobalPorcentaje: (descuento) => set({ 
      descuentoGlobalPorcentaje: Math.max(0, Math.min(100, descuento)) 
  }),

  // (NUEVO)
  setMetodoPago: (metodo) => set({ metodoPago: metodo }),

  // (ACTUALIZADO)
  limpiarTicket: () => set({ 
      lineas: [], 
      totalNeto: 0, 
      clienteSeleccionado: null,
      descuentoGlobalPorcentaje: 0,
      metodoPago: 'Efectivo'
  }),
}));

// (Opcional) Exportar tipos para usarlos fácilmente en componentes
export type { TpvState, TpvActions };