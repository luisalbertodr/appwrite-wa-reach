import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmpleados,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  CreateEmpleadoInput,
  UpdateEmpleadoInput,
} from '@/services/appwrite-empleados';

const EMPLEADOS_QUERY_KEY = 'empleados';

export const useGetEmpleados = (soloActivos: boolean = true) => {
  return useQuery({
    queryKey: [EMPLEADOS_QUERY_KEY, { soloActivos }],
    queryFn: () => getEmpleados(soloActivos),
    staleTime: 1000 * 60 * 15, // 15 minutos de caché para empleados
  });
};

export const useCreateEmpleado = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newEmpleado: CreateEmpleadoInput) => createEmpleado(newEmpleado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLEADOS_QUERY_KEY] });
    },
  });
};

export const useUpdateEmpleado = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmpleadoInput }) =>
      updateEmpleado(id, data),
    onSuccess: (_, variables) => {
      // Invalidar toda la lista
      queryClient.invalidateQueries({ queryKey: [EMPLEADOS_QUERY_KEY] });
      // (Opcional) Actualizar la caché individual si tenemos el dato completo
      // queryClient.setQueryData([EMPLEADOS_QUERY_KEY, variables.id], updatedData);
    },
  });
};

export const useDeleteEmpleado = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmpleado(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLEADOS_QUERY_KEY] });
    },
  });
};