import { databases, DATABASE_ID, CLIENTES_COLLECTION_ID } from '@/lib/appwrite';
import { Cliente, LipooutUserInput } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Models } from 'appwrite';
// Importamos tipos y funciones del servicio
import { 
    ClienteFilters, // <-- Tipo de filtros
    getClientes as getClientesService, // <-- Función de obtener con filtros
    createCliente as createClienteService,
    updateCliente as updateClienteService,
    deleteCliente as deleteClienteService,
    CreateClienteInput,
    UpdateClienteInput
} from '@/services/appwrite-clientes';

const CLIENTES_QUERY_KEY = 'clientes';

// Hook para OBTENER todos los clientes (MODIFICADO para aceptar filtros)
export const useGetClientes = (filters: ClienteFilters = {}) => {
  // Convertimos el objeto filters a una cadena estable para la queryKey
  // Ordenar las claves asegura que {a:1, b:2} y {b:2, a:1} generen la misma key
  const filterKey = JSON.stringify(filters, Object.keys(filters).sort());
  
  return useQuery<(Cliente & Models.Document)[]>({
    queryKey: [CLIENTES_QUERY_KEY, filterKey], // La key depende de los filtros aplicados
    queryFn: () => getClientesService(filters), // Pasa el objeto filters al servicio
    staleTime: 1000 * 60 * 5, // Cachear por 5 minutos
    retry: 1, // Reintentar 1 vez en caso de error
  });
};

// Hook para CREAR un cliente (Sin cambios funcionales, usa servicio actualizado)
export const useCreateCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newCliente: CreateClienteInput) => {
      return createClienteService(newCliente); // Usa el servicio (que ya incluye nombre_completo)
    },
    // Invalidar todas las queries de clientes al crear uno nuevo
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTES_QUERY_KEY] });
    },
  });
};

// Hook para ACTUALIZAR un cliente (Sin cambios funcionales, usa servicio actualizado)
export const useUpdateCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ $id, data }: { $id: string, data: UpdateClienteInput }) => {
      return updateClienteService({ $id, data }); // Usa el servicio (que ya incluye nombre_completo)
    },
    // Invalidar todas las queries de clientes al actualizar uno
    onSuccess: (updatedClient) => {
      // Opcional: Actualizar la caché directamente para una UI más rápida
      queryClient.setQueryData(
        [CLIENTES_QUERY_KEY], // Podrías necesitar la key específica del filtro si la tienes
        (oldData: (Cliente & Models.Document)[] | undefined) =>
          oldData?.map(client => client.$id === updatedClient.$id ? updatedClient : client) ?? []
      );
      // O simplemente invalidar para forzar refetch
      queryClient.invalidateQueries({ queryKey: [CLIENTES_QUERY_KEY] });
    },
  });
};

// Hook para ELIMINAR un cliente (Sin cambios funcionales)
export const useDeleteCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clienteId: string) => {
      return deleteClienteService(clienteId); // Usa el servicio
    },
    // Invalidar todas las queries de clientes al eliminar uno
    onSuccess: (data, clienteId) => {
       // Opcional: Actualizar la caché directamente
       queryClient.setQueryData(
          [CLIENTES_QUERY_KEY], // Podrías necesitar la key específica del filtro
          (oldData: (Cliente & Models.Document)[] | undefined) =>
             oldData?.filter(client => client.$id !== clienteId) ?? []
       );
      queryClient.invalidateQueries({ queryKey: [CLIENTES_QUERY_KEY] });
    },
  });
};