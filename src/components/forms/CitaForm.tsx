import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CitaFormData, citaSchema } from '@/lib/validators';
import { Cita, CitaInput, Cliente, Articulo, Empleado, LipooutUserInput } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from "@/components/ui/calendar";
import { useGetClientes } from '@/hooks/useClientes';
import { useGetArticulos } from '@/hooks/useArticulos';
import { useGetEmpleados } from '@/hooks/useEmpleados';
import LoadingSpinner from '../LoadingSpinner';
import { format, parseISO, setHours, setMinutes, setSeconds, isValid, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, UserSearch, PackageSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CitaFormProps {
  citaInicial?: (Cita & Models.Document) | null;
  fechaInicial?: Date; // Para pre-rellenar la fecha desde la agenda
  onSubmit: (data: LipooutUserInput<CitaInput>) => Promise<void>;
  isSubmitting: boolean;
}

const defaultValues: CitaFormData = {
  fecha_hora_inicio: '',
  fecha_hora_fin: '',
  cliente_id: '',
  empleado_id: '',
  articulo_id: '',
  estado: 'agendada',
  notas_internas: '',
  notas_cliente: '',
};

// Helper para parsear ISO a HH:mm
const getHoraDeISO = (isoString: string | undefined) => {
  if (!isoString) return "09:00";
  try {
    return format(parseISO(isoString), 'HH:mm');
  } catch (e) { return "09:00"; }
};

// Helper para parsear ISO a Date (para el calendario)
const getDateDeISO = (isoString: string | undefined, fechaInicial?: Date) => {
  if (!isoString) return fechaInicial || new Date();
  try {
    const date = parseISO(isoString);
    return isValid(date) ? date : (fechaInicial || new Date());
  } catch (e) { return fechaInicial || new Date(); }
};


export const CitaForm = ({ citaInicial, fechaInicial, onSubmit, isSubmitting }: CitaFormProps) => {

  // --- Estado local para componentes complejos (buscadores y fechas) ---
  const [clienteSearch, setClienteSearch] = useState('');
  const [articuloSearch, setArticuloSearch] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [articuloPopoverOpen, setArticuloPopoverOpen] = useState(false);
  
  // Estado para fecha y horas (más fácil de manejar que ISO strings)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    getDateDeISO(citaInicial?.fecha_hora_inicio, fechaInicial)
  );
  const [horaInicio, setHoraInicio] = useState(getHoraDeISO(citaInicial?.fecha_hora_inicio)); // "HH:mm"
  const [horaFin, setHoraFin] = useState(getHoraDeISO(citaInicial?.fecha_hora_fin));       // "HH:mm"

  // --- Carga de datos para selectores ---
  const { data: clientes, isLoading: loadingClientes } = useGetClientes(clienteSearch);
  const { data: articulos, isLoading: loadingArticulos } = useGetArticulos(); // Traer todos
  const { data: empleados, isLoading: loadingEmpleados } = useGetEmpleados(true); // Solo activos

  // --- Configuración del Formulario ---
  const getInitialFormValues = (): CitaFormData => {
    if (!citaInicial) {
        return {
            ...defaultValues,
            fecha_hora_inicio: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '', // Placeholder, se recalculará
            fecha_hora_fin: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '', // Placeholder, se recalculará
        };
    }
    return {
      fecha_hora_inicio: citaInicial.fecha_hora_inicio || '',
      fecha_hora_fin: citaInicial.fecha_hora_fin || '',
      cliente_id: citaInicial.cliente?.$id || citaInicial.cliente_id || '',
      empleado_id: citaInicial.empleado?.$id || citaInicial.empleado_id || '',
      articulo_id: citaInicial.articulo?.$id || citaInicial.articulo_id || '',
      estado: citaInicial.estado || 'agendada',
      notas_internas: citaInicial.notas_internas || '',
      notas_cliente: citaInicial.notas_cliente || '',
    };
  };

  const form = useForm<CitaFormData>({
    resolver: zodResolver(citaSchema),
    defaultValues: getInitialFormValues(),
  });

  // --- Lógica de Búsqueda y Selección ---
  const nombreClienteSel = useMemo(() => {
    const id = form.getValues('cliente_id');
    if (!id) return 'Seleccionar Cliente...';
    // Buscar en datos cargados
    const cliente = clientes?.find(c => c.$id === id);
    if (cliente) return cliente.nombre_completo;
    // Buscar en datos iniciales (si estamos editando)
    return citaInicial?.cliente?.nombre_completo || id;
  }, [form.watch('cliente_id'), clientes, citaInicial]);

  const nombreArticuloSel = useMemo(() => {
    const id = form.getValues('articulo_id');
    if (!id) return 'Seleccionar Tratamiento...';
    const articulo = articulos?.find(a => a.$id === id);
    if (articulo) return articulo.nombre;
    return citaInicial?.articulo?.nombre || id;
  }, [form.watch('articulo_id'), articulos, citaInicial]);

  // --- Envío del Formulario ---
  const handleSubmit = async (data: CitaFormData) => {
    
    // Combinar fecha y horas para crear ISO strings
    if (!selectedDate) {
        form.setError("fecha_hora_inicio", { message: "Debe seleccionar una fecha" });
        return;
    }
    
    try {
        const [inicioH, inicioM] = horaInicio.split(':').map(Number);
        const [finH, finM] = horaFin.split(':').map(Number);

        let inicio = setSeconds(setMinutes(setHours(selectedDate, inicioH), inicioM), 0);
        let fin = setSeconds(setMinutes(setHours(selectedDate, finH), finM), 0);
        
        // Validación simple de horas
        if (fin <= inicio) {
             form.setError("fecha_hora_fin", { message: "La hora de fin debe ser posterior a la de inicio" });
             return;
        }

        const duracionMs = fin.getTime() - inicio.getTime();
        const duracionMinutos = Math.round(duracionMs / (1000 * 60));

        // Crear el objeto final para Appwrite (CitaInput)
        const finalData: LipooutUserInput<CitaInput> = {
            ...data,
            fecha_hora_inicio: inicio.toISOString(),
            fecha_hora_fin: fin.toISOString(),
            duracion_minutos: duracionMinutos,
            notas_internas: data.notas_internas || undefined,
            notas_cliente: data.notas_cliente || undefined,
        };
        
        await onSubmit(finalData);

    } catch (e) {
        console.error("Error parsing dates/times", e);
        form.setError("fecha_hora_inicio", { message: "Formato de hora inválido (HH:mm)" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <ScrollArea className="h-[65vh] p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-2">

            {/* --- Cliente (Buscador) --- */}
            <FormField
                control={form.control}
                name="cliente_id"
                render={({ field }) => (
                <FormItem className="flex flex-col md:col-span-2">
                    <FormLabel>Cliente *</FormLabel>
                    <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant="outline" role="combobox" className={cn("justify-between font-normal", !field.value && "text-muted-foreground")}>
                                <span className="truncate">{nombreClienteSel}</span>
                                <UserSearch className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[40vh] p-0" align="start">
                            <Command shouldFilter={false}>
                                <CommandInput placeholder="Buscar cliente..." value={clienteSearch} onValueChange={setClienteSearch}/>
                                <CommandList>
                                    {loadingClientes && <CommandItem disabled><LoadingSpinner/></CommandItem>}
                                    <CommandEmpty>No encontrado.</CommandEmpty>
                                    <CommandGroup>
                                        {clientes?.map((cliente) => (
                                        <CommandItem key={cliente.$id} value={cliente.nombre_completo || cliente.$id} onSelect={() => { field.onChange(cliente.$id); setClientePopoverOpen(false); }}>
                                            {cliente.nombre_completo}
                                        </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />

            {/* --- Fecha (Calendario) --- */}
            <FormItem className="flex flex-col">
                <FormLabel>Fecha *</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn("pl-3 text-left font-normal", !selectedDate && "text-muted-foreground")}
                        >
                        {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Selecciona fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        locale={es}
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
            </FormItem>

             {/* --- Empleado (Selector) --- */}
             <FormField
                control={form.control}
                name="empleado_id"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Profesional *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={loadingEmpleados ? "Cargando..." : "Seleccionar..."} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {!loadingEmpleados && empleados?.map((emp: Empleado) => (
                            <SelectItem key={emp.$id} value={emp.$id}>{emp.nombre_completo}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />

             {/* --- Hora Inicio y Fin --- */}
             <FormItem>
                <FormLabel>Hora Inicio *</FormLabel>
                <FormControl>
                    <Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
                </FormControl>
                <FormMessage />
             </FormItem>
             <FormItem>
                <FormLabel>Hora Fin *</FormLabel>
                <FormControl>
                    <Input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} />
                </FormControl>
                 <FormMessage />
             </FormItem>


            {/* --- Artículo (Buscador) --- */}
             <FormField
                control={form.control}
                name="articulo_id"
                render={({ field }) => (
                <FormItem className="flex flex-col md:col-span-2">
                    <FormLabel>Tratamiento/Servicio *</FormLabel>
                    <Popover open={articuloPopoverOpen} onOpenChange={setArticuloPopoverOpen}>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant="outline" role="combobox" className={cn("justify-between font-normal", !field.value && "text-muted-foreground")}>
                                <span className="truncate">{nombreArticuloSel}</span>
                                <PackageSearch className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[40vh] p-0" align="start">
                            <Command shouldFilter={false}>
                                <CommandInput placeholder="Buscar artículo..." value={articuloSearch} onValueChange={setArticuloSearch}/>
                                <CommandList>
                                    {loadingArticulos && <CommandItem disabled><LoadingSpinner/></CommandItem>}
                                    <CommandEmpty>No encontrado.</CommandEmpty>
                                    <CommandGroup>
                                        {(articuloSearch ? articulos?.filter(a=>a.nombre.toLowerCase().includes(articuloSearch.toLowerCase())) : articulos)
                                        ?.filter(a => a.tipo === 'servicio' || a.tipo === 'bono') // Filtramos solo servicios/bonos
                                        .map((articulo) => (
                                        <CommandItem key={articulo.$id} value={articulo.nombre} onSelect={() => { field.onChange(articulo.$id); setArticuloPopoverOpen(false); }}>
                                            {articulo.nombre} ({articulo.precio.toFixed(2)}€)
                                        </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />

            {/* --- Estado --- */}
             <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="agendada">Agendada</SelectItem>
                            <SelectItem value="confirmada">Confirmada</SelectItem>
                            <SelectItem value="realizada">Realizada</SelectItem>
                            <SelectItem value="cancelada">Cancelada</Sistema>
                            <SelectItem value="no_asistio">No Asistió</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
             />
             
             <div /> {/* Espacio */}

            {/* --- Notas --- */}
            <FormField control={form.control} name="notas_internas" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Notas Internas (No visible por cliente)</FormLabel> <FormControl><Textarea {...field} value={field.value ?? ''} rows={3} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="notas_cliente" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Notas Cliente (Recordatorio)</FormLabel> <FormControl><Textarea {...field} value={field.value ?? ''} rows={3} /></FormControl> <FormMessage /> </FormItem> )}/>

          </div>
        </ScrollArea>
        <div className="flex justify-end p-4 border-t">
          <Button type="submit" disabled={isSubmitting || loadingClientes || loadingArticulos || loadingEmpleados}>
            {isSubmitting ? 'Guardando...' : (citaInicial ? 'Actualizar Cita' : 'Crear Cita')}
          </Button>
        </div>
      </form>
    </Form>
  );
};