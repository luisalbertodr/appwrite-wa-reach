import { useState, useMemo, useEffect } from 'react';
import { Models } from 'appwrite';
import {
  useGetCitasPorDia,
  useCreateCita,
  useUpdateCita,
  useDeleteCita
} from '@/hooks/useAgenda';
import { useGetEmpleados } from '@/hooks/useEmpleados';
// Asumiendo que useGetClientes devuelve Cliente[] | undefined
import { useGetClientes } from '@/hooks/useClientes';
import { Cita, CitaInput, LipooutUserInput } from '@/types';
import { Cliente } from '@/types/cliente.types';
import { Empleado } from '@/types/empleado.types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';

import { Calendar as BigCalendar, dateFnsLocalizer, View, EventProps, Views } from 'react-big-calendar';
import { format, parse, getDay, startOfWeek, startOfDay, parseISO, addMinutes, isValid } from 'date-fns';
import { es, Locale } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { PlusCircle, MoreHorizontal, Edit, Trash2, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CitaForm } from '@/components/forms/CitaForm';
import { useToast } from '@/hooks/use-toast';

// Configuración Localizer
const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format: (date: Date, formatStr: string, culture?: string) => 
    format(date, formatStr, { locale: locales[culture as keyof typeof locales] }),
  parse: (dateStr: string, formatStr: string, culture?: string) =>
    parse(dateStr, formatStr, new Date(), { locale: locales[culture as keyof typeof locales] }),
  startOfWeek: (date: Date, options?: { locale?: Locale; weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 }) => 
    startOfWeek(date, { locale: es, weekStartsOn: 1 }),
  getDay: (date: Date) => getDay(date),
  locales,
});

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resourceId: string;
  data: Cita & Models.Document;
  clienteInfo: string;
  tratamientos: string;
}

const Agenda = () => {
  // Estados y Hooks
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const { toast } = useToast();

  const { data: citasDelDia, isLoading: loadingCitas, error: errorCitas, isFetching } = useGetCitasPorDia(
      selectedDate
  );
  const { data: empleadosData, isLoading: loadingEmpleados, error: errorEmpleados } = useGetEmpleados(false);
  const { data: clientesData, isLoading: loadingClientes, error: errorClientes } = useGetClientes();

  const createCitaMutation = useCreateCita();
  const updateCitaMutation = useUpdateCita();
  const deleteCitaMutation = useDeleteCita();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [citaToEdit, setCitaToEdit] = useState<(Cita & Models.Document) | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<Date | undefined>(new Date());
  const [selectedEmpleadosIds, setSelectedEmpleadosIds] = useState<string[]>([]);

  const fechaSeleccionadaFormateada = selectedDate
      ? format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: es })
      : 'Seleccione una fecha';

  // Log datos del hook useGetCitasPorDia
   useEffect(() => {
    console.log('%c[Agenda Component] Datos de useGetCitasPorDia:', 'color: purple; font-weight: bold;', citasDelDia);
    console.log(`%c[Agenda Component] Estado Carga Citas: isLoading=${loadingCitas}, isFetching=${isFetching}, hasError=${!!errorCitas}`, 'color: purple;');
    if (errorCitas) {
        console.error('[Agenda Component] Error en useGetCitasPorDia:', errorCitas);
    }
  }, [citasDelDia, loadingCitas, isFetching, errorCitas]);

  // Lista completa empleados
  const allEmpleados = useMemo(() => {
    console.log('[Agenda Component - useMemo allEmpleados] Input empleadosData:', empleadosData);
    const result = empleadosData || []; // Fallback a array vacío
    console.log('[Agenda Component - useMemo allEmpleados] Output allEmpleados:', result);
    return result;
  }, [empleadosData]);

  // Efecto seleccionar activos por defecto
   useEffect(() => {
    if (Array.isArray(allEmpleados)) {
        if (allEmpleados.length > 0) {
          const activeEmpleadosIds = allEmpleados
            .filter((emp: Empleado) => emp.activo)
            .map((emp: Empleado) => emp.$id);
          setSelectedEmpleadosIds(prevIds => {
             const newSet = new Set(activeEmpleadosIds);
             const currentSet = new Set(prevIds);
             if (newSet.size === currentSet.size && [...newSet].every(id => currentSet.has(id))) { return prevIds; }
             console.log('[Agenda Component - useEffect] Seleccionando empleados activos por defecto:', activeEmpleadosIds);
             return activeEmpleadosIds;
          });
        } else if (!loadingEmpleados) {
            console.log('[Agenda Component - useEffect] Limpiando selección de empleados (lista vacía o carga finalizada)');
            setSelectedEmpleadosIds([]);
        }
    } else {
         console.warn('[Agenda Component - useEffect] allEmpleados no es un array:', allEmpleados);
         setSelectedEmpleadosIds([]);
    }
  }, [allEmpleados, loadingEmpleados]);

  // Recursos (Empleados filtrados)
   const resources = useMemo(() => {
    if (!Array.isArray(allEmpleados)) return [];
    const filteredResources = allEmpleados
      .filter((emp: Empleado) => selectedEmpleadosIds.includes(emp.$id))
      .map((emp: Empleado) => ({
        resourceId: emp.$id,
        resourceTitle: emp.nombre_completo || `${emp.nombre} ${emp.apellidos}`,
      }));
     console.log('[Agenda Component - useMemo resources] Recursos calculados:', filteredResources);
     return filteredResources;
  }, [allEmpleados, selectedEmpleadosIds]);

  // useMemo para EVENTOS (Corregido con Array.isArray)
  const events: CalendarEvent[] = useMemo(() => {
    console.log('%c[Agenda Component - useMemo events] Iniciando cálculo de eventos...', 'color: darkcyan;');
    console.log('[Agenda Component - useMemo events] Input citasDelDia:', citasDelDia);
    console.log(`[Agenda Component - useMemo events] Estado clientes: loading=${loadingClientes}, data is array=${Array.isArray(clientesData)}`);

    if (!citasDelDia || loadingClientes || !Array.isArray(clientesData)) {
        console.warn('[Agenda Component - useMemo events] Devolviendo array vacío (faltan citas, clientes cargando, o clientesData no es un array)');
        return [];
    }

    const clienteMap = new Map(clientesData.map((c: Cliente) => [c.$id, c]));
    console.log('[Agenda Component - useMemo events] Mapa de clientes creado, tamaño:', clienteMap.size);

    const transformedEvents = citasDelDia.map((cita: Cita & Models.Document, index: number) => {
      // console.log(`%c[Agenda Component - useMemo events] Procesando cita[${index}] ID: ${cita.$id}`, 'color: gray;', cita);

      if (!cita.fecha_hora || typeof cita.fecha_hora !== 'string') { console.warn(`[Agenda Component - useMemo events] Saltando cita ${cita.$id}: fecha_hora inválida o ausente.`); return null;}
      if (!cita.empleado_id) { console.warn(`[Agenda Component - useMemo events] Saltando cita ${cita.$id}: empleado_id ausente.`); return null;}
      let duration = 60;
      if (typeof cita.duracion === 'number' && cita.duracion > 0) { duration = cita.duracion; }
      else { console.warn(`[Agenda Component - useMemo events] Cita ${cita.$id}: Duración inválida (${cita.duracion}), usando default 60min.`); }

      let start, end;
      try {
           start = parseISO(cita.fecha_hora);
           if (!isValid(start)) { throw new Error('Fecha de inicio inválida después de parsear'); }
           end = addMinutes(start, duration);
      } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error(`[Agenda Component - useMemo events] Error procesando fechas para cita ${cita.$id}: Fecha='${cita.fecha_hora}', Error='${errorMessage}'`);
          return null;
       }

      const cliente = clienteMap.get(cita.cliente_id);
      const clienteNombreCompleto = cliente?.nombre_completo || `${cliente?.nomcli || ''} ${cliente?.ape1cli || ''}`.trim();
      const clienteInfo = `${clienteNombreCompleto || 'Cliente?'} (${cliente?.tel1cli || 'Sin Tlf'})`;

      let tratamientos = 'Artículo no especificado';
      try {
         if (cita.articulos && typeof cita.articulos === 'string' && cita.articulos.trim().startsWith('[')) {
            const arts: unknown = JSON.parse(cita.articulos);
            if (Array.isArray(arts) && arts.length > 0) {
                tratamientos = arts.map(String).filter(art => art.trim() !== '').join(', ');
                if (!tratamientos) tratamientos = 'Artículo(s) vacío(s)';
            } else { tratamientos = cita.articulos; }
        } else if (typeof cita.articulos === 'string' && cita.articulos.trim() !== '') { tratamientos = cita.articulos; }
      } catch (e) { tratamientos = typeof cita.articulos === 'string' ? cita.articulos : 'Error parseo Arts.'; }
      if (!tratamientos || tratamientos.trim() === '') tratamientos = 'Artículo no especificado';

      const title = `${clienteInfo} - ${tratamientos}`;

      const eventData: CalendarEvent = {
        title: title, start: start, end: end, resourceId: cita.empleado_id, data: cita, clienteInfo: clienteInfo, tratamientos: tratamientos,
      };
      return eventData;

    }).filter((event): event is CalendarEvent => event !== null);

    console.log('%c[Agenda Component - useMemo events] Array final de eventos transformados:', 'color: darkcyan; font-weight: bold;', transformedEvents);
    return transformedEvents;

  }, [citasDelDia, clientesData, loadingClientes]);


  const isLoading = loadingCitas || loadingEmpleados || loadingClientes;
  const hasError = errorCitas || errorEmpleados || errorClientes;

  // Manejadores
  const handleOpenCreateDialog = () => {
    setCitaToEdit(null);
    setFormInitialDate(new Date());
    setIsDialogOpen(true);
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date; resourceId?: string | number }) => {
    console.log('[Agenda Component] handleSelectSlot llamado:', slotInfo);
    setCitaToEdit(null);
    setFormInitialDate(slotInfo.start);
    setIsDialogOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    console.log('[Agenda Component] handleSelectEvent llamado:', event);
    handleOpenEditDialog(event.data);
  };

  const handleOpenEditDialog = (cita: Cita & Models.Document) => {
    setCitaToEdit(cita);
    setFormInitialDate(undefined);
    setIsDialogOpen(true);
  };

  const handleNavigate = (newDate: Date) => {
    console.log('[Agenda Component] handleNavigate llamado con fecha:', newDate);
    setSelectedDate(startOfDay(newDate));
  };

  const handleEmpleadoSelectToggle = (empleadoId: string) => {
    setSelectedEmpleadosIds(prevIds => {
      const isCurrentlySelected = prevIds.includes(empleadoId);
      if (isCurrentlySelected) {
        console.log(`[Agenda Component] Deseleccionando empleado: ${empleadoId}`);
        return prevIds.filter(id => id !== empleadoId);
      } else {
        console.log(`[Agenda Component] Seleccionando empleado: ${empleadoId}`);
        return [...prevIds, empleadoId];
      }
    });
  };

  const handleDeleteCita = async (cita: Cita & Models.Document) => {
    if (!window.confirm('¿Está seguro de eliminar esta cita?')) return;
    
    try {
      await deleteCitaMutation.mutateAsync({ 
        id: cita.$id,
        fechaCita: cita.fecha_hora 
      });
      toast({
        title: 'Cita eliminada',
        description: 'La cita ha sido eliminada correctamente.',
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('[Agenda Component] Error al eliminar cita:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la cita.',
        variant: 'destructive',
      });
    }
  };

  const handleFormSubmit = async (data: LipooutUserInput<CitaInput>) => {
    try {
      if (citaToEdit) {
        await updateCitaMutation.mutateAsync({ id: citaToEdit.$id, data });
        toast({
          title: 'Cita actualizada',
          description: 'La cita ha sido actualizada correctamente.',
        });
      } else {
        await createCitaMutation.mutateAsync(data);
        toast({
          title: 'Cita creada',
          description: 'La cita ha sido creada correctamente.',
        });
      }
      setIsDialogOpen(false);
      setCitaToEdit(null);
    } catch (error) {
      console.error('[Agenda Component] Error al guardar cita:', error);
      toast({
        title: 'Error',
        description: citaToEdit ? 'No se pudo actualizar la cita.' : 'No se pudo crear la cita.',
        variant: 'destructive',
      });
    }
  };

  // CustomEvent
  const CustomEvent = ({ event }: EventProps<CalendarEvent>) => {
      return (
          <div className="rbc-event-content" title={event.title}>
              <strong className="rbc-event-label">{format(event.start, 'HH:mm')}</strong>
              <div className="text-xs overflow-hidden">
                  <p className="font-semibold truncate">{event.clienteInfo}</p>
                  <p className="truncate">{event.tratamientos}</p>
              </div>
          </div>
      );
  };

  // Renderizado principal (JSX)
  return (
    <div className="space-y-6">
       {/* Header */}
        <div className="flex justify-between items-center">
             <div>
                <h1 className="text-3xl font-bold">Agenda</h1>
                <p className="text-muted-foreground">Gestión de citas por profesional.</p>
             </div>
             <div className="flex items-center gap-2">
                 <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <Users className="w-4 h-4 mr-2" />
                          {/* CORRECCIÓN TypeError: Usar optional chaining y fallback */}
                          Empleados ({selectedEmpleadosIds.length}/{allEmpleados?.length ?? 0})
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                         <DropdownMenuLabel>Mostrar Empleados</DropdownMenuLabel>
                         <DropdownMenuSeparator />
                         {loadingEmpleados ? (
                           <DropdownMenuItem disabled>Cargando...</DropdownMenuItem>
                         ) : Array.isArray(allEmpleados) && allEmpleados.length > 0 ? (
                           allEmpleados.map((emp: Empleado & Models.Document) => (
                             <DropdownMenuCheckboxItem
                               key={emp.$id}
                               checked={selectedEmpleadosIds.includes(emp.$id)}
                               onCheckedChange={() => handleEmpleadoSelectToggle(emp.$id)}
                             >
                               {emp.nombre_completo || `${emp.nombre} ${emp.apellidos}`}
                               {!emp.activo && " (Inactivo)"}
                             </DropdownMenuCheckboxItem>
                           ))
                         ) : (
                            <DropdownMenuItem disabled>No hay empleados</DropdownMenuItem>
                         )}
                         <DropdownMenuSeparator />
                         <DropdownMenuItem
                           onSelect={() => {
                               const activeIds = Array.isArray(allEmpleados)
                                   ? allEmpleados.filter(e => e.activo).map(e => e.$id)
                                   : [];
                               console.log("[Agenda Component] Seleccionando todos los activos:", activeIds);
                               setSelectedEmpleadosIds(activeIds);
                           }}
                           className="cursor-pointer"
                           disabled={!Array.isArray(allEmpleados) || allEmpleados.filter(e => e.activo).length === 0}
                         >
                           Seleccionar todos (activos)
                         </DropdownMenuItem>
                         <DropdownMenuItem
                           onSelect={() => {
                               console.log("[Agenda Component] Deseleccionando todos");
                               setSelectedEmpleadosIds([]);
                           }}
                           className="cursor-pointer text-destructive"
                           disabled={selectedEmpleadosIds.length === 0}
                         >
                           No seleccionar ninguno
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                 </DropdownMenu>
                 <Button onClick={handleOpenCreateDialog}>
                     <PlusCircle className="w-4 h-4 mr-2" />
                     Nueva Cita
                 </Button>
             </div>
        </div>

      {/* Card Contenedor Calendario */}
      <Card>
          <CardHeader>
              <CardTitle>Citas para: {fechaSeleccionadaFormateada}</CardTitle>
              {isFetching && <CardDescription className="text-blue-600 animate-pulse">Actualizando citas...</CardDescription>}
              {!isFetching && <CardDescription>Haga clic en un hueco para crear una cita o en una cita existente para editarla.</CardDescription>}
          </CardHeader>
          <CardContent className="p-2 md:p-4">
              {/* Estados de Carga y Error */}
              {isLoading && !isFetching && (
                  <div className="flex justify-center py-20"><LoadingSpinner /></div>
              )}
              {hasError && (
                  <p className="text-center text-destructive py-20">
                    Error al cargar datos.
                    {errorCitas && <span> (Citas: {errorCitas instanceof Error ? errorCitas.message : String(errorCitas)})</span>}
                    {errorEmpleados && <span> (Empleados: {errorEmpleados instanceof Error ? errorEmpleados.message : String(errorEmpleados)})</span>}
                    {errorClientes && <span> (Clientes: {errorClientes instanceof Error ? errorClientes.message : String(errorClientes)})</span>}
                  </p>
              )}

              {/* Contenido Principal: Mensaje o Calendario */}
              {!isLoading && !hasError && (
                <>
                  {/* Mensaje si no hay empleados o no seleccionados */}
                  {resources.length === 0 && !loadingEmpleados ? (
                     <p className="text-center text-muted-foreground py-20">
                        {(!Array.isArray(allEmpleados) || allEmpleados.length === 0)
                          ? "No hay empleados definidos en el sistema."
                          : "No se han seleccionado empleados para mostrar."
                        }
                        <br />
                        {Array.isArray(allEmpleados) && allEmpleados.length > 0 && "Utilice el filtro de \"Empleados\" para seleccionar al menos uno."}
                     </p>
                  ) : (
                    // Mostrar calendario si hay recursos o si empleados aún carga
                    (resources.length > 0 || loadingEmpleados) &&
                    <div style={{ height: '75vh', minHeight: '600px' }}>
                      <BigCalendar
                        localizer={localizer}
                        culture='es'
                        events={events} // Pasar los eventos ¡Corregido!
                        resources={resources}
                        defaultView={Views.DAY}
                        views={[Views.DAY, Views.WEEK]}
                        date={selectedDate} // Controlado por el estado
                        onNavigate={handleNavigate} // Manejador para botones
                        onSelectEvent={handleSelectEvent}
                        onSelectSlot={handleSelectSlot}
                        selectable={true}
                        step={15}
                        timeslots={4}
                        min={new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 8, 0, 0)}
                        max={new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 21, 0, 0)}
                        resourceAccessor="resourceId"
                        resourceTitleAccessor="resourceTitle"
                        messages={{
                          next: "Siguiente", previous: "Anterior", today: "Hoy", month: "Mes", week: "Semana", day: "Día", agenda: "Agenda",
                          date: "Fecha", time: "Hora", event: "Evento", noEventsInRange: "No hay citas programadas para este día.",
                          showMore: total => `+${total} más`
                        }}
                        components={{
                            event: CustomEvent,
                        }}
                      />
                    </div>
                  )}
                </>
              )}
          </CardContent>
      </Card>

      {/* Dialog para Crear/Editar Cita */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
           <DialogContent className="max-w-2xl">
              <DialogHeader>
                 <DialogTitle>{citaToEdit ? 'Editar Cita' : 'Crear Nueva Cita'}</DialogTitle>
              </DialogHeader>
              <CitaForm
                citaInicial={citaToEdit}
                fechaInicial={formInitialDate}
                onSubmit={handleFormSubmit}
                isSubmitting={createCitaMutation.isPending || updateCitaMutation.isPending}
              />
           </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agenda;
