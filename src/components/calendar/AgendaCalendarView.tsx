import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarEvent, CalendarResource, CalendarConfig } from '@/types/calendar.types';
import { CitaEventComponent } from './CitaEventComponent';

// Configuración de date-fns para react-big-calendar
const locales = {
  'es': es,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }), // Lunes
  getDay,
  locales,
});

// Textos en español para el calendario
const messages = {
  allDay: 'Todo el día',
  previous: 'Anterior',
  next: 'Siguiente',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  work_week: 'Semana Laboral',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay citas en este rango.',
  showMore: (total: number) => `+ Ver ${total} más`,
};

// Configuración de horas y slots (la movemos aquí desde tu tipo para usarla)
const calendarConfig: CalendarConfig = {
  min: new Date(0, 0, 0, 8, 0, 0),   // 8:00 AM
  max: new Date(0, 0, 0, 21, 0, 0),  // 9:00 PM
  step: 15,
  timeslots: 4,
};

interface AgendaCalendarViewProps {
  events: CalendarEvent[];
  defaultDate?: Date;
  resources?: CalendarResource[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  onNavigate: (newDate: Date) => void;
}

export const AgendaCalendarView = ({
  events,
  defaultDate,
  resources,
  onSelectEvent,
  onSelectSlot,
  onNavigate
}: AgendaCalendarViewProps) => {
  return (
    <div className="h-[calc(100vh-200px)] bg-white p-4 rounded-lg shadow">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        messages={messages}
        culture='es'
        defaultView={Views.DAY} // Vista de columnas por defecto
        views={{ day: true, work_week: true }} // Vistas compatibles con recursos
        defaultDate={defaultDate || new Date()}
        onNavigate={onNavigate}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable
        min={calendarConfig.min}
        max={calendarConfig.max}
        step={calendarConfig.step}
        timeslots={calendarConfig.timeslots}
        components={{
          event: CitaEventComponent,
        }}
        // --- PROPS DE RECURSOS ---
        resources={resources}
        resourceAccessor="resource.empleadoId" // Le decimos que mire dentro del objeto
        resourceTitleAccessor="title" // El 'title' de tu CalendarResource
        // --- FIN DE PROPS DE RECURSOS ---
      />
    </div>
  );
};