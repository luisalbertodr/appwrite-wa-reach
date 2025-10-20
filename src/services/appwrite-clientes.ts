import { databases, DATABASE_ID, CLIENTES_COLLECTION_ID } from '@/lib/appwrite';
import { Cliente, LipooutUserInput } from '@/types';
import { ID, Query, Models } from 'appwrite';

// Tipo Input (usado por hooks)
export type CreateClienteInput = LipooutUserInput<Cliente>;
export type UpdateClienteInput = Partial<CreateClienteInput>;

// --- Funciones de Servicio (Usadas por hooks y otros servicios) ---

// OBTENER Clientes (con búsqueda)
export const getClientesByNombre = async (searchQuery: string = ""): Promise<(Cliente & Models.Document)[]> => {
    const queries = [Query.limit(100)]; // Límite simple por ahora
    if (searchQuery) {
        // Asumimos que 'nombre_completo' tiene un índice Fulltext
        queries.push(Query.search('nombre_completo', searchQuery));
    }

    const response = await databases.listDocuments<Cliente & Models.Document>(
        DATABASE_ID,
        CLIENTES_COLLECTION_ID,
        queries
    );
    return response.documents;
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