import { useState, useMemo, useEffect } from 'react';
import { Models } from 'appwrite';
import {
  useGetCitasPorDia,
  useGetCitasPorSemana,
  useCreateCita,
  useUpdateCita,
  useDeleteCita
} from '@/hooks/useAgenda';
import { useGetEmpleados } from '@/hooks/useEmpleados';
import { useUser } from '@/hooks/useAuth';
// Asumiendo que useGetClientes devuelve Cliente[] | undefined
import { useGetClientes } from '@/hooks/useClientes';
import { Cita, CitaInput, LipooutUserInput } from '@/types';
import { Cliente } from '@/types/cliente.types';
import { Empleado } from '@/types/empleado.types';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; // CardHeader y CardTitle eliminados
import LoadingSpinner from '@/components/LoadingSpinner';

import { Calendar as BigCalendarBase, dateFnsLocalizer, View, EventProps, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
// --- MODIFICACIÓN: addDays añadido ---
import { format, parse, getDay, startOfWeek, startOfDay, parseISO, addMinutes, isValid, addDays } from 'date-fns';
import { es, Locale } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const BigCalendar = withDragAndDrop<CalendarEvent>(BigCalendarBase);

// --- MODIFICACIÓN: Iconos y ToggleGroup añadidos ---
import { Users, ChevronLeft, ChevronRight, CalendarIcon, CalendarDays, CalendarRange } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
// --- FIN MODIFICACIÓN ---

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
  
  // --- MODIFICACIÓN: Hook para obtener usuario actual ---
  const { data: currentUser } = useUser();
  // --- FIN MODIFICACIÓN ---

  // --- MODIFICACIÓN: Estado de la vista añadido ---
  const [view, setView] = useState<View>(Views.DAY);
  // --- FIN MODIFICACIÓN ---

  // --- MODIFICACIÓN: Uso condicional del hook según la vista ---
  const { data: citasDelDia, isLoading: loadingCitasDia, error: errorCitasDia, isFetching: isFetchingDia } = useGetCitasPorDia(
      view === Views.DAY ? selectedDate : undefined
  );
  const { data: citasDeLaSemana, isLoading: loadingCitasSemana, error: errorCitasSemana, isFetching: isFetchingSemana } = useGetCitasPorSemana(
      view === Views.WEEK ? selectedDate : undefined
  );
  
  // Combinar estados de carga según la vista activa
  const citasActuales = view === Views.DAY ? citasDelDia : citasDeLaSemana;
  const loadingCitas = view === Views.DAY ? loadingCitasDia : loadingCitasSemana;
  const errorCitas = view === Views.DAY ? errorCitasDia : errorCitasSemana;
  const isFetching = view === Views.DAY ? isFetchingDia : isFetchingSemana;
  // --- FIN MODIFICACIÓN ---

  const { data: empleadosData, isLoading: loadingEmpleados, error: errorEmpleados } = useGetEmpleados(false);
  const { data: clientesData, isLoading: loadingClientes, error: errorClientes } = useGetClientes();

  const createCitaMutation = useCreateCita();
  const updateCitaMutation = useUpdateCita();
  const deleteCitaMutation = useDeleteCita();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [citaToEdit, setCitaToEdit] = useState<(Cita & Models.Document) | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<Date | undefined>(new Date());
  const [formInitialEmpleado, setFormInitialEmpleado] = useState<string | undefined>(undefined);
  const [selectedEmpleadosIds, setSelectedEmpleadosIds] = useState<string[]>([]);

  const fechaSeleccionadaFormateada = selectedDate
      ? format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: es })
      : 'Seleccione una fecha';
  
  // Capitalizar la fecha
  const fechaCapitalizada = fechaSeleccionadaFormateada.charAt(0).toUpperCase() + fechaSeleccionadaFormateada.slice(1);


  // Log datos de citas según la vista
    useEffect(() => {
     console.log(`%c[Agenda Component] Datos de citas (Vista: ${view}):`, 'color: purple; font-weight: bold;', citasActuales);
     console.log(`%c[Agenda Component] Estado Carga Citas: isLoading=${loadingCitas}, isFetching=${isFetching}, hasError=${!!errorCitas}`, 'color: purple;');
     if (errorCitas) {
         console.error('[Agenda Component] Error en citas:', errorCitas);
     }
  }, [citasActuales, view, loadingCitas, isFetching, errorCitas]);

  // Lista completa empleados
  const allEmpleados = useMemo(() => {
    console.log('[Agenda Component - useMemo allEmpleados] Input empleadosData:', empleadosData);
    const result = empleadosData || []; // Fallback a array vacío
    console.log('[Agenda Component - useMemo allEmpleados] Output allEmpleados:', result);
    return result;
  }, [empleadosData]);

  // Efecto para cargar selección de empleados desde localStorage
  useEffect(() => {
    if (!currentUser?.$id || !Array.isArray(allEmpleados) || allEmpleados.length === 0 || loadingEmpleados) {
      return;
    }

    const storageKey = `agenda-selected-empleados-${currentUser.$id}`;
    
    try {
      const savedSelection = localStorage.getItem(storageKey);
      
      if (savedSelection) {
        const parsedSelection = JSON.parse(savedSelection) as string[];
        
        // Validar que los IDs guardados existen en la lista actual de empleados
        const validIds = parsedSelection.filter(id => 
          allEmpleados.some((emp: Empleado) => emp.$id === id)
        );
        
        if (validIds.length > 0) {
          console.log('[Agenda Component - useEffect localStorage] Cargando selección guardada:', validIds);
          setSelectedEmpleadosIds(validIds);
          return;
        }
      }
      
      // Si no hay selección guardada o no es válida, usar empleados activos por defecto
      const activeEmpleadosIds = allEmpleados
        .filter((emp: Empleado) => emp.activo)
        .map((emp: Empleado) => emp.$id);
      
      console.log('[Agenda Component - useEffect localStorage] Usando empleados activos por defecto:', activeEmpleadosIds);
      setSelectedEmpleadosIds(activeEmpleadosIds);
      
    } catch (error) {
      console.error('[Agenda Component - useEffect localStorage] Error al cargar selección:', error);
      
      // En caso de error, usar empleados activos por defecto
      const activeEmpleadosIds = allEmpleados
        .filter((emp: Empleado) => emp.activo)
        .map((emp: Empleado) => emp.$id);
      
      setSelectedEmpleadosIds(activeEmpleadosIds);
    }
  }, [currentUser?.$id, allEmpleados, loadingEmpleados]);

  // Efecto para guardar selección de empleados en localStorage
  useEffect(() => {
    if (!currentUser?.$id || selectedEmpleadosIds.length === 0) {
      return;
    }

    const storageKey = `agenda-selected-empleados-${currentUser.$id}`;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(selectedEmpleadosIds));
      console.log('[Agenda Component - useEffect save] Selección guardada en localStorage:', selectedEmpleadosIds);
    } catch (error) {
      console.error('[Agenda Component - useEffect save] Error al guardar selección:', error);
    }
  }, [currentUser?.$id, selectedEmpleadosIds]);

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
    console.log('[Agenda Component - useMemo events] Input citasActuales:', citasActuales);
    console.log(`[Agenda Component - useMemo events] Estado clientes: loading=${loadingClientes}, data is array=${Array.isArray(clientesData)}`);

    if (!citasActuales || loadingClientes || !Array.isArray(clientesData)) {
        console.warn('[Agenda Component - useMemo events] Devolviendo array vacío (faltan citas, clientes cargando, o clientesData no es un array)');
        return [];
    }

    const clienteMap = new Map(clientesData.map((c: Cliente) => [c.$id, c]));
    console.log('[Agenda Component - useMemo events] Mapa de clientes creado, tamaño:', clienteMap.size);

    const transformedEvents = citasActuales.map((cita: Cita & Models.Document, index: number) => {
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
             // CORRECCIÓN: Mapear por 'articulo_nombre' en lugar de 'String'
             tratamientos = arts.map((art: any) => art.articulo_nombre || 'Desconocido').join(', ');
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

  }, [citasActuales, clientesData, loadingClientes]);


  const isLoading = loadingCitas || loadingEmpleados || loadingClientes;
  const hasError = errorCitas || errorEmpleados || errorClientes;

  // Manejadores
  // --- MODIFICACIÓN: handleOpenCreateDialog eliminado (se crea al hacer clic en slot) ---

  const handleSelectSlot = (slotInfo: { start: Date; end: Date; resourceId?: string | number }) => {
    console.log('[Agenda Component] handleSelectSlot llamado:', slotInfo);
    setCitaToEdit(null);
    setFormInitialDate(slotInfo.start);
    setFormInitialEmpleado(slotInfo.resourceId ? String(slotInfo.resourceId) : undefined);
    setIsDialogOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    console.log('[Agenda Component] handleSelectEvent llamado:', event);
    handleOpenEditDialog(event.data);
  };

  const handleOpenEditDialog = (cita: Cita & Models.Document) => {
    setCitaToEdit(cita);
    setFormInitialDate(undefined);
    setFormInitialEmpleado(undefined); 
    setIsDialogOpen(true);
  };

  const handleNavigate = (newDate: Date) => {
    console.log('[Agenda Component] handleNavigate llamado con fecha:', newDate);
    setSelectedDate(startOfDay(newDate));
  };

  // --- INICIO MODIFICACIÓN: Nuevos manejadores para la barra ---
  const handleViewChange = (newView: View) => {
    if (newView) setView(newView); // Solo actualiza si hay un valor (evita deseleccionar)
  };
  const goToBack = () => handleNavigate(addDays(selectedDate, view === Views.WEEK ? -7 : -1));
  const goToNext = () => handleNavigate(addDays(selectedDate, view === Views.WEEK ? 7 : 1));
  const goToCurrent = () => handleNavigate(new Date());
  // --- FIN MODIFICACIÓN ---

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

  // Manejador para arrastrar y soltar eventos (mover citas)
  const handleEventDrop = async ({ event, start, end, resourceId }: any) => {
    console.log('[Agenda Component] handleEventDrop llamado:', { event, start, end, resourceId });
    
    try {
      const cita = event.data;
      const nuevaFechaHora = start.toISOString();
      const nuevaEmpleadaId = resourceId || cita.empleado_id;
      
      // Actualizar la cita con la nueva fecha/hora y empleada
      const dataToUpdate: LipooutUserInput<CitaInput> = {
        cliente_id: cita.cliente_id,
        empleado_id: nuevaEmpleadaId,
        fecha_hora: nuevaFechaHora,
        duracion: cita.duracion,
        articulos: cita.articulos,
        comentarios: cita.comentarios,
        estado: cita.estado,
        recursos_cabina: cita.recursos_cabina,
        recursos_aparatos: cita.recursos_aparatos,
        datos_clinicos: cita.datos_clinicos,
        precio_total: cita.precio_total,
      };

      await updateCitaMutation.mutateAsync({ id: cita.$id, data: dataToUpdate });
      
      toast({
        title: 'Cita movida',
        description: 'La cita ha sido movida correctamente.',
      });
    } catch (error) {
      console.error('[Agenda Component] Error al mover cita:', error);
      toast({
        title: 'Error',
        description: 'No se pudo mover la cita.',
        variant: 'destructive',
      });
    }
  };

  // Manejador para redimensionar eventos (cambiar duración)
  const handleEventResize = async ({ event, start, end }: any) => {
    console.log('[Agenda Component] handleEventResize llamado:', { event, start, end });
    
    try {
      const cita = event.data;
      const nuevaDuracion = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // Duración en minutos
      
      // Actualizar la cita con la nueva duración
      const dataToUpdate: LipooutUserInput<CitaInput> = {
        cliente_id: cita.cliente_id,
        empleado_id: cita.empleado_id,
        fecha_hora: start.toISOString(),
        duracion: nuevaDuracion,
        articulos: cita.articulos,
        comentarios: cita.comentarios,
        estado: cita.estado,
        recursos_cabina: cita.recursos_cabina,
        recursos_aparatos: cita.recursos_aparatos,
        datos_clinicos: cita.datos_clinicos,
        precio_total: cita.precio_total,
      };

      await updateCitaMutation.mutateAsync({ id: cita.$id, data: dataToUpdate });
      
      toast({
        title: 'Duración actualizada',
        description: 'La duración de la cita ha sido actualizada correctamente.',
      });
    } catch (error) {
      console.error('[Agenda Component] Error al redimensionar cita:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la duración de la cita.',
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
    <div className="space-y-4"> {/* Reducido el espacio */}
        
        {/* --- INICIO MODIFICACIÓN: Nueva Barra de Herramientas --- */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Lado Izquierdo: Título y Filtro Empleados */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <h1 className="text-2xl font-bold hidden xl:block">Agenda</h1>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Users className="w-4 h-4 mr-2" />
                  Empleados ({selectedEmpleadosIds.length}/{allEmpleados?.length ?? 0})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
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
          </div>
          
          {/* Lado Derecho: Controles de Navegación y Vista */}
          <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
            {/* Título de Fecha (Día que se muestra) */}
            <h2 className="text-lg sm:text-xl font-semibold text-center whitespace-nowrap order-1 sm:order-none">
              {fechaCapitalizada}
            </h2>
            
            {/* Controles */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 w-full">
              <Button variant="outline" size="icon" onClick={goToBack} aria-label="Anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToCurrent} className="px-2 sm:px-3 flex-1 sm:flex-none">
                 Hoy
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext} aria-label="Siguiente">
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <div className="border-l h-8 mx-1 sm:mx-2" /> 

              <ToggleGroup
                type="single"
                variant="outline"
                value={view}
                onValueChange={(v) => handleViewChange(v as View)}
                className="flex-1 sm:flex-none"
              >
                <ToggleGroupItem value={Views.DAY} aria-label="Vista día" className="px-2 sm:px-3">
                  <CalendarRange className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Día</span>
                </ToggleGroupItem>
                <ToggleGroupItem value={Views.WEEK} aria-label="Vista semana" className="px-2 sm:px-3">
                  <CalendarDays className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Semana</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
        {/* --- FIN MODIFICACIÓN: Nueva Barra de Herramientas --- */}


      {/* Card Contenedor Calendario */}
      <Card>
        {/* --- MODIFICACIÓN: CardHeader eliminado --- */}
        <CardContent className="p-0 sm:p-2 md:p-4"> {/* Padding ajustado */}
          
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
                <div style={{ height: 'calc(100vh - 180px)', minHeight: '600px' }}> {/* Altura ajustada */}
                  <BigCalendar
                    localizer={localizer}
                    culture='es'
                    events={events} 
                    resources={resources}
                    view={view} // --- MODIFICACIÓN: Controlado por estado
                    onView={(v) => handleViewChange(v as View)} // --- MODIFICACIÓN: Controlado por estado
                    toolbar={false} // --- MODIFICACIÓN: Barra original oculta
                    views={[Views.DAY, Views.WEEK]}
                    date={selectedDate} 
                    onNavigate={handleNavigate} 
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    selectable={true}
                    step={15}
                    timeslots={4}
                    min={new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 8, 0, 0)}
                    max={new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 21, 0, 0)}
                    
                    // --- CORRECCIÓN EXPLÍCITA ---
                    // Define cómo acceder al ID del array 'resources'
                    resourceIdAccessor="resourceId" 
                    // Define cómo acceder al Título del array 'resources'
                    resourceTitleAccessor="resourceTitle" 
                    // Define cómo acceder al ID de recurso desde un 'event'
                    resourceAccessor="resourceId" 
                    
                    // --- DRAG AND DROP HANDLERS ---
                    onEventDrop={handleEventDrop}
                    onEventResize={handleEventResize}
                    resizable={true}
                    
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
              empleadoInicial={formInitialEmpleado} 
              onSubmit={handleFormSubmit}
              isSubmitting={createCitaMutation.isPending || updateCitaMutation.isPending}
            />
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agenda;
