import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CitaFormData, citaSchema } from '@/lib/validators';
import { Cita, CitaInput, Empleado, Articulo } from '@/types';
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
import { format, parseISO, setHours, setMinutes, setSeconds, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, UserSearch, PackageSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CitaFormProps {
  citaInicial?: (Cita & Models.Document) | null;
  fechaInicial?: Date;
  onSubmit: (data: CitaInput) => Promise<void>;
  isSubmitting: boolean;
}

const defaultValues: CitaFormData = {
  fecha_hora: '',
  duracion: 60,
  cliente_id: '',
  empleado_id: '',
  articulos: '',
  estado: 'agendada',
  comentarios: '',
  datos_clinicos: '',
  precio_total: 0,
  recursos_cabina: '',
  recursos_aparatos: '',
};

// Helper para parsear ISO a HH:mm
const getHoraDeISO = (isoString: string | undefined) => {
  if (!isoString) return "09:00";
  try {
    return format(parseISO(isoString), 'HH:mm');
  } catch (e) { 
    return "09:00"; 
  }
};

// Helper para parsear ISO a Date (para el calendario)
const getDateDeISO = (isoString: string | undefined, fechaInicial?: Date) => {
  if (!isoString) return fechaInicial || new Date();
  try {
    const date = parseISO(isoString);
    return isValid(date) ? date : (fechaInicial || new Date());
  } catch (e) { 
    return fechaInicial || new Date(); 
  }
};

export const CitaForm = ({ citaInicial, fechaInicial, onSubmit, isSubmitting }: CitaFormProps) => {

  // --- Estado local para componentes complejos (buscadores y fechas) ---
  const [clienteSearch, setClienteSearch] = useState('');
  const [articuloSearch, setArticuloSearch] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [articuloPopoverOpen, setArticuloPopoverOpen] = useState(false);
  
  // Estado para fecha y hora
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    getDateDeISO(citaInicial?.fecha_hora, fechaInicial)
  );
  const [horaInicio, setHoraInicio] = useState(getHoraDeISO(citaInicial?.fecha_hora));
  
  // Estado para artículos seleccionados (para precio total)
  const [articulosSeleccionados, setArticulosSeleccionados] = useState<string[]>([]);

  // --- Carga de datos para selectores ---
  const { data: clientes, isLoading: loadingClientes } = useGetClientes(clienteSearch);
  const { data: articulos, isLoading: loadingArticulos } = useGetArticulos();
  const { data: empleados, isLoading: loadingEmpleados } = useGetEmpleados(true);

  // --- Configuración del Formulario ---
  const getInitialFormValues = (): CitaFormData => {
    if (!citaInicial) {
      return {
        ...defaultValues,
        fecha_hora: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      };
    }

    // Parsear articulos desde JSON string
    let articulosArray: string[] = [];
    try {
      if (citaInicial.articulos) {
        articulosArray = JSON.parse(citaInicial.articulos);
      }
    } catch (e) {
      console.error('Error parsing articulos:', e);
    }

    return {
      fecha_hora: citaInicial.fecha_hora || '',
      duracion: citaInicial.duracion || 60,
      cliente_id: citaInicial.cliente_id || '',
      empleado_id: citaInicial.empleado_id || '',
      articulos: citaInicial.articulos || '',
      estado: citaInicial.estado || 'agendada',
      comentarios: citaInicial.comentarios || '',
      datos_clinicos: citaInicial.datos_clinicos || '',
      precio_total: citaInicial.precio_total || 0,
      recursos_cabina: citaInicial.recursos_cabina || '',
      recursos_aparatos: citaInicial.recursos_aparatos || '',
    };
  };

  const form = useForm<CitaFormData>({
    resolver: zodResolver(citaSchema),
    defaultValues: getInitialFormValues(),
  });

  // Parsear artículos seleccionados al inicio
  useEffect(() => {
    if (citaInicial?.articulos) {
      try {
        const parsed = JSON.parse(citaInicial.articulos);
        setArticulosSeleccionados(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        setArticulosSeleccionados([]);
      }
    }
  }, [citaInicial]);

  // --- Calcular precio total automáticamente ---
  useEffect(() => {
    if (!articulos || articulosSeleccionados.length === 0) {
      form.setValue('precio_total', 0);
      return;
    }
    
    const total = articulosSeleccionados.reduce((sum, artId) => {
      const articulo = articulos.find(a => a.$id === artId);
      return sum + (articulo?.precio || 0);
    }, 0);
    
    form.setValue('precio_total', total);
  }, [articulosSeleccionados, articulos, form]);

  // --- Lógica de Búsqueda y Selección ---
  const nombreClienteSel = useMemo(() => {
    const id = form.getValues('cliente_id');
    if (!id) return 'Seleccionar Cliente...';
    const cliente = clientes?.find(c => c.$id === id);
    return cliente?.nombre_completo || id;
  }, [form.watch('cliente_id'), clientes]);

  const nombreArticulosSel = useMemo(() => {
    if (articulosSeleccionados.length === 0) return 'Seleccionar Tratamiento(s)...';
    
    const nombres = articulosSeleccionados.map(artId => {
      const articulo = articulos?.find(a => a.$id === artId);
      return articulo?.nombre || artId;
    });
    
    return nombres.join(', ');
  }, [articulosSeleccionados, articulos]);

  // --- Toggle de selección de artículos ---
  const toggleArticulo = (articuloId: string) => {
    setArticulosSeleccionados(prev => {
      const isSelected = prev.includes(articuloId);
      const newSelection = isSelected 
        ? prev.filter(id => id !== articuloId)
        : [...prev, articuloId];
      
      // Actualizar el form field con JSON string
      form.setValue('articulos', JSON.stringify(newSelection));
      return newSelection;
    });
  };

  // --- Envío del Formulario ---
  const handleSubmit = async (data: CitaFormData) => {
    
    // Validar fecha
    if (!selectedDate) {
      form.setError("fecha_hora", { message: "Debe seleccionar una fecha" });
      return;
    }
    
    // Validar que hay al menos un artículo
    if (articulosSeleccionados.length === 0) {
      form.setError("articulos", { message: "Debe seleccionar al menos un tratamiento" });
      return;
    }

    try {
      const [hora, minutos] = horaInicio.split(':').map(Number);
      const fechaHora = setSeconds(setMinutes(setHours(selectedDate, hora), minutos), 0);

      // Crear el objeto final para Appwrite (CitaInput)
      // Solo incluir campos opcionales si tienen valores
      const finalData: any = {
        fecha_hora: fechaHora.toISOString(),
        duracion: data.duracion,
        cliente_id: data.cliente_id,
        empleado_id: data.empleado_id,
        articulos: JSON.stringify(articulosSeleccionados),
        estado: data.estado,
        precio_total: data.precio_total,
      };

      // Agregar campos opcionales solo si tienen valor
      if (data.comentarios && data.comentarios.trim()) {
        finalData.comentarios = data.comentarios;
      }
      if (data.datos_clinicos && data.datos_clinicos.trim()) {
        finalData.datos_clinicos = data.datos_clinicos;
      }
      if (data.recursos_cabina && data.recursos_cabina.trim()) {
        finalData.recursos_cabina = data.recursos_cabina;
      }
      if (data.recursos_aparatos && data.recursos_aparatos.trim()) {
        finalData.recursos_aparatos = data.recursos_aparatos;
      }
      
      await onSubmit(finalData);

    } catch (e) {
      console.error("Error en el formulario", e);
      form.setError("fecha_hora", { message: "Formato de hora inválido (HH:mm)" });
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
                        <Button 
                          variant="outline" 
                          role="combobox" 
                          className={cn(
                            "justify-between font-normal", 
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <span className="truncate">{nombreClienteSel}</span>
                          <UserSearch className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[40vh] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Buscar cliente..." 
                          value={clienteSearch} 
                          onValueChange={setClienteSearch}
                        />
                        <CommandList>
                          {loadingClientes && <CommandItem disabled><LoadingSpinner/></CommandItem>}
                          <CommandEmpty>No encontrado.</CommandEmpty>
                          <CommandGroup>
                            {clientes?.map((cliente) => (
                              <CommandItem 
                                key={cliente.$id} 
                                value={cliente.nombre_completo || cliente.$id} 
                                onSelect={() => { 
                                  field.onChange(cliente.$id); 
                                  setClientePopoverOpen(false); 
                                }}
                              >
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
                      className={cn(
                        "pl-3 text-left font-normal", 
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      {selectedDate ? (
                        format(selectedDate, "PPP", { locale: es })
                      ) : (
                        <span>Selecciona fecha</span>
                      )}
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
                        <SelectItem key={emp.$id} value={emp.$id}>
                          {emp.nombre_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* --- Hora Inicio --- */}
            <FormItem>
              <FormLabel>Hora Inicio *</FormLabel>
              <FormControl>
                <Input 
                  type="time" 
                  value={horaInicio} 
                  onChange={e => setHoraInicio(e.target.value)} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            {/* --- Duración --- */}
            <FormField
              control={form.control}
              name="duracion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración (minutos) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="15" 
                      step="15" 
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* --- Artículos (Buscador multi-selección) --- */}
            <FormField
              control={form.control}
              name="articulos"
              render={() => (
                <FormItem className="flex flex-col md:col-span-2">
                  <FormLabel>Tratamiento(s)/Servicio(s) *</FormLabel>
                  <Popover open={articuloPopoverOpen} onOpenChange={setArticuloPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button 
                          variant="outline" 
                          role="combobox" 
                          className={cn(
                            "justify-between font-normal", 
                            articulosSeleccionados.length === 0 && "text-muted-foreground"
                          )}
                        >
                          <span className="truncate">{nombreArticulosSel}</span>
                          <PackageSearch className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[40vh] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Buscar artículo..." 
                          value={articuloSearch} 
                          onValueChange={setArticuloSearch}
                        />
                        <CommandList>
                          {loadingArticulos && <CommandItem disabled><LoadingSpinner/></CommandItem>}
                          <CommandEmpty>No encontrado.</CommandEmpty>
                          <CommandGroup>
                            {(articuloSearch 
                              ? articulos?.filter(a => 
                                  a.nombre.toLowerCase().includes(articuloSearch.toLowerCase())
                                ) 
                              : articulos
                            )
                              ?.filter(a => a.tipo === 'servicio' || a.tipo === 'bono')
                              .map((articulo: Articulo) => (
                                <CommandItem 
                                  key={articulo.$id} 
                                  value={articulo.nombre} 
                                  onSelect={() => toggleArticulo(articulo.$id)}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>
                                      {articulo.nombre} ({articulo.precio.toFixed(2)}€)
                                    </span>
                                    {articulosSeleccionados.includes(articulo.$id) && (
                                      <span className="text-green-600">✓</span>
                                    )}
                                  </div>
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

            {/* --- Precio Total (calculado automáticamente) --- */}
            <FormField
              control={form.control}
              name="precio_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Total *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
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
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="agendada">Agendada</SelectItem>
                      <SelectItem value="confirmada">Confirmada</SelectItem>
                      <SelectItem value="realizada">Realizada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                      <SelectItem value="no_asistio">No Asistió</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* --- Recursos (opcionales) --- */}
            <FormField
              control={form.control}
              name="recursos_cabina"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recursos Cabina</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="Ej: Cabina 1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recursos_aparatos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recursos Aparatos</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="Ej: Láser, Presoterapia" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* --- Comentarios (antes notas_internas) --- */}
            <FormField 
              control={form.control} 
              name="comentarios" 
              render={({ field }) => ( 
                <FormItem className="md:col-span-2"> 
                  <FormLabel>Comentarios (Notas internas)</FormLabel> 
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={3} />
                  </FormControl> 
                  <FormMessage /> 
                </FormItem> 
              )}
            />

            {/* --- Datos Clínicos (antes notas_cliente) --- */}
            <FormField 
              control={form.control} 
              name="datos_clinicos" 
              render={({ field }) => ( 
                <FormItem className="md:col-span-2"> 
                  <FormLabel>Datos Clínicos</FormLabel> 
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={3} />
                  </FormControl> 
                  <FormMessage /> 
                </FormItem> 
              )}
            />

          </div>
        </ScrollArea>
        <div className="flex justify-end p-4 border-t">
          <Button 
            type="submit" 
            disabled={isSubmitting || loadingClientes || loadingArticulos || loadingEmpleados}
          >
            {isSubmitting ? 'Guardando...' : (citaInicial ? 'Actualizar Cita' : 'Crear Cita')}
          </Button>
        </div>
      </form>
    </Form>
  );
};
