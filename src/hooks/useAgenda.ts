import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCitasPorDia,
  createCita,
  updateCita,
  deleteCita,
  CreateCitaInput, // Correcto
  UpdateCitaInput, // Correcto
} from '@/services/appwrite-agenda'; // Verificado
import { formatISO, startOfDay } from 'date-fns';

const CITAS_QUERY_KEY = 'citas';

export const useGetCitasPorDia = (fecha: Date, empleadoId?: string) => {
  const diaKey = formatISO(startOfDay(fecha));

  return useQuery({
    queryKey: [CITAS_QUERY_KEY, diaKey, { empleadoId }],
    queryFn: () => getCitasPorDia(fecha, empleadoId),
    staleTime: 1000 * 60 * 1,
  });
};

export const useCreateCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newCita: CreateCitaInput) => createCita(newCita),
    onSuccess: (data) => {
      const diaKey = formatISO(startOfDay(new Date(data.fecha_hora_inicio)));
      queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY, diaKey] });
    },
  });
};

export const useUpdateCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCitaInput }) => {
      // Idealmente, obtener la cita actual aquí si es necesario para calcular duración
      return updateCita(id, data);
    },
    onSuccess: (data) => {
      const diaKey = formatISO(startOfDay(new Date(data.fecha_hora_inicio)));
      queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY, diaKey] });
    },
  });
};

export const useDeleteCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // Aseguramos pasar fechaCita como string ISO
    mutationFn: ({ id, fechaCita }: { id: string, fechaCita: string }) => deleteCita(id),
    onSuccess: (_, variables) => {
      // Usamos la fecha pasada en variables
      const diaKey = formatISO(startOfDay(new Date(variables.fechaCita)));
      queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY, diaKey] });
    },
  });
};