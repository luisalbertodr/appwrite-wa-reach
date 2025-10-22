import { databases, DATABASE_ID, FACTURAS_COLLECTION_ID } from '@/lib/appwrite';
import { Factura, FacturaInputData, CreateFacturaInput, UpdateFacturaInput, Cliente } from '@/types';
import { ID, Query, Models } from 'appwrite';
import { getClientesByNombre } from '@/services/appwrite-clientes'; // Importar servicio de clientes

// --- API de Facturas ---

// Obtener facturas (MODIFICADO para aceptar filtros)
export const getFacturas = async (searchQuery?: string, estado?: string): Promise<(Factura & Models.Document)[]> => {
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
      const clienteIds = clientesCoincidentes.map((c: Cliente & Models.Document) => c.$id);

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

  const response = await databases.listDocuments<Factura & Models.Document>(
    DATABASE_ID,
    FACTURAS_COLLECTION_ID,
    queries
  );

  // Devolvemos directamente los documentos sin modificarlos
  // lineas ya es string en Appwrite, coincide con tipo Factura
  return response.documents;
};

// Crear una nueva factura
export const createFactura = (facturaInput: CreateFacturaInput) => {
  // lineas ya debe venir como string en facturaInput
  return databases.createDocument<Factura & Models.Document>(
    DATABASE_ID,
    FACTURAS_COLLECTION_ID,
    ID.unique(),
    facturaInput
  );
};

// Actualizar una factura existente
export const updateFactura = (id: string, facturaInput: UpdateFacturaInput) => {
  // lineas ya debe venir como string si se proporciona
  return databases.updateDocument<Factura & Models.Document>(
    DATABASE_ID,
    FACTURAS_COLLECTION_ID,
    id,
    facturaInput
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
