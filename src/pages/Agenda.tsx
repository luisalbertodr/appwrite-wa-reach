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
  const { toast } = useToast();
  
  // --- MODIFICACIÓN: Hook para obtener usuario actual ---
  const { data: currentUser } = useUser();
  // --- FIN MODIFICACIÓN ---

  // --- MODIFICACIÓN: Estado con inicialización desde localStorage ---
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (!currentUser?.$id) return startOfDay(new Date());
    
    try {
      const storageKey = `agenda-position-date-${currentUser.$id}`;
      const savedDate = localStorage.getItem(storageKey);
      
      if (savedDate) {
        const parsedDate = parseISO(savedDate);
        if (isValid(parsedDate)) {
          console.log('[Agenda Component - useState selectedDate] Cargando fecha guardada:', parsedDate);
          return startOfDay(parsedDate);
        }
      }
    } catch (error) {
      console.error('[Agenda Component - useState selectedDate] Error al cargar fecha:', error);
    }
    
    return startOfDay(new Date());
  });

  const [view, setView] = useState<View>(() => {
    if (!currentUser?.$id) return Views.DAY;
    
    try {
      const storageKey = `agenda-position-view-${currentUser.$id}`;
      const savedView = localStorage.getItem(storageKey);
      
      if (savedView && (savedView === Views.DAY || savedView === Views.WEEK)) {
        console.log('[Agenda Component - useState view] Cargando vista guardada:', savedView);
        return savedView as View;
      }
    } catch (error) {
      console.error('[Agenda Component - useState view] Error al cargar vista:', error);
    }
    
    return Views.DAY;
  });
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

  // Efecto para guardar selectedDate en localStorage
  useEffect(() => {
    if (!currentUser?.$id) return;
    
    const storageKey = `agenda-position-date-${currentUser.$id}`;
    
    try {
      localStorage.setItem(storageKey, selectedDate.toISOString());
      console.log('[Agenda Component - useEffect save date] Fecha guardada en localStorage:', selectedDate);
    } catch (error) {
      console.error('[Agenda Component - useEffect save date] Error al guardar fecha:', error);
    }
  }, [currentUser?.$id, selectedDate]);

  // Efecto para guardar view en localStorage
  useEffect(() => {
    if (!currentUser?.$id) return;
    
    const storageKey = `agenda-position-view-${currentUser.$id}`;
    
    try {
      localStorage.setItem(storageKey, view);
      console.log('[Agenda Component - useEffect save view] Vista guardada en localStorage:', view);
    } catch (error) {
      console.error('[Agenda Component - useEffect save view] Error al guardar vista:', error);
    }
  }, [currentUser?.$id, view]);


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

      let tratamientos = 'Sin tratamientos';
      try {
        if (cita.articulos && typeof cita.articulos === 'string') {
          const arts = JSON.parse(cita.articulos);
          if (Array.isArray(arts) && arts.length > 0) {
            tratamientos = arts.map((art: any) => {
              // Manejar TiempoNoBillable
              if (art.tipo === 'tiempo_no_billable') {
                return art.nombre || 'Tiempo';
              }
              // Manejar ArticuloEnCita
              return art.articulo_nombre || 'Tratamiento';
            }).join(', ');
          }
        }
      } catch (e) {
        console.error(`Error al parsear artículos de cita ${cita.$id}:`, e);
        tratamientos = 'Error en artículos';
      }

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

  // CustomEvent - Componente mejorado para mostrar información gráfica de la cita
  const CustomEvent = ({ event }: EventProps<CalendarEvent>) => {
      const cita = event.data;
      const duracionMinutos = cita.duracion || 60;
      const duracionTexto = duracionMinutos >= 60 
        ? `${Math.floor(duracionMinutos / 60)}h ${duracionMinutos % 60 > 0 ? duracionMinutos % 60 + 'm' : ''}`.trim()
        : `${duracionMinutos}m`;

      // Parsear artículos para obtener tratamientos detallados
      let articulosDetalle: any[] = [];
      try {
        if (cita.articulos && typeof cita.articulos === 'string') {
          articulosDetalle = JSON.parse(cita.articulos);
        }
      } catch (e) {
        console.error('Error al parsear artículos en CustomEvent:', e);
      }

      // Obtener recursos únicos de los artículos (cabinas y equipos)
      let recursosData: { cabinas: string[], equipos: string[] } = { cabinas: [], equipos: [] };
      const cabinaIds = new Set<string>();
      const equipoIds = new Set<string>();
      
      articulosDetalle.forEach((art: any) => {
        // Recopilar sala_id si existe
        if (art.sala_id && art.sala_id !== 'ninguna') {
          cabinaIds.add(art.sala_id);
        }
        // Recopilar equipamiento_ids si existe
        if (art.equipamiento_ids && Array.isArray(art.equipamiento_ids)) {
          art.equipamiento_ids.forEach((id: string) => equipoIds.add(id));
        }
      });
      
      recursosData.cabinas = Array.from(cabinaIds);
      recursosData.equipos = Array.from(equipoIds);

      // Obtener color de estado
      const estadoColors: Record<string, string> = {
        'Pendiente': 'bg-yellow-100 border-yellow-400',
        'Confirmada': 'bg-blue-100 border-blue-400',
        'En curso': 'bg-green-100 border-green-400',
        'Completada': 'bg-gray-100 border-gray-400',
        'Cancelada': 'bg-red-100 border-red-400',
        'No asistió': 'bg-orange-100 border-orange-400',
      };
      const estadoColor = estadoColors[cita.estado || 'Pendiente'] || 'bg-gray-100 border-gray-400';

      return (
          <div className={`rbc-event-content h-full flex flex-col p-1 text-xs ${estadoColor} border-l-4 rounded-sm`} title={event.title}>
              {/* Cabecera: Hora y Duración */}
              <div className="flex justify-between items-start mb-0.5">
                  <strong className="text-xs font-bold">{format(event.start, 'HH:mm')}</strong>
                  <span className="text-[10px] opacity-70 font-medium">{duracionTexto}</span>
              </div>

              {/* Cliente */}
              <div className="font-semibold truncate text-xs leading-tight mb-0.5">
                  {event.clienteInfo}
              </div>

              {/* Tratamientos con íconos de progreso */}
              {articulosDetalle.length > 0 && (
                <div className="space-y-0.5 mb-1">
                  {articulosDetalle.slice(0, 3).map((art: any, idx: number) => {
                    const nombre = art.tipo === 'tiempo_no_billable' 
                      ? (art.nombre || 'Tiempo') 
                      : (art.articulo_nombre || 'Tratamiento');
                    const duracion = art.duracion || 0;
                    
                    return (
                      <div key={idx} className="flex items-center gap-1 text-[10px]">
                        <div className="w-1 h-1 rounded-full bg-current opacity-60" />
                        <span className="truncate flex-1">{nombre}</span>
                        <span className="opacity-60">{duracion}m</span>
                      </div>
                    );
                  })}
                  {articulosDetalle.length > 3 && (
                    <div className="text-[10px] opacity-60 text-center">
                      +{articulosDetalle.length - 3} más
                    </div>
                  )}
                </div>
              )}

              {/* Recursos (Cabinas y Equipos) */}
              {(recursosData.cabinas.length > 0 || recursosData.equipos.length > 0) && (
                <div className="mt-auto pt-1 border-t border-current/10">
                  {recursosData.cabinas.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] opacity-70 mb-0.5">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="truncate">{recursosData.cabinas.join(', ')}</span>
                    </div>
                  )}
                  {recursosData.equipos.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] opacity-70">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      <span className="truncate">{recursosData.equipos.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
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
                    resourceIdAccessor={(resource: any) => resource.resourceId}
                    // Define cómo acceder al Título del array 'resources'
                    resourceTitleAccessor={(resource: any) => resource.resourceTitle}
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
