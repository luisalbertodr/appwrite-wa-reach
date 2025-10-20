import { useEffect } from 'react';
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
import LoadingSpinner from '@/components/LoadingSpinner';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, PlusCircle, Trash2, UserSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Interfaz de Props ---
interface FacturaFormProps {
  facturaInicial?: (Factura & Models.Document) | null;
  onSubmit: (data: FacturaInputData) => Promise<void>; // Usamos FacturaInputData para el submit
  isSubmitting: boolean;
  // Podríamos pasar una función para generar el siguiente número de factura
  // getNextNumeroFactura: (tipo: 'factura' | 'presupuesto') => Promise<string>;
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

  // Hooks para buscar Clientes y Artículos
  const [clienteSearch, setClienteSearch] = useState('');
  const [articuloSearch, setArticuloSearch] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [articuloPopoverOpen, setArticuloPopoverOpen] = useState<number | null>(null); // Índice de la línea
  const { data: clientes, isLoading: loadingClientes } = useGetClientes(clienteSearch);
  const { data: articulos, isLoading: loadingArticulos } = useGetArticulos(); // Traer todos los activos

  // Función para obtener valores iniciales (manejo de 'lineas' string -> object)
  const getInitialFormValues = (): FacturaFormData => {
    if (!facturaInicial) return defaultValues;
    let lineasParseadas: LineaFacturaFormData[] = [];
    // Si facturaInicial.lineas es string JSON lo parseamos, si ya es array lo usamos
    if (typeof facturaInicial.lineas === 'string') {
        try { lineasParseadas = JSON.parse(facturaInicial.lineas); } catch (e) { console.error("Error parsing initial lines"); }
    } else if (Array.isArray(facturaInicial.lineas)) {
        lineasParseadas = facturaInicial.lineas;
    }

    return {
      fechaEmision: facturaInicial.fechaEmision ? format(parseISO(facturaInicial.fechaEmision), 'yyyy-MM-dd') : defaultValues.fechaEmision,
      fechaVencimiento: facturaInicial.fechaVencimiento ? format(parseISO(facturaInicial.fechaVencimiento), 'yyyy-MM-dd') : null,
      estado: facturaInicial.estado || 'borrador',
      cliente_id: facturaInicial.cliente_id || '',
      empleado_id: facturaInicial.empleado_id || null,
      lineas: lineasParseadas.map(l => ({ // Mapear a LineaFacturaFormData si hay diferencias
          articulo_id: l.articulo_id,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          tipoIva: l.tipoIva,
          descuentoPorcentaje: l.descuentoPorcentaje,
      })),
      descuentoGlobalPorcentaje: facturaInicial.descuentoGlobalPorcentaje ?? 0,
      metodoPago: facturaInicial.metodoPago || null,
      notas: facturaInicial.notas || null,
    };
  };

  // Configuración react-hook-form
  const form = useForm<FacturaFormData>({
    resolver: zodResolver(facturaSchema),
    defaultValues: getInitialFormValues(),
  });

  // useFieldArray para manejar las líneas dinámicamente
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lineas",
  });

  // Watch para recalcular totales cuando cambian las líneas, precios, etc.
  const watchedLineas = form.watch('lineas');
  const descGlobal = form.watch('descuentoGlobalPorcentaje') || 0;

  // Cálculo de totales (useEffect para actualizar estado externo si fuera necesario, o directo en render)
  const calcularTotales = (lineas: LineaFacturaFormData[], descGlobalPerc: number) => {
    let baseImp = 0;
    let totalIvaCalc = 0;
    lineas.forEach(linea => {
      const precio = linea.precioUnitario || 0;
      const cant = linea.cantidad || 0;
      const desc = linea.descuentoPorcentaje || 0;
      const iva = linea.tipoIva || 0;

      const baseLinea = precio * cant * (1 - desc / 100);
      const ivaLinea = baseLinea * (iva / 100);
      baseImp += baseLinea;
      totalIvaCalc += ivaLinea;
    });
    const totalFact = baseImp + totalIvaCalc;
    const importeDescGlobal = totalFact * (descGlobalPerc / 100);
    const totalAPagarCalc = totalFact - importeDescGlobal;
    return { baseImponible: baseImp, totalIva: totalIvaCalc, totalFactura: totalFact, importeDescuentoGlobal: importeDescGlobal, totalAPagar: totalAPagarCalc };
  };

  const totalesCalculados = calcularTotales(watchedLineas, descGlobal);

  // Función para añadir una nueva línea vacía
  const añadirLineaVacia = () => {
    append({
      articulo_id: '',
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      tipoIva: 21, // IVA por defecto
      descuentoPorcentaje: 0,
    });
  };

  // Función para seleccionar un artículo en una línea específica
  const seleccionarArticulo = (index: number, articulo: Articulo) => {
    update(index, {
      ...watchedLineas[index], // Mantener otros campos si existen
      articulo_id: articulo.$id,
      descripcion: articulo.nombre,
      precioUnitario: articulo.precio,
      // Podríamos poner el IVA por defecto del artículo si lo tuviéramos
    });
    setArticuloPopoverOpen(null); // Cerrar popover
  };


  // Manejar submit
  const handleSubmit = async (data: FacturaFormData) => {
    // Generar número de factura (temporal) - Reemplazar con lógica real
    const tipoDoc = data.estado === 'presupuesto' ? 'PRE' : 'FRA';
    const numeroFactura = `${tipoDoc}${format(new Date(), 'yyyy')}-${String(Date.now()).slice(-4)}`; // Muy básico

    // Calcular totales finales antes de enviar
    const totalesFinales = calcularTotales(data.lineas, data.descuentoGlobalPorcentaje || 0);

    // Convertir líneas a JSON string
    const lineasJson = JSON.stringify(data.lineas.map(l => ({
        // Aseguramos que solo van los campos de LineaFactura
        articulo_id: l.articulo_id,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        tipoIva: l.tipoIva,
        // Calculamos IVA y totales de línea aquí para guardarlos
        ivaImporte: (l.precioUnitario * l.cantidad * (1 - (l.descuentoPorcentaje || 0) / 100)) * (l.tipoIva / 100),
        descuentoPorcentaje: l.descuentoPorcentaje || 0,
        totalSinIva: l.precioUnitario * l.cantidad * (1 - (l.descuentoPorcentaje || 0) / 100),
        totalConIva: (l.precioUnitario * l.cantidad * (1 - (l.descuentoPorcentaje || 0) / 100)) * (1 + l.tipoIva / 100),
        // No incluimos el objeto 'articulo' completo
    })));

    // Crear el objeto final para Appwrite (FacturaInputData)
    const finalData: FacturaInputData = {
      numeroFactura: facturaInicial?.numeroFactura || numeroFactura, // Usar existente o generar nuevo
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
      // facturaRectificada_id: // Añadir si aplica
    };

    await onSubmit(finalData);
  };

  // Buscar nombre de cliente seleccionado para mostrar
  const nombreClienteSeleccionado = useMemo(() => {
      if (!form.getValues('cliente_id')) return 'Seleccionar Cliente...';
      const cliente = clientes?.find(c => c.$id === form.getValues('cliente_id'));
      return cliente?.nombre_completo || form.getValues('cliente_id');
  }, [form.watch('cliente_id'), clientes]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Usamos ScrollArea para todo el formulario excepto el footer */}
        <ScrollArea className="h-[70vh] p-1">
           <div className="px-4 py-2 space-y-4">

            {/* --- Cabecera: Cliente, Fechas, Estado --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                                 field.onChange(cliente.$id); // Actualiza el form
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

            {/* --- Líneas de Factura --- */}
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Líneas</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Artículo/Descripción</TableHead>
                            <TableHead className="w-[80px]">Cant.</TableHead>
                            <TableHead className="w-[100px] text-right">Precio U.</TableHead>
                            <TableHead className="w-[80px] text-right">Dto %</TableHead>
                            <TableHead className="w-[80px] text-right">IVA %</TableHead>
                            <TableHead className="w-[110px] text-right">Total</TableHead>
                            <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => {
                             // Calculamos total de línea para mostrar
                            const lineaActual = watchedLineas[index] || {};
                            const totalLinea = (lineaActual.precioUnitario || 0) * (lineaActual.cantidad || 0) * (1 - (lineaActual.descuentoPorcentaje || 0) / 100) * (1 + (lineaActual.tipoIva || 0) / 100);

                            return (
                                <TableRow key={field.id}>
                                    <TableCell className="align-top pt-2">
                                        {/* Selector de Artículo */}
                                        <Popover open={articuloPopoverOpen === index} onOpenChange={(isOpen) => setArticuloPopoverOpen(isOpen ? index : null)}>
                                            <PopoverTrigger asChild>
                                                <Button variant="link" className="p-0 h-auto text-left font-medium hover:no-underline">
                                                    {watchedLineas[index]?.descripcion || 'Seleccionar artículo...'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[350px] max-h-[50vh] p-0" align="start">
                                                <Command shouldFilter={false}>
                                                    <CommandInput placeholder="Buscar artículo..." value={articuloSearch} onValueChange={setArticuloSearch}/>
                                                    <CommandList>
                                                         {loadingArticulos && <CommandItem disabled><LoadingSpinner/></CommandItem>}
                                                         <CommandEmpty>No encontrado.</CommandEmpty>
                                                         <CommandGroup>
                                                             {(articuloSearch ? articulos?.filter(a=>a.nombre.toLowerCase().includes(articuloSearch.toLowerCase())) : articulos)?.map((articulo) => (
                                                             <CommandItem
                                                                 key={articulo.$id}
                                                                 value={articulo.nombre}
                                                                 onSelect={() => seleccionarArticulo(index, articulo)}
                                                             >
                                                                 {articulo.nombre} ({articulo.precio.toFixed(2)}€)
                                                             </CommandItem>
                                                             ))}
                                                         </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {/* Input para Descripción manual */}
                                         <Controller
                                            control={form.control}
                                            name={`lineas.${index}.descripcion`}
                                            render={({ field: descField }) => (
                                                <Input {...descField} className="mt-1 h-8 text-xs" placeholder="Descripción detallada..."/>
                                            )}
                                            />
                                    </TableCell>
                                    <TableCell className="align-top pt-2">
                                         <Controller control={form.control} name={`lineas.${index}.cantidad`} render={({ field: qtyField }) => ( <Input type="number" {...qtyField} className="h-8 w-16 text-center" min="1" /> )}/>
                                    </TableCell>
                                    <TableCell className="align-top pt-2">
                                        <Controller control={form.control} name={`lineas.${index}.precioUnitario`} render={({ field: priceField }) => ( <Input type="number" step="0.01" {...priceField} className="h-8 text-right"/> )}/>
                                    </TableCell>
                                    <TableCell className="align-top pt-2">
                                        <Controller control={form.control} name={`lineas.${index}.descuentoPorcentaje`} render={({ field: discField }) => ( <Input type="number" step="1" {...discField} className="h-8 text-right"/> )}/>
                                    </TableCell>
                                    <TableCell className="align-top pt-2">
                                        <Controller control={form.control} name={`lineas.${index}.tipoIva`} render={({ field: ivaField }) => ( <Input type="number" step="1" {...ivaField} className="h-8 text-right"/> )}/>
                                    </TableCell>
                                    <TableCell className="align-top pt-3 text-right font-medium">
                                        {totalLinea.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                    </TableCell>
                                    <TableCell className="align-top pt-1">
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                <Button type="button" variant="outline" size="sm" onClick={añadirLineaVacia} className="mt-2">
                    <PlusCircle className="w-4 h-4 mr-2"/> Añadir Línea
                </Button>
            </div>

            {/* --- Totales y Campos Adicionales --- */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* Columna Notas */}
                 <div className="md:col-span-2 space-y-4">
                     <FormField control={form.control} name="notas" render={({ field }) => ( <FormItem> <FormLabel>Notas</FormLabel> <FormControl><Textarea {...field} value={field.value ?? ''} rows={4} /></FormControl> <FormMessage /> </FormItem> )}/>
                     <FormField control={form.control} name="metodoPago" render={({ field }) => ( <FormItem> <FormLabel>Método de Pago</FormLabel> <FormControl><Input {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )}/>
                 </div>
                 {/* Columna Totales */}
                 <div className="space-y-2 rounded-md border p-4">
                     <div className="flex justify-between text-sm">
                         <span>Base Imponible:</span>
                         <span>{totalesCalculados.baseImponible.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                     </div>
                      <div className="flex justify-between text-sm">
                         <span>IVA:</span>
                         <span>{totalesCalculados.totalIva.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                     </div>
                      <div className="flex justify-between font-semibold">
                         <span>Subtotal:</span>
                         <span>{totalesCalculados.totalFactura.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                     </div>
                      <FormField
                          control={form.control}
                          name="descuentoGlobalPorcentaje"
                          render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                              <FormLabel className="text-sm pt-2">Dto. Global (%):</FormLabel>
                              <FormControl><Input type="number" step="0.1" {...field} className="h-8 w-20 text-right"/></FormControl>
                              <span className="text-sm">(-{totalesCalculados.importeDescuentoGlobal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })})</span>
                          </FormItem>
                          )}
                       />
                     <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                         <span>TOTAL A PAGAR:</span>
                         <span>{totalesCalculados.totalAPagar.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                     </div>
                 </div>
            </div>

            </div> {/* Fin del div con padding */}
        </ScrollArea>

        {/* --- Footer con Botón Guardar --- */}
        <div className="flex justify-end p-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : (facturaInicial ? 'Actualizar' : 'Crear')} {form.getValues('estado')}
          </Button>
        </div>
      </form>
    </Form>
  );
};