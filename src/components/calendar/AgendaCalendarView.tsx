import { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views, SlotInfo } from 'react-big-calendar';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, endOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { useAgendaCalendar } from '@/hooks/useAgendaCalendar';
import { useUpdateCita } from '@/hooks/useAgenda';
import { CalendarEvent, CalendarConfig } from '@/types/calendar.types';
import { CitaEventComponent } from './CitaEventComponent';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

// Configurar el localizador con date-fns y español
const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Crear el calendario con drag & drop
const DragAndDropCalendar = withDragAndDrop(Calendar);

interface AgendaCalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (slotInfo: SlotInfo) => void;
}

export const AgendaCalendarView = ({ onEventClick, onSlotClick }: AgendaCalendarViewProps) => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const updateCitaMutation = useUpdateCita();

  // Calcular el rango de fechas para la vista actual (semana)
  const { start, end } = useMemo(() => {
    const start = startOfWeek(currentDate, { locale: es });
    const end = endOfDay(addDays(start, 6));
    return { start, end };
  }, [currentDate]);

  // Obtener eventos y recursos del hook
  const { events, resources, isLoading, error } = useAgendaCalendar(start, end);

  // Configuración del calendario
  const calendarConfig: CalendarConfig = useMemo(() => ({
    min: new Date(2025, 0, 1, 8, 0, 0), // 8:00 AM
    max: new Date(2025, 0, 1, 20, 0, 0), // 8:00 PM
    step: 15, // Slots de 15 minutos
    timeslots: 4, // 4 slots por hora (15 min cada uno)
  }), []);

  // Manejador de eventos arrastrados
  const handleEventDrop = useCallback(
    async ({ event, start, end, resourceId }: any) => {
      try {
        const calendarEvent = event as CalendarEvent;
        const newEmpleadoId = resourceId || calendarEvent.resource.empleadoId;

        // Actualizar la cita en Appwrite
        await updateCitaMutation.mutateAsync({
          id: calendarEvent.id,
          data: {
            fecha_hora: start.toISOString(),
            duracion: Math.round((end.getTime() - start.getTime()) / (1000 * 60)),
            empleado_id: newEmpleadoId,
          },
        });

        toast({
          title: 'Cita actualizada',
          description: 'La cita ha sido movida exitosamente.',
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'No se pudo mover la cita. Intenta de nuevo.',
          variant: 'destructive',
        });
        console.error('Error al mover cita:', err);
      }
    },
    [updateCitaMutation, toast]
  );

  // Manejador de eventos redimensionados
  const handleEventResize = useCallback(
    async ({ event, start, end }: any) => {
      try {
        const calendarEvent = event as CalendarEvent;

        await updateCitaMutation.mutateAsync({
          id: calendarEvent.id,
          data: {
            fecha_hora: start.toISOString(),
            duracion: Math.round((end.getTime() - start.getTime()) / (1000 * 60)),
          },
        });

        toast({
          title: 'Cita actualizada',
          description: 'La duración de la cita ha sido modificada.',
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'No se pudo redimensionar la cita.',
          variant: 'destructive',
        });
        console.error('Error al redimensionar cita:', err);
      }
    },
    [updateCitaMutation, toast]
  );

  // Manejador de clic en evento
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (onEventClick) {
        onEventClick(event);
      }
    },
    [onEventClick]
  );

  // Manejador de clic en slot vacío
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      if (onSlotClick) {
        onSlotClick(slotInfo);
      }
    },
    [onSlotClick]
  );

  // Componente personalizado para renderizar eventos
  const EventComponent = useCallback(
    ({ event }: { event: CalendarEvent }) => <CitaEventComponent event={event} />,
    []
  );

  // Mensajes personalizados en español
  const messages = {
    allDay: 'Todo el día',
    previous: 'Anterior',
    next: 'Siguiente',
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
    agenda: 'Agenda',
    date: 'Fecha',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'No hay citas en este rango.',
    showMore: (total: number) => `+ Ver más (${total})`,
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <p className="text-destructive">Error al cargar el calendario</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Card>
        <CardContent className="p-4">
          <div className="h-[700px]">
            <DragAndDropCalendar
              localizer={localizer}
              events={events as any}
              resources={resources}
              resourceIdAccessor={(resource: any) => resource.id}
              resourceTitleAccessor={(resource: any) => resource.title}
              startAccessor={(event: any) => event.start}
              endAccessor={(event: any) => event.end}
              className="h-full"
              defaultView={Views.WEEK}
              views={[Views.WEEK, Views.DAY]}
              step={calendarConfig.step}
              timeslots={calendarConfig.timeslots}
              min={calendarConfig.min}
              max={calendarConfig.max}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              onSelectEvent={(event: any) => handleSelectEvent(event as CalendarEvent)}
              onSelectSlot={handleSelectSlot}
              selectable
              resizable
              culture="es"
              messages={messages}
              components={{
                event: (props: any) => <EventComponent event={props.event as CalendarEvent} />,
              }}
              onNavigate={(newDate) => setCurrentDate(newDate)}
              date={currentDate}
              formats={{
                dayHeaderFormat: (date: Date) => format(date, 'EEEE dd', { locale: es }),
                dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${format(start, 'dd MMM', { locale: es })} - ${format(end, 'dd MMM yyyy', { locale: es })}`,
                timeGutterFormat: (date: Date) => format(date, 'HH:mm', { locale: es }),
              }}
            />
          </div>
        </CardContent>
      </Card>
    </DndProvider>
  );
};
