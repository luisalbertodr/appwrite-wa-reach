import { Cliente } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Models } from 'appwrite';
// (NUEVO) Importamos las funciones del servicio
import { 
    getClientesByNombre, 
    createCliente as createClienteService,
    updateCliente as updateClienteService,
    deleteCliente as deleteClienteService,
    CreateClienteInput,
    UpdateClienteInput
} from '@/services/appwrite-clientes';

const CLIENTES_QUERY_KEY = 'clientes';

// Hook para OBTENER todos los clientes (MODIFICADO)
export const useGetClientes = (searchQuery: string = "") => {
  return useQuery<(Cliente & Models.Document)[]>({ // Tipo actualizado
    queryKey: [CLIENTES_QUERY_KEY, searchQuery],
    queryFn: () => getClientesByNombre(searchQuery), // Usa el servicio
    staleTime: 1000 * 60 * 5,
  });
};

// Hook para CREAR un cliente (MODIFICADO)
export const useCreateCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newCliente: CreateClienteInput) => {
      return createClienteService(newCliente); // Usa el servicio
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTES_QUERY_KEY] });
    },
  });
};

// Hook para ACTUALIZAR un cliente (MODIFICADO)
export const useUpdateCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ $id, data }: { $id: string, data: UpdateClienteInput }) => {
      return updateClienteService({ $id, data }); // Usa el servicio
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTES_QUERY_KEY] });
    },
  });
};

// Hook para ELIMINAR un cliente (MODIFICADO)
export const useDeleteCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clienteId: string) => {
      return deleteClienteService(clienteId); // Usa el servicio
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTES_QUERY_KEY] });
    },
  });
};