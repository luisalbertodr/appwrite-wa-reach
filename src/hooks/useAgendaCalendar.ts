import { useQuery } from '@tanstack/react-query';
import { getCitasPorRango } from '@/services/appwrite-agenda';
import { CalendarEvent, CalendarResource } from '@/types/calendar.types';
import { Cita } from '@/types';
import { Models } from 'appwrite';
import { parseISO, addMinutes } from 'date-fns';
import { useGetEmpleados } from './useEmpleados';
import { useGetClientes } from './useClientes';

const CALENDAR_QUERY_KEY = 'calendar-citas';

// Hook para obtener citas por rango de fechas
export const useGetCitasPorRango = (fechaInicio: Date, fechaFin: Date, empleadoId?: string) => {
  return useQuery({
    queryKey: [CALENDAR_QUERY_KEY, fechaInicio.toISOString(), fechaFin.toISOString(), empleadoId],
    queryFn: () => getCitasPorRango(fechaInicio, fechaFin, empleadoId),
    staleTime: 1000 * 60, // 1 minuto
  });
};

// Hook para convertir citas a eventos de calendario
export const useAgendaCalendar = (fechaInicio: Date, fechaFin: Date) => {
  const { data: citas, isLoading: loadingCitas, error: errorCitas } = useGetCitasPorRango(fechaInicio, fechaFin);
  const { data: empleados, isLoading: loadingEmpleados } = useGetEmpleados();
  const { data: clientes, isLoading: loadingClientes } = useGetClientes();

  // Convertir citas a eventos de calendario
  const events: CalendarEvent[] = (citas || []).map((cita: Cita & Models.Document) => {
    const start = parseISO(cita.fecha_hora);
    const end = addMinutes(start, cita.duracion || 30);

    // Buscar nombre del cliente
    const cliente = clientes?.find(c => c.$id === cita.cliente_id);
    const clienteNombre = cliente?.nombre_completo || cliente?.nomcli || 'Cliente desconocido';

    // Buscar nombre del empleado (el tipo Empleado tiene 'nombre')
    const empleado = empleados?.find(e => e.$id === cita.empleado_id);
    const empleadoNombre = empleado?.nombre || 'Empleado desconocido';

    return {
      id: cita.$id,
      title: `${clienteNombre} - ${cita.articulos || 'Sin tratamiento'}`,
      start,
      end,
      resource: {
        cita,
        empleadoId: cita.empleado_id,
        clienteNombre,
        articulos: cita.articulos || 'Sin tratamiento',
        estado: cita.estado,
      },
    };
  });

  // Crear recursos (empleados) para el calendario
  const resources: CalendarResource[] = (empleados || []).map(empleado => ({
    id: empleado.$id,
    title: empleado.nombre,
  }));

  return {
    events,
    resources,
    isLoading: loadingCitas || loadingEmpleados || loadingClientes,
    error: errorCitas,
  };
};
