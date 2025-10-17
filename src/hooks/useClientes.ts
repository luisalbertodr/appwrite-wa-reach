import { databases, DATABASE_ID, CLIENTES_COLLECTION_ID } from '@/lib/appwrite';
import { Cliente } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ID, Query } from 'appwrite';

const CLIENTES_QUERY_KEY = 'clientes';

// Tipado para la creación (omitimos campos de Appwrite)
type CreateClienteInput = Omit<Cliente, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>;
// Tipado para la actualización (hacemos todo opcional)
type UpdateClienteInput = Partial<CreateClienteInput>;

// Hook para OBTENER todos los clientes
export const useGetClientes = (searchQuery: string = "") => {
  return useQuery<Cliente[]>({
    queryKey: [CLIENTES_QUERY_KEY, searchQuery],
    queryFn: async () => {
      const queries = [Query.limit(100)]; // Ajustar límite según necesidad
      if (searchQuery) {
        // Asumimos búsqueda por nombre completo o email
        queries.push(Query.search('nombre_completo', searchQuery));
        // Nota: Appwrite necesita índices para las búsquedas
      }

      const response = await databases.listDocuments<Cliente>(
        DATABASE_ID,
        CLIENTES_COLLECTION_ID,
        queries
      );
      return response.documents;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

// Hook para CREAR un cliente
export const useCreateCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newCliente: CreateClienteInput) => {
      return databases.createDocument<Cliente>(
        DATABASE_ID,
        CLIENTES_COLLECTION_ID,
        ID.unique(),
        newCliente
      );
    },
    onSuccess: () => {
      // Invalidar la cache de clientes para que se actualice la lista
      queryClient.invalidateQueries({ queryKey: [CLIENTES_QUERY_KEY] });
    },
  });
};

// Hook para ACTUALIZAR un cliente
export const useUpdateCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ $id, data }: { $id: string, data: UpdateClienteInput }) => {
      return databases.updateDocument<Cliente>(
        DATABASE_ID,
        CLIENTES_COLLECTION_ID,
        $id,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTES_QUERY_KEY] });
    },
  });
};

// Hook para ELIMINAR un cliente
export const useDeleteCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clienteId: string) => {
      return databases.deleteDocument(
        DATABASE_ID,
        CLIENTES_COLLECTION_ID,
        clienteId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTES_QUERY_KEY] });
    },
  });
};