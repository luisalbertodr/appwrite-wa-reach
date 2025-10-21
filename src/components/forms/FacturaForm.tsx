import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FacturaFormData, facturaSchema, LineaFacturaFormData } from '@/lib/validators';
import { Factura, FacturaInputData, Articulo } from '@/types';
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
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { useGetClientes } from '@/hooks/useClientes';
import { useGetArticulos } from '@/hooks/useArticulos';
import { useGetConfiguration, useGenerarSiguienteNumero } from '@/hooks/useConfiguration';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, PlusCircle, UserSearch, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FacturaFormProps {
  facturaInicial?: (Factura & Models.Document) | null;
  onSubmit: (data: FacturaInputData) => Promise<void>;
  isSubmitting: boolean;
}

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

export const FacturaForm = ({ facturaInicial, onSubmit, isSubmitting }: FacturaFormProps) => {
  const [clienteSearch, setClienteSearch] = useState('');
  const [articuloSearch, setArticuloSearch] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [articuloPopoverOpen, setArticuloPopoverOpen] = useState<number | null>(null);
  const { data: clientes, isLoading: loadingClientes } = useGetClientes(clienteSearch);
  const { data: articulos, isLoading: loadingArticulos } = useGetArticulos();
  const { toast } = useToast();

  const { data: config, isLoading: loadingConfig } = useGetConfiguration();
  const generarNumeroMutation = useGenerarSiguienteNumero();

  const getInitialFormValues = (): FacturaFormData => {
    if (!facturaInicial) return defaultValues;

    let lineasParsed: LineaFacturaFormData[] = [];
    try {
      const lineasStr = typeof facturaInicial.lineas === 'string' ? facturaInicial.lineas : JSON.stringify(facturaInicial.lineas);
      const parsed = JSON.parse(lineasStr);
      lineasParsed = Array.isArray(parsed) ? parsed : [];
    } catch {
      lineasParsed = [];
    }

    return {
      fechaEmision: facturaInicial.fechaEmision,
      fechaVencimiento: facturaInicial.fechaVencimiento || null,
      estado: facturaInicial.estado,
      cliente_id: typeof facturaInicial.cliente === 'object' ? facturaInicial.cliente.$id : facturaInicial.cliente_id,
      empleado_id: facturaInicial.empleado_id || null,
      lineas: lineasParsed,
      descuentoGlobalPorcentaje: facturaInicial.descuentoGlobalPorcentaje || 0,
      metodoPago: facturaInicial.metodoPago || null,
      notas: facturaInicial.notas || null,
    };
  };

  const form = useForm<FacturaFormData>({
    resolver: zodResolver(facturaSchema),
    defaultValues: getInitialFormValues(),
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lineas",
  });

  const watchedLineas = form.watch('lineas');
  const descGlobal = form.watch('descuentoGlobalPorcentaje') || 0;
  
  const calcularTotales = (lineas: LineaFacturaFormData[], descGlobalPerc: number) => {
    let subtotal = 0;
    let totalIvaAcumulado = 0;

    lineas.forEach(linea => {
      const precioSinIva = linea.precioUnitario || 0;
      const cantidad = linea.cantidad || 0;
      const descuentoPerc = linea.descuentoPorcentaje || 0;
      const tipoIva = linea.tipoIva || 0;

      const subtotalLinea = precioSinIva * cantidad;
      const descuentoLinea = subtotalLinea * (descuentoPerc / 100);
      const baseConDescuento = subtotalLinea - descuentoLinea;
      const ivaLinea = baseConDescuento * (tipoIva / 100);

      subtotal += baseConDescuento;
      totalIvaAcumulado += ivaLinea;
    });

    const importeDescuentoGlobal = subtotal * (descGlobalPerc / 100);
    const baseImponible = subtotal - importeDescuentoGlobal;
    const totalIva = totalIvaAcumulado;
    const totalFactura = baseImponible + totalIva;
    const totalAPagar = totalFactura;

    return {
      baseImponible,
      totalIva,
      totalFactura,
      importeDescuentoGlobal,
      totalAPagar
    };
  };
  
  const totalesCalculados = calcularTotales(watchedLineas, descGlobal);

  const añadirLineaVacia = () => {
    append({
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuentoPorcentaje: 0,
      tipoIva: 21,
      articulo_id: null,
    });
  };

  const seleccionarArticulo = (index: number, articulo: Articulo & Models.Document) => {
    update(index, {
      ...fields[index],
      articulo_id: articulo.$id || null,
      descripcion: articulo.nombre,
      precioUnitario: articulo.precio,
      tipoIva: 21,
    });
    setArticuloPopoverOpen(null);
  };

  const handleSubmit = async (data: FacturaFormData) => {
    if (!config && !facturaInicial) {
      toast({ title: "Error", description: "La configuración aún no se ha cargado. Espere un momento.", variant: "destructive" });
      return;
    }

    let numeroFacturaGenerado: string;

    if (facturaInicial) {
      numeroFacturaGenerado = facturaInicial.numeroFactura;
    } else {
      try {
        const tipoDoc = data.estado === 'presupuesto' ? 'presupuesto' : 'factura';
        const { numeroCompleto } = await generarNumeroMutation.mutateAsync({ config: config!, tipo: tipoDoc });
        numeroFacturaGenerado = numeroCompleto;
      } catch (error) {
        toast({ title: "Error al generar número de documento", description: (error as Error).message, variant: "destructive" });
        return;
      }
    }

    const totalesFinales = calcularTotales(data.lineas, data.descuentoGlobalPorcentaje || 0);

    const lineasJson = JSON.stringify(data.lineas.map(l => ({
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precioUnitario: l.precioUnitario,
      descuentoPorcentaje: l.descuentoPorcentaje || 0,
      tipoIva: l.tipoIva,
      articulo_id: l.articulo_id || undefined,
    })));

    const finalData: FacturaInputData = {
      numeroFactura: numeroFacturaGenerado,
      fechaEmision: data.fechaEmision,
      fechaVencimiento: data.fechaVencimiento || undefined,
      estado: data.estado,
      cliente_id: data.cliente_id,
      empleado_id: data.empleado_id || undefined,
      lineas: lineasJson,
      baseImponible: parseFloat(totalesFinales.baseImponible.toFixed(2)),
      totalIva: parseFloat(totalesFinales.totalIva.toFixed(2)),
      totalFactura: parseFloat(totalesFinales.totalFactura.toFixed(2)),
      descuentoGlobalPorcentaje: data.descuentoGlobalPorcentaje || 0,
      importeDescuentoGlobal: parseFloat(totalesFinales.importeDescuentoGlobal.toFixed(2)),
      totalAPagar: parseFloat(totalesFinales.totalAPagar.toFixed(2)),
      metodoPago: data.metodoPago || undefined,
      notas: data.notas || undefined,
    };

    await onSubmit(finalData);
  };

  const clienteIdWatch = form.watch('cliente_id');
  const nombreClienteSeleccionado = useMemo(() => {
    if (!clienteIdWatch) return 'Selecciona un cliente';
    const cliente = clientes?.find(c => c.$id === clienteIdWatch);
    return cliente?.nombre_completo || 'Cliente no encontrado';
  }, [clienteIdWatch, clientes]);

  const isDataLoading = loadingClientes || loadingArticulos || (loadingConfig && !facturaInicial);
  const isMutating = isSubmitting || generarNumeroMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <ScrollArea className="h-[70vh] p-1">
          <div className="px-4 py-2 space-y-4">
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

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Líneas</h3>
              <Table>
                <TableBody>
                  {fields.map((field) => {
                    const index = fields.indexOf(field);
                    const linea = watchedLineas[index];
                    const baseLinea = (linea.precioUnitario || 0) * (linea.cantidad || 0);
                    const descuento = baseLinea * ((linea.descuentoPorcentaje || 0) / 100);
                    const baseConDesc = baseLinea - descuento;
                    const iva = baseConDesc * ((linea.tipoIva || 0) / 100);
                    const totalLinea = baseConDesc + iva;

                    return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <div className="flex gap-1">
                            <Popover open={articuloPopoverOpen === index} onOpenChange={(open) => setArticuloPopoverOpen(open ? index : null)}>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Search className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0">
                                <Command shouldFilter={false}>
                                  <CommandInput placeholder="Buscar artículo..." value={articuloSearch} onValueChange={setArticuloSearch}/>
                                  <CommandList>
                                    {loadingArticulos && <CommandItem disabled><LoadingSpinner/></CommandItem>}
                                    <CommandEmpty>No encontrado.</CommandEmpty>
                                    <CommandGroup>
                                      {articulos?.map((articulo) => (
                                        <CommandItem
                                          key={articulo.$id}
                                          value={articulo.nombre}
                                          onSelect={() => seleccionarArticulo(index, articulo)}
                                        >
                                          {articulo.nombre} - {articulo.precio}€
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormField
                              control={form.control}
                              name={`lineas.${index}.descripcion`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input {...field} placeholder="Descripción" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`lineas.${index}.cantidad`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} type="number" step="1" min="0" onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`lineas.${index}.precioUnitario`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} type="number" step="0.01" min="0" onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`lineas.${index}.descuentoPorcentaje`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} value={field.value || ''} type="number" step="0.01" min="0" max="100" onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`lineas.${index}.tipoIva`}
                            render={({ field }) => (
                              <FormItem>
                                <Select onValueChange={(v) => field.onChange(parseFloat(v))} defaultValue={field.value?.toString()}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="0">0%</SelectItem>
                                    <SelectItem value="4">4%</SelectItem>
                                    <SelectItem value="10">10%</SelectItem>
                                    <SelectItem value="21">21%</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">{totalLinea.toFixed(2)}€</TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
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

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} rows={4} placeholder="Notas adicionales..." />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="metodoPago"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Pago</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="tarjeta">Tarjeta</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                          <SelectItem value="bizum">Bizum</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2 space-y-2 bg-muted p-4 rounded-lg">
                <h4 className="font-semibold">Resumen</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Base Imponible:</span>
                    <span className="font-medium">{totalesCalculados.baseImponible.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA:</span>
                    <span className="font-medium">{totalesCalculados.totalIva.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <FormField
                      control={form.control}
                      name="descuentoGlobalPorcentaje"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <div className="flex items-center gap-2">
                            <FormLabel className="text-sm">Descuento Global %:</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} type="number" step="0.01" min="0" max="100" className="w-20" onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                    <span className="font-medium">-{totalesCalculados.importeDescuentoGlobal.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>TOTAL A PAGAR:</span>
                    <span>{totalesCalculados.totalAPagar.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end p-4 border-t">
          <Button type="submit" disabled={isDataLoading || isMutating}>
            {isMutating ? 'Guardando...' : (facturaInicial ? 'Actualizar' : 'Crear')} {form.getValues('estado')}
          </Button>
        </div>
      </form>
    </Form>
  );
};
