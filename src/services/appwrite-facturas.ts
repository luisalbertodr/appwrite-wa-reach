import { databases, DATABASE_ID, FACTURAS_COLLECTION_ID, CLIENTES_COLLECTION_ID } from '@/lib/appwrite'; // Importar CLIENTES_COLLECTION_ID
import { Factura, LineaFactura, FacturaInputData, CreateFacturaInput, UpdateFacturaInput, Cliente } from '@/types';
import { ID, Query, Models } from 'appwrite';
import { getClientesByNombre } from '@/services/appwrite-clientes'; // Importar servicio de clientes

// --- API de Facturas ---

const parseLineas = (lineasString?: string): LineaFactura[] => {
  if (!lineasString) return [];
  try {
    return JSON.parse(lineasString);
  } catch (e) {
    return [];
  }
};

// Obtener facturas (MODIFICADO para aceptar filtros y paginación, y corregir N+1)
export const getFacturas = async (
    searchQuery?: string, 
    estado?: string,
    limit: number = 25,
    offset: number = 0
): Promise<Models.DocumentList<Factura>> => { // --- CORRECCIÓN: Devolver DocumentList
  
  const queries = [
      Query.limit(limit),
      Query.offset(offset),
      Query.orderDesc('fechaEmision'),
      Query.orderDesc('numeroFactura')
    ];

  if (estado) {
     queries.push(Query.equal('estado', estado));
  }

  // MODIFICADO: Manejo de búsqueda
  if (searchQuery) {
      // 1. Buscar clientes que coincidan
      // Usamos limit 100 aquí, asumiendo que no habrá más de 100 clientes con el mismo nombre
      const clientesCoincidentes = await getClientesByNombre(searchQuery, 100, 0); 
      const clienteIds = clientesCoincidentes.documents.map((c: Cliente & Models.Document) => c.$id);

      // 2. Construir query de búsqueda
      const searchQueries = [
          Query.search('numeroFactura', searchQuery),
      ];
      
      if (clienteIds.length > 0) {
          searchQueries.push(Query.equal('cliente_id', clienteIds));
      }
      
      // Si hay búsqueda por nombre, también buscamos en el campo denormalizado
      searchQueries.push(Query.search('cliente_nombre', searchQuery));

      queries.push(Query.or(searchQueries));
  }


  const response = await databases.listDocuments<FacturaInputData & Models.Document>(
    DATABASE_ID,
    FACTURAS_COLLECTION_ID,
    queries
  );

  // --- CORRECCIÓN: Solución al problema N+1 ---
  
  // Si no hay facturas, devolver la respuesta vacía
  if (response.documents.length === 0) {
      return response as Models.DocumentList<Factura>;
  }

  // 1. Recopilar IDs de cliente únicos de las facturas obtenidas
  const clienteIds = [
      ...new Set(response.documents.map(doc => doc.cliente_id).filter(id => id))
  ] as string[];

  // 2. Hacer UNA sola consulta para obtener todos los clientes necesarios
  let clienteMap = new Map<string, Cliente & Models.Document>();
  if (clienteIds.length > 0) {
      const clientesResponse = await databases.listDocuments<Cliente & Models.Document>(
          DATABASE_ID,
          CLIENTES_COLLECTION_ID,
          [
              Query.equal('$id', clienteIds),
              Query.limit(clienteIds.length) // Asegurarse de traerlos todos
          ]
      );
      clienteMap = new Map(clientesResponse.documents.map((c) => [c.$id, c]));
  }

  // 3. Mapear las facturas y "poblar" el cliente desde el Map
  const facturasPobladas = response.documents.map((doc: FacturaInputData & Models.Document) => ({
      ...doc,
      lineas: parseLineas(doc.lineas),
      cliente: clienteMap.get(doc.cliente_id) || { 
          $id: doc.cliente_id, 
          nombre_completo: doc.cliente_nombre || 'Cliente no encontrado' 
      } as any,
      empleado: doc.empleado_id ? { $id: doc.empleado_id } as any : undefined,
  } as Factura ));
  
  // Devolver el objeto DocumentList con los documentos mapeados
  return {
      total: response.total,
      documents: facturasPobladas
  };
  // --- FIN CORRECCIÓN ---
};

// Crear una nueva factura
export const createFactura = (facturaInput: CreateFacturaInput) => {
  const facturaToSave = {
      ...facturaInput,
      lineas: typeof facturaInput.lineas === 'string' ? facturaInput.lineas : JSON.stringify(facturaInput.lineas || []),
      // Asegurarse de que el nombre denormalizado se guarda (el frontend debe proporcionarlo)
      cliente_nombre: facturaInput.cliente_nombre || undefined 
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
  
  // Asegurarse de que el nombre denormalizado se actualiza si cambia el cliente
  if (facturaToUpdate.cliente_id && facturaToUpdate.cliente_nombre) {
      facturaToUpdate.cliente_nombre = facturaToUpdate.cliente_nombre;
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