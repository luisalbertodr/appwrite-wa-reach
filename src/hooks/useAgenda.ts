import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCitasPorDia,
  createCita,
  updateCita,
  deleteCita,
  CreateCitaInput,
  UpdateCitaInput,
} from '@/services/appwrite-agenda';
import { formatISO, startOfDay } from 'date-fns';

const CITAS_QUERY_KEY = 'citas';

// Hook para obtener citas de un día específico (clave incluye la fecha)
export const useGetCitasPorDia = (fecha: Date, empleadoId?: string) => {
  const diaKey = formatISO(startOfDay(fecha)); // Usar el inicio del día como clave

  return useQuery({
    // La queryKey incluye el día y opcionalmente el empleado
    queryKey: [CITAS_QUERY_KEY, diaKey, { empleadoId }],
    queryFn: () => getCitasPorDia(fecha, empleadoId),
    staleTime: 1000 * 60 * 1, // 1 minuto de caché para citas del día
    // Podríamos añadir refetchInterval si queremos polling
  });
};

export const useCreateCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newCita: CreateCitaInput) => createCita(newCita),
    onSuccess: (data) => {
      // Invalidar las queries de citas para el día de la nueva cita
      const diaKey = formatISO(startOfDay(new Date(data.fecha_hora_inicio)));
      queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY, diaKey] });
    },
  });
};

export const useUpdateCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCitaInput }) => {
      // Para recalcular duración necesitamos la cita original si solo cambia una fecha
      // Aquí asumimos que el formulario envía ambas fechas si una cambia,
      // o podríamos hacer un get previo.
      return updateCita(id, data);
    },
    onSuccess: (data) => {
      // Invalidar para el día de la cita actualizada
      const diaKey = formatISO(startOfDay(new Date(data.fecha_hora_inicio)));
      queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY, diaKey] });
    },
  });
};

export const useDeleteCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // Necesitamos saber la fecha de la cita para invalidar la caché correcta
    mutationFn: ({ id, fechaCita }: { id: string, fechaCita: string }) => deleteCita(id),
    onSuccess: (_, variables) => {
      const diaKey = formatISO(startOfDay(new Date(variables.fechaCita)));
      queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY, diaKey] });
    },
  });
};