import { databases, DATABASE_ID, FACTURAS_COLLECTION_ID } from '@/lib/appwrite';
import { Factura, LineaFactura, FacturaInputData, CreateFacturaInput, UpdateFacturaInput } from '@/types'; // Importamos tipos necesarios
import { ID, Query, Models } from 'appwrite';

// --- API de Facturas ---

// Helper para parsear líneas (con manejo de errores)
const parseLineas = (lineasString?: string): LineaFactura[] => {
  if (!lineasString) return [];
  try {
    const lineas = JSON.parse(lineasString);
    return Array.isArray(lineas) ? lineas : [];
  } catch (error) {
    console.error("Error parsing lineas JSON:", error);
    return []; // Devuelve array vacío si hay error
  }
};

// Obtener facturas (con opción de filtrar por cliente o estado)
export const getFacturas = async (clienteId?: string, estado?: string): Promise<Factura[]> => {
  const queries = [
      Query.limit(100), // Ajustar límite según sea necesario
      Query.orderDesc('fechaEmision'), // Ordenar por fecha más reciente
      Query.orderDesc('numeroFactura') // Segundo criterio de orden
    ];

  if (clienteId) {
    queries.push(Query.equal('cliente_id', clienteId));
  }
  if (estado) {
     queries.push(Query.equal('estado', estado));
  }

  const response = await databases.listDocuments<FacturaInputData & Models.Document>( // Usamos el tipo de Appwrite
    DATABASE_ID,
    FACTURAS_COLLECTION_ID,
    queries
  );

  // Mapeamos para parsear las líneas y añadir objetos anidados (si es necesario y posible)
  // Nota: Obtener cliente/empleado anidado requeriría queries adicionales o configuración de relaciones en Appwrite
  return response.documents.map(doc => ({
      ...doc,
      lineas: parseLineas(doc.lineas), // Parseamos el JSON string
      // Añadimos placeholders para objetos anidados si no los traemos directamente
      cliente: { $id: doc.cliente_id } as any, // Placeholder simple
      empleado: doc.empleado_id ? { $id: doc.empleado_id } as any : undefined, // Placeholder simple
  } as Factura )); // Hacemos cast al tipo Factura completo
};

// Crear una nueva factura
export const createFactura = (facturaInput: CreateFacturaInput) => {
  // Aseguramos que 'lineas' sea un string JSON válido
  const facturaToSave = {
      ...facturaInput,
      lineas: typeof facturaInput.lineas === 'string' ? facturaInput.lineas : JSON.stringify(facturaInput.lineas || []),
  };

  return databases.createDocument<FacturaInputData & Models.Document>(
    DATABASE_ID,
    FACTURAS_COLLECTION_ID,
    ID.unique(),
    facturaToSave
  );
};

// Actualizar una factura existente
export const updateFactura = (id: string, facturaInput: UpdateFacturaInput) => {
   // Aseguramos que 'lineas' sea un string JSON válido si se actualiza
  const facturaToUpdate = { ...facturaInput };
  if (facturaToUpdate.lineas && typeof facturaToUpdate.lineas !== 'string') {
      facturaToUpdate.lineas = JSON.stringify(facturaToUpdate.lineas);
  }

  return databases.updateDocument<FacturaInputData & Models.Document>(
    DATABASE_ID,
    FACTURAS_COLLECTION_ID,
    id,
    facturaToUpdate
  );
};

// Eliminar una factura
export const deleteFactura = (id: string) => {
  return databases.deleteDocument(
    DATABASE_ID,
    FACTURAS_COLLECTION_ID,
    id
  );
};