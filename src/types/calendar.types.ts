import { Cita } from './cita.types';
import { Models } from 'appwrite';

// Evento del calendario basado en react-big-calendar
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    cita: Cita & Models.Document;
    empleadoId: string;
    clienteNombre: string;
    articulos: string;
    estado: string;
  };
}

// Recurso del calendario (empleado)
export interface CalendarResource {
  id: string;
  title: string;
}

// Props para el componente de evento personalizado
export interface CitaEventProps {
  event: CalendarEvent;
}

// Configuración del calendario
export interface CalendarConfig {
  min: Date; // Hora mínima (ej: 8:00)
  max: Date; // Hora máxima (ej: 20:00)
  step: number; // Duración de cada slot en minutos (15)
  timeslots: number; // Número de slots por hora (4 para 15 min)
}
