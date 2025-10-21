import { useState } from 'react';
import { useGetCitasPorDia, useCreateCita, useUpdateCita, useDeleteCita } from '@/hooks/useAgenda';
import { Cita, CitaInput, LipooutUserInput } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react'; // Añadir iconos
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CitaForm } from '@/components/forms/CitaForm'; // <-- Importar formulario
import { useToast } from '@/hooks/use-toast';

const Agenda = () => {
  // Estado para el día seleccionado
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));
  const { toast } = useToast();

  // Hooks de datos y mutaciones
  const { data: citasDelDia, isLoading: loadingCitas, error: errorCitas, refetch: refetchCitas } = useGetCitasPorDia(
      selectedDate || new Date()
  );
  const createCitaMutation = useCreateCita();
  const updateCitaMutation = useUpdateCita();
  const deleteCitaMutation = useDeleteCita();

  // Estado para el diálogo
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [citaToEdit, setCitaToEdit] = useState<(Cita & Models.Document) | null>(null);

  // Formatear la fecha seleccionada
  const fechaSeleccionadaFormateada = selectedDate
      ? format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: es })
      : 'Seleccione una fecha';

  // --- Manejadores CRUD ---
  const handleOpenCreateDialog = () => {
    setCitaToEdit(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (cita: Cita & Models.Document) => {
    setCitaToEdit(cita);
    setIsDialogOpen(true);
  };

  const handleDeleteCita = async (cita: Cita & Models.Document) => {
    if (window.confirm(`¿Estás seguro de eliminar la cita de las ${format(parseISO(cita.fecha_hora_inicio), 'HH:mm')}?`)) {
      try {
        await deleteCitaMutation.mutateAsync({ id: cita.$id, fechaCita: cita.fecha_hora_inicio });
        toast({ title: "Cita eliminada" });
        // refetchCitas(); // InvalidateQueries lo hace
      } catch (err) {
        toast({ title: "Error al eliminar la cita", description: (err as Error).message, variant: "destructive" });
      }
    }
  };

  const handleFormSubmit = async (data: LipooutUserInput<CitaInput>) => {
    try {
      if (citaToEdit) {
        await updateCitaMutation.mutateAsync({ id: citaToEdit.$id, data });
        toast({ title: "Cita actualizada" });
      } else {
        await createCitaMutation.mutateAsync(data);
        toast({ title: "Cita creada" });
      }
      setIsDialogOpen(false);
      setCitaToEdit(null);
      // refetchCitas(); // InvalidateQueries lo hace
    } catch (err) {
      toast({ title: `Error al ${citaToEdit ? 'actualizar' : 'crear'} la cita`, description: (err as Error).message, variant: "destructive" });
    }
  };


  // Renderizar la tabla de citas
  const renderCitasDelDia = () => {
    if (loadingCitas) {
      return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
    }
    if (errorCitas) {
      return <p className="text-center text-destructive py-8">Error al cargar las citas.</p>;
    }
    if (!selectedDate || !citasDelDia || citasDelDia.length === 0) {
      return <p className="text-center text-muted-foreground py-8">No hay citas programadas para este día.</p>;
    }

    // Filtramos de nuevo por si acaso la query trajo citas fuera del día exacto
    const citasFiltradas = citasDelDia.filter(cita =>
        format(startOfDay(parseISO(cita.fecha_hora_inicio)), 'yyyy-MM-dd') === format(startOfDay(selectedDate), 'yyyy-MM-dd')
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
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {citasFiltradas.map((cita: Cita & Models.Document) => (
            <TableRow key={cita.$id}>
              <TableCell className="font-medium">
                {format(parseISO(cita.fecha_hora_inicio), 'HH:mm')}
              </TableCell>
              <TableCell>{cita.cliente?.nombre_completo || 'Cliente no encontrado'}</TableCell>
              <TableCell>{cita.articulo?.nombre || 'Artículo no encontrado'}</TableCell>
              <TableCell>{cita.empleado?.nombre_completo || 'Empleado no encontrado'}</TableCell>
              <TableCell>{cita.estado}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-8 w-8"> <MoreHorizontal className="w-4 h-4" /> <span className="sr-only">Acciones</span> </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEditDialog(cita)} className="cursor-pointer">
                       <Edit className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDeleteCita(cita)} className="text-destructive cursor-pointer">
                       <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
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
         <Button onClick={handleOpenCreateDialog}>
             <PlusCircle className="w-4 h-4 mr-2" />
             Nueva Cita
         </Button>
       </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Calendario */}
        <div className="lg:col-span-1">
           <Card>
               <CardContent className="p-0">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="p-3"
                    locale={es}
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

       {/* --- Diálogo para Crear/Editar Cita --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl"> {/* Ancho ajustado */}
          <DialogHeader>
            <DialogTitle>{citaToEdit ? 'Editar Cita' : 'Crear Nueva Cita'}</DialogTitle>
          </DialogHeader>
          <CitaForm
            citaInicial={citaToEdit}
            fechaInicial={selectedDate} // Pasamos la fecha seleccionada
            onSubmit={handleFormSubmit}
            isSubmitting={createCitaMutation.isPending || updateCitaMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agenda;
