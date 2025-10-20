import { useState } from 'react';
import { useGetCitasPorDia } from '@/hooks/useAgenda';
import { Cita } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Calendar } from "@/components/ui/calendar"; // Importamos el componente de calendario de shadcn/ui
import { format, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle } from 'lucide-react';

const Agenda = () => {
  // Estado para el día seleccionado en el calendario, inicializado a hoy
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));

  // Hook para obtener las citas del día seleccionado
  // Se ejecutará automáticamente cuando selectedDate cambie (si no es undefined)
  const { data: citasDelDia, isLoading: loadingCitas, error: errorCitas } = useGetCitasPorDia(
      selectedDate || new Date() // Usamos fecha seleccionada o hoy si es undefined
      // Podríamos añadir aquí un filtro por empleado si tuviéramos un selector
  );

  // Formatear la fecha seleccionada para mostrarla
  const fechaSeleccionadaFormateada = selectedDate
      ? format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: es })
      : 'Seleccione una fecha';

  // Renderizar la tabla de citas para el día seleccionado
  const renderCitasDelDia = () => {
    if (loadingCitas) {
      return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
    }
    if (errorCitas) {
      return <p className="text-center text-destructive py-8">Error al cargar las citas.</p>;
    }
    // Asegurarse de que selectedDate no sea undefined antes de filtrar
    if (!selectedDate || !citasDelDia || citasDelDia.length === 0) {
      return <p className="text-center text-muted-foreground py-8">No hay citas programadas para este día.</p>;
    }

    // Filtramos de nuevo por si acaso la query trajo citas fuera del día exacto
    const citasFiltradas = citasDelDia.filter(cita =>
        formatISO(startOfDay(parseISO(cita.fecha_hora_inicio)), { representation: 'date' }) === formatISO(startOfDay(selectedDate), { representation: 'date' })
    );

     if (citasFiltradas.length === 0) {
      return <p className="text-center text-muted-foreground py-8">No hay citas programadas para este día.</p>;
    }


    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Hora</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tratamiento</TableHead>
            <TableHead>Profesional</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {citasFiltradas.map((cita: Cita) => (
            <TableRow key={cita.$id}>
              <TableCell className="font-medium">
                {format(parseISO(cita.fecha_hora_inicio), 'HH:mm')}
              </TableCell>
              {/* Mostramos nombres (requiere que las relaciones se carguen o se busquen) */}
              <TableCell>{cita.cliente?.nombre_completo || cita.cliente_id}</TableCell>
              <TableCell>{cita.articulo?.nombre || cita.articulo_id}</TableCell>
              <TableCell>{cita.empleado?.nombre_completo || cita.empleado_id}</TableCell>
              <TableCell>{cita.estado}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
         <div>
            <h1 className="text-3xl font-bold">Agenda</h1>
            <p className="text-muted-foreground">Calendario y gestión de citas.</p>
         </div>
         <Button>
             <PlusCircle className="w-4 h-4 mr-2" />
             Nueva Cita
         </Button>
       </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Calendario */}
        <div className="lg:col-span-1">
           <Card>
               <CardContent className="p-0"> {/* Padding 0 para que el calendario ocupe todo */}
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="p-3" // Padding interno del calendario
                    locale={es} // Usar localización española
                    // Podríamos añadir props para deshabilitar días, mostrar eventos, etc.
                />
               </CardContent>
           </Card>
        </div>

        {/* Columna Citas del Día */}
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Citas para: {fechaSeleccionadaFormateada}</CardTitle>
                    <CardDescription>Listado de citas programadas para el día seleccionado.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {renderCitasDelDia()}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default Agenda;