import { CalendarEvent } from '@/types/calendar.types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface CitaEventComponentProps {
  event: CalendarEvent;
}

export const CitaEventComponent = ({ event }: CitaEventComponentProps) => {
  const { resource } = event;
  const { estado, clienteNombre, articulos } = resource;

  // Determinar el color según el estado
  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'confirmada':
        return 'bg-green-500 text-white';
      case 'pendiente':
        return 'bg-yellow-500 text-white';
      case 'cancelada':
        return 'bg-red-500 text-white';
      case 'completada':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="flex flex-col h-full p-1 overflow-hidden">
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-xs font-semibold truncate flex-1">
          {format(event.start, 'HH:mm')}
        </span>
        <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${getEstadoColor(estado)}`}>
          {estado}
        </Badge>
      </div>
      <div className="text-xs font-medium truncate">
        {clienteNombre}
      </div>
      <div className="text-[10px] text-muted-foreground truncate">
        {articulos}
      </div>
    </div>
  );
};
