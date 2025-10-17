import { databases, DATABASE_ID, CLIENTES_COLLECTION_ID } from '@/lib/appwrite';
import { Cliente, LipooutUserInput } from '@/types'; // Import Cliente y LipooutUserInput
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ID, Query, Models } from 'appwrite'; // Import Models

const CLIENTES_QUERY_KEY = 'clientes';

// Usamos el helper LipooutUserInput
type CreateClienteInput = LipooutUserInput<Cliente>;
type UpdateClienteInput = Partial<CreateClienteInput>;

// Hook para OBTENER todos los clientes
export const useGetClientes = (searchQuery: string = "") => {
  return useQuery<Cliente[]>({ // El tipo de retorno es Cliente[]
    queryKey: [CLIENTES_QUERY_KEY, searchQuery],
    queryFn: async () => {
      const queries = [Query.limit(100)];
      if (searchQuery) {
        queries.push(Query.search('nombre_completo', searchQuery));
      }

      const response = await databases.listDocuments<Cliente>( // Especificar Cliente
        DATABASE_ID,
        CLIENTES_COLLECTION_ID,
        queries
      );
      return response.documents;
    },
    staleTime: 1000 * 60 * 5,
  });
};

// Hook para CREAR un cliente
export const useCreateCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newCliente: CreateClienteInput) => {
      // Aseguramos que los campos requeridos por Appwrite/tipo estén
      const clienteToSave = { ...newCliente };
      // Podríamos añadir validación aquí si es necesario
      return databases.createDocument<Cliente & Models.Document>( // Añadir Models.Document
        DATABASE_ID,
        CLIENTES_COLLECTION_ID,
        ID.unique(),
        clienteToSave
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTES_QUERY_KEY] });
    },
  });
};

// Hook para ACTUALIZAR un cliente
export const useUpdateCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // La data ya es Partial<CreateClienteInput>, compatible con LipooutUserInput<Cliente>
    mutationFn: ({ $id, data }: { $id: string, data: UpdateClienteInput }) => {
      return databases.updateDocument<Cliente & Models.Document>( // Añadir Models.Document
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