import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCitasPorDia,
  getCitasPorSemana,
  createCita,
  updateCita,
  deleteCita,
} from '../services/appwrite-agenda'; // Asumiendo que las funciones CRUD están aquí
import { Cita, CitaInput, LipooutUserInput } from '@/types'; // Asegúrate de importar los tipos necesarios
import { Models } from 'appwrite';
import { format, startOfDay, parseISO, startOfWeek } from 'date-fns'; // Importar date-fns

// --- CLAVE BASE PARA LAS QUERIES DE CITAS ---
export const CITAS_QUERY_KEY = 'citas';

// --- HOOK PARA OBTENER CITAS POR DÍA (CON FECHA EN LA KEY) ---
export const useGetCitasPorDia = (fecha: Date | undefined) => {
  // Asegurarse de tener una fecha válida, usar Date() como fallback si es undefined
  const fechaValida = fecha || new Date();
  // Crear una clave única para cada día para el caché
  const fechaKey = format(startOfDay(fechaValida), 'yyyy-MM-dd'); // Formato consistente y simple

  return useQuery({
    // La queryKey ahora incluye la fecha específica
    queryKey: [CITAS_QUERY_KEY, fechaKey],
    queryFn: () => getCitasPorDia(fechaValida), // Llama a la función del servicio con fecha válida
    // Opciones adicionales (ej. staleTime) pueden ir aquí
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos, por ejemplo
    // Habilitar refetch al montar o si la ventana recupera el foco puede ser útil
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// --- HOOK PARA OBTENER CITAS POR SEMANA (LUNES A SÁBADO) ---
export const useGetCitasPorSemana = (fecha: Date | undefined) => {
  const fechaValida = fecha || new Date();
  // Crear una clave única basada en el inicio de la semana (lunes)
  const semanaKey = format(startOfWeek(fechaValida, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: [CITAS_QUERY_KEY, 'semana', semanaKey],
    queryFn: () => getCitasPorSemana(fechaValida),
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// --- HOOK PARA CREAR UNA CITA ---
export const useCreateCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // La función que llama al servicio para crear la cita
    mutationFn: (newCita: LipooutUserInput<CitaInput>) => createCita(newCita),
    
    // --- IMPORTANTE: Invalidar queries al tener éxito ---
    onSuccess: (/* data, variables */) => { // 'data' es la cita creada, 'variables' es lo que se envió
      // Invalida TODAS las queries que empiecen con ['citas']
      // Esto forzará a useGetCitasPorDia a recargar los datos del día actual (si está visible)
      queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY] });

      // --- Alternativa (más compleja): Invalidar solo el día específico ---
      // Si recibes la fecha de la cita creada ('data' o 'variables'), podrías hacer:
      // const fechaCitaCreada = data?.fecha_hora || variables?.fecha_hora;
      // if (fechaCitaCreada) {
      //   const fechaKeyEspecifica = format(startOfDay(parseISO(fechaCitaCreada)), 'yyyy-MM-dd');
      //   queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY, fechaKeyEspecifica] });
      // } else {
      //   // Si no puedes obtener la fecha, invalida todo como fallback
      //   queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY] });
      // }
      // --- Fin alternativa ---
    },
    onError: (error) => {
      console.error("Error al crear la cita:", error);
      // Aquí podrías manejar el error, por ejemplo, mostrando un toast global si no lo haces en el componente
    },
  });
};

// --- HOOK PARA ACTUALIZAR UNA CITA ---
export const useUpdateCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LipooutUserInput<Partial<CitaInput>> }) =>
      updateCita(id, data),
    onSuccess: (/* data, variables */) => { // 'data' es la cita actualizada, 'variables' son {id, data}
      // Invalidar para refrescar la vista
      queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY] });

      // Podrías intentar ser más específico si tienes la fecha antes y después del cambio
      // const fechaAntes = ... // Necesitarías obtenerla de alguna forma
      // const fechaDespues = data?.fecha_hora || variables?.data?.fecha_hora;
      // if (fechaAntes) {
      //    const fechaKeyAntes = format(startOfDay(parseISO(fechaAntes)), 'yyyy-MM-dd');
      //    queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY, fechaKeyAntes] });
      // }
      // if (fechaDespues && fechaDespues !== fechaAntes) {
      //    const fechaKeyDespues = format(startOfDay(parseISO(fechaDespues)), 'yyyy-MM-dd');
      //    queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY, fechaKeyDespues] });
      // } else if (!fechaAntes && !fechaDespues) { // Fallback
      //     queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY] });
      // }
    },
    onError: (error) => {
      console.error("Error al actualizar la cita:", error);
    },
  });
};

// --- HOOK PARA ELIMINAR UNA CITA ---
export const useDeleteCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // Modificado para aceptar un objeto con id y opcionalmente fechaCita
    mutationFn: ({ id/*, fechaCita */}: { id: string; fechaCita?: string }) => deleteCita(id),
    onSuccess: (_, variables) => { // El primer argumento es void (delete no devuelve datos), el segundo son las variables {id, fechaCita}
      // Invalidar para refrescar la vista
      queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY] });

      // Alternativa: invalidar día específico si se pasó la fecha
      // const fechaCitaEliminada = variables.fechaCita;
      // if (fechaCitaEliminada) {
      //   const fechaKeyEspecifica = format(startOfDay(parseISO(fechaCitaEliminada)), 'yyyy-MM-dd');
      //   queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY, fechaKeyEspecifica] });
      // } else {
      //   queryClient.invalidateQueries({ queryKey: [CITAS_QUERY_KEY] }); // Fallback
      // }
    },
    onError: (error) => {
      console.error("Error al eliminar la cita:", error);
    },
  });
};
