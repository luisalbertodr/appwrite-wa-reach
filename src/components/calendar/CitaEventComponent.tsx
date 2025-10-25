import { CitaEventProps } from '@/types/calendar.types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Helper para obtener el color del estado
const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'agendada':
      return 'bg-blue-100 text-blue-800';
    case 'confirmada':
      return 'bg-yellow-100 text-yellow-800';
    case 'realizada':
      return 'bg-green-100 text-green-800';
    case 'cancelada':
      return 'bg-red-100 text-red-800';
    case 'no_asistio':
      return 'bg-gray-100 text-gray-800 line-through';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const CitaEventComponent = ({ event }: CitaEventProps) => {
  // Extraemos la información del objeto 'resource' anidado
  const { clienteNombre, articulos, estado } = event.resource;

  return (
    <div className={cn("p-1 h-full text-xs rounded-sm", getEstadoColor(estado))}>
      <strong className="truncate block">{clienteNombre}</strong>
      <span className="truncate block">{articulos}</span>
      <Badge 
        variant="default" 
        className={cn("mt-1 text-[10px] p-0 px-1", getEstadoColor(estado))}
      >
        {estado}
      </Badge>
    </div>
  );
};