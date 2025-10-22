import { databases, DATABASE_ID, CLIENTES_COLLECTION_ID } from '@/lib/appwrite';
import { Cliente, LipooutUserInput } from '@/types';
import { ID, Query, Models } from 'appwrite';

// Tipo Input (usado por hooks)
export type CreateClienteInput = LipooutUserInput<Cliente>;
export type UpdateClienteInput = Partial<CreateClienteInput>;

// --- Funciones de Servicio (Usadas por hooks y otros servicios) ---

// OBTENER Clientes (con búsqueda y paginación)
export const getClientesByNombre = async (
    searchQuery: string = "",
    limit: number = 25, // Valor por defecto
    offset: number = 0 // Valor por defecto
): Promise<Models.DocumentList<Cliente & Models.Document>> => { // --- CORRECCIÓN: Devolver DocumentList
    
    const queries = [
        Query.limit(limit), // --- CORRECCIÓN: Usar paginación
        Query.offset(offset), // --- CORRECCIÓN: Usar paginación
        Query.orderDesc('$createdAt') // Añadir un orden por defecto
    ]; 
    
    if (searchQuery) {
        // Asumimos que 'nombre_completo' tiene un índice Fulltext
        queries.push(Query.search('nombre_completo', searchQuery));
    }

    const response = await databases.listDocuments<Cliente & Models.Document>(
        DATABASE_ID,
        CLIENTES_COLLECTION_ID,
        queries
    );
    
    // --- CORRECCIÓN: Devolver la respuesta completa (incluye total)
    return response; 
    // --- FIN CORRECCIÓN ---
};

// CREAR Cliente
export const createCliente = (newCliente: CreateClienteInput) => {
  return databases.createDocument<Cliente & Models.Document>(
    DATABASE_ID,
    CLIENTES_COLLECTION_ID,
    ID.unique(),
    newCliente
  );
};

// ACTUALIZAR Cliente
export const updateCliente = ({ $id, data }: { $id: string, data: UpdateClienteInput }) => {
  return databases.updateDocument<Cliente & Models.Document>(
    DATABASE_ID,
    CLIENTES_COLLECTION_ID,
    $id,
    data
  );
};

// ELIMINAR Cliente
export const deleteCliente = (clienteId: string) => {
  return databases.deleteDocument(
    DATABASE_ID,
    CLIENTES_COLLECTION_ID,
    clienteId
  );
};