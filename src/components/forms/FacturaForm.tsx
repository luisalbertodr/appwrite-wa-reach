import { useEffect, useState, useMemo } from 'react'; // Imports actualizados
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FacturaFormData, facturaSchema, LineaFacturaFormData } from '@/lib/validators';
import { Factura, LineaFactura, FacturaInputData, CreateFacturaInput, Cliente, Articulo, LipooutUserInput } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetClientes } from '@/hooks/useClientes';
import { useGetArticulos } from '@/hooks/useArticulos';
import { useGetConfiguracion, useGenerarSiguienteNumero } from '@/hooks/useConfiguracion'; // <-- 1. Importar hooks config
import LoadingSpinner from '@/components/LoadingSpinner';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, PlusCircle, Trash2, UserSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// --- Interfaz de Props ---
interface FacturaFormProps {
  facturaInicial?: (Factura & Models.Document) | null;
  onSubmit: (data: FacturaInputData) => Promise<void>;
  isSubmitting: boolean;
}

// --- Valores por Defecto ---
const defaultValues: FacturaFormData = {
  fechaEmision: format(new Date(), 'yyyy-MM-dd'),
  fechaVencimiento: null,
  estado: 'borrador',
  cliente_id: '',
  empleado_id: null,
  lineas: [],
  descuentoGlobalPorcentaje: 0,
  metodoPago: null,
  notas: null,
};

// --- Componente de Formulario ---
export const FacturaForm = ({ facturaInicial, onSubmit, isSubmitting }: FacturaFormProps) => {

  // --- Hooks de datos ---
  const [clienteSearch, setClienteSearch] = useState('');
  const [articuloSearch, setArticuloSearch] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [articuloPopoverOpen, setArticuloPopoverOpen] = useState<number | null>(null);
  const { data: clientes, isLoading: loadingClientes } = useGetClientes(clienteSearch);
  const { data: articulos, isLoading: loadingArticulos } = useGetArticulos();
  const { toast } = useToast();

  // <-- 2. Hooks de Configuración y Numeración -->
  const { data: config, isLoading: loadingConfig } = useGetConfiguracion();
  const generarNumeroMutation = useGenerarSiguienteNumero();

  // Función para obtener valores iniciales (sin cambios)
  const getInitialFormValues = (): FacturaFormData => { /* ... sin cambios ... */ };

  // Configuración react-hook-form (sin cambios)
  const form = useForm<FacturaFormData>({
    resolver: zodResolver(facturaSchema),
    defaultValues: getInitialFormValues(),
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lineas",
  });

  // Watchers y Cálculos (sin cambios)
  const watchedLineas = form.watch('lineas');
  const descGlobal = form.watch('descuentoGlobalPorcentaje') || 0;
  const calcularTotales = (lineas: LineaFacturaFormData[], descGlobalPerc: number) => { /* ... sin cambios ... */ };
  const totalesCalculados = calcularTotales(watchedLineas, descGlobal);

  // Funciones de líneas (sin cambios)
  const añadirLineaVacia = () => { /* ... sin cambios ... */ };
  const seleccionarArticulo = (index: number, articulo: Articulo) => { /* ... sin cambios ... */ };


  // --- Manejar submit (MODIFICADO) ---
  const handleSubmit = async (data: FacturaFormData) => {
    
    // 3. Verificar carga de configuración
    if (!config && !facturaInicial) { // Solo necesitamos config si es NUEVO
        toast({ title: "Error", description: "La configuración aún no se ha cargado. Espere un momento.", variant: "destructive" });
        return;
    }

    let numeroFacturaGenerado: string;

    // 4. Generar número de factura (SOLO si es nuevo)
    if (facturaInicial) {
        numeroFacturaGenerado = facturaInicial.numeroFactura; // Usar existente
    } else {
        try {
            const tipoDoc = data.estado === 'presupuesto' ? 'presupuesto' : 'factura';
            const { numeroCompleto } = await generarNumeroMutation.mutateAsync({ config: config!, tipo: tipoDoc });
            numeroFacturaGenerado = numeroCompleto;
        } catch (error) {
            toast({ title: "Error al generar número de documento", description: (error as Error).message, variant: "destructive" });
            return; // Detener envío
        }
    }

    // Calcular totales finales antes de enviar (sin cambios)
    const totalesFinales = calcularTotales(data.lineas, data.descuentoGlobalPorcentaje || 0);

    // Convertir líneas a JSON string (sin cambios)
    const lineasJson = JSON.stringify(data.lineas.map(l => ({
        /* ... campos de línea ... */
    })));

    // Crear el objeto final para Appwrite (FacturaInputData)
    const finalData: FacturaInputData = {
      numeroFactura: numeroFacturaGenerado, // <-- Usamos el número generado o el existente
      fechaEmision: data.fechaEmision,
      fechaVencimiento: data.fechaVencimiento || undefined,
      estado: data.estado,
      cliente_id: data.cliente_id,
      empleado_id: data.empleado_id || undefined,
      lineas: lineasJson,
      baseImponible: totalesFinales.baseImponible,
      totalIva: totalesFinales.totalIva,
      totalFactura: totalesFinales.totalFactura,
      descuentoGlobalPorcentaje: data.descuentoGlobalPorcentaje || 0,
      importeDescuentoGlobal: totalesFinales.importeDescuentoGlobal,
      totalAPagar: totalesFinales.totalAPagar,
      metodoPago: data.metodoPago || undefined,
      notas: data.notas || undefined,
    };

    await onSubmit(finalData);
  };

  // Buscar nombre de cliente (sin cambios)
  const nombreClienteSeleccionado = useMemo(() => { /* ... sin cambios ... */ }, [form.watch('cliente_id'), clientes]);

  // Estado de carga general
  const isDataLoading = loadingClientes || loadingArticulos || (loadingConfig && !facturaInicial);
  const isMutating = isSubmitting || generarNumeroMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <ScrollArea className="h-[70vh] p-1">
           <div className="px-4 py-2 space-y-4">

            {/* --- Cabecera: Cliente, Fechas, Estado --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* ... (Campo Cliente sin cambios) ... */}
               {/* ... (Campo Fecha Emisión sin cambios) ... */}
               {/* ... (Campo Estado sin cambios) ... */}
                 <FormField
                  control={form.control}
                  name="cliente_id"
                  render={({ field }) => (
                  <FormItem className="flex flex-col">
                      <FormLabel>Cliente *</FormLabel>
                      <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                        <PopoverTrigger asChild>
                           <FormControl>
                            <Button
                                variant="outline"
                                role="combobox"
                                className={cn("justify-between font-normal", !field.value && "text-muted-foreground")}
                            >
                                <span className="truncate">{nombreClienteSeleccionado}</span>
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

                <FormField
                    control={form.control}
                    name="fechaEmision"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Fecha Emisión *</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                             <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                {field.value ? format(parseISO(field.value), "PPP", { locale: es }) : <span>Selecciona fecha</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                             </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value ? parseISO(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                initialFocus
                                locale={es}
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                 />

                <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Estado *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="presupuesto">Presupuesto</SelectItem>
                                <SelectItem value="borrador">Borrador</SelectItem>
                                <SelectItem value="finalizada">Finalizada</SelectItem>
                                <SelectItem value="cobrada">Cobrada</SelectItem>
                                <SelectItem value="anulada">Anulada</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </div>

            {/* --- Líneas de Factura (Sin cambios en el JSX) --- */}
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Líneas</h3>
                <Table>
                   {/* ... TableHeader ... */}
                   <TableBody>
                        {fields.map((field, index) => {
                             // ... (Cálculo totalLinea)
                            return (
                                <TableRow key={field.id}>
                                    {/* ... (Celdas de Línea) ... */}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                <Button type="button" variant="outline" size="sm" onClick={añadirLineaVacia} className="mt-2">
                    <PlusCircle className="w-4 h-4 mr-2"/> Añadir Línea
                </Button>
            </div>

            {/* --- Totales y Campos Adicionales (Sin cambios en el JSX) --- */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* ... (Columna Notas) ... */}
                 {/* ... (Columna Totales) ... */}
            </div>

            </div>
        </ScrollArea>

        {/* --- Footer con Botón Guardar (MODIFICADO) --- */}
        <div className="flex justify-end p-4 border-t">
          <Button type="submit" disabled={isDataLoading || isMutating}>
            {isMutating ? 'Guardando...' : (facturaInicial ? 'Actualizar' : 'Crear')} {form.getValues('estado')}
          </Button>
        </div>
      </form>
    </Form>
  );
};