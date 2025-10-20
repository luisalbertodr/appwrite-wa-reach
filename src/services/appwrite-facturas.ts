import { databases, DATABASE_ID, FACTURAS_COLLECTION_ID } from '@/lib/appwrite';
import { Factura, LineaFactura, FacturaInputData, CreateFacturaInput, UpdateFacturaInput } from '@/types';
import { ID, Query, Models } from 'appwrite';
import { getClientesByNombre } from './appwrite-clientes'; // Importar servicio de clientes

// --- API de Facturas ---

const parseLineas = (lineasString?: string): LineaFactura[] => { /* ... sin cambios ... */ };

// Obtener facturas (MODIFICADO para aceptar filtros)
export const getFacturas = async (searchQuery?: string, estado?: string): Promise<Factura[]> => {
  const queries = [
      Query.limit(100),
      Query.orderDesc('fechaEmision'),
      Query.orderDesc('numeroFactura')
    ];

  if (estado) {
     queries.push(Query.equal('estado', estado));
  }

  // MODIFICADO: Manejo de búsqueda
  if (searchQuery) {
      // 1. Buscar clientes que coincidan
      const clientesCoincidentes = await getClientesByNombre(searchQuery);
      const clienteIds = clientesCoincidentes.map(c => c.$id);

      // 2. Construir query de búsqueda
      // Buscamos por:
      // - Coincidencia de número de factura O
      // - Coincidencia de cliente_id (si encontramos clientes)
      const searchQueries = [
          Query.search('numeroFactura', searchQuery),
      ];
      
      if (clienteIds.length > 0) {
          searchQueries.push(Query.equal('cliente_id', clienteIds));
      }

      queries.push(Query.or(searchQueries));
  }


  const response = await databases.listDocuments<FacturaInputData & Models.Document>(
    DATABASE_ID,
    FACTURAS_COLLECTION_ID,
    queries
  );

  // --- Workaround para poblar Clientes (Ineficiente, pero necesario) ---
  // Idealmente, cachearíamos clientes en el frontend
  // O haríamos una query separada solo por los IDs necesarios
  const todosLosClientes = await getClientesByNombre(''); // Obtener todos
  const clienteMap = new Map(todosLosClientes.map(c => [c.$id, c]));

  return response.documents.map(doc => ({
      ...doc,
      lineas: parseLineas(doc.lineas),
      // "Poblamos" el cliente
      cliente: clienteMap.get(doc.cliente_id) || { $id: doc.cliente_id, nombre_completo: 'Cliente no encontrado' } as any,
      empleado: doc.empleado_id ? { $id: doc.empleado_id } as any : undefined,
  } as Factura ));
};

// Crear una nueva factura
export const createFactura = (facturaInput: CreateFacturaInput) => {
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