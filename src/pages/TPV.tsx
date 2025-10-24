import { useState, useRef, useEffect } from 'react';
import { useTpvStore, LineaTicket } from '@/stores/tpvStore';
import { useGetClientes } from '@/hooks/useClientes';
import { useGetArticulos } from '@/hooks/useArticulos';
import { useCreateFactura } from '@/hooks/useFacturas';
import { useGetConfiguration, useGenerarSiguienteNumero } from '@/hooks/useConfiguration'; // <-- Nombre corregido
import { LineaFactura, FacturaInputData, CreateFacturaInput, FacturaConDatos } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, X, Trash2, CreditCard, Percent, Download } from 'lucide-react'; // <-- Añadir Download
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoadingSpinner from '@/components/LoadingSpinner';
import { DownloadFacturaPDF } from '@/components/pdf/DownloadFacturaPDF'; // <-- Importar PDF
import { useToast } from '@/hooks/use-toast';
import { formatISO } from 'date-fns';
import { cn } from '@/lib/utils'; // <-- Importar cn

// Componente EditableNumberCell (sin cambios)
const EditableNumberCell = ({ value, onChange, className }: { value: number, onChange: (newValue: number) => void, className?: string }) => {
    const [currentValue, setCurrentValue] = useState(value.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setCurrentValue(value.toString());
    }, [value]);

    const handleBlur = () => {
        const newValue = parseFloat(currentValue);
        if (!isNaN(newValue)) {
            onChange(newValue);
        } else {
            setCurrentValue(value.toString()); // Revertir si es inválido
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            inputRef.current?.blur();
        }
    };

    return (
        <Input
            ref={inputRef}
            type="number"
            step="0.01"
            className={cn("h-8 text-right", className)}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
        />
    );
};

const TPV = () => {
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaArticulo, setBusquedaArticulo] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const { toast } = useToast();

  // <-- Estado para el último ticket generado -->
  const [ultimaFacturaGenerada, setUltimaFacturaGenerada] = useState<(FacturaConDatos & Models.Document) | null>(null);

  const { data: clientes, isLoading: loadingClientes } = useGetClientes(clientePopoverOpen ? busquedaCliente : "");
  const { data: articulos, isLoading: loadingArticulos } = useGetArticulos(); // <-- Usar getArticulos sin filtro aquí

  const {
    clienteSeleccionado,
    lineas,
    totalNeto,
    descuentoGlobalPorcentaje,
    metodoPago,
    seleccionarCliente,
    limpiarCliente,
    agregarLinea,
    eliminarLinea,
    actualizarCantidadLinea,
    actualizarPrecioLinea,
    actualizarDescuentoLinea,
    setDescuentoGlobalPorcentaje,
    setMetodoPago,
    limpiarTicket: limpiarTicketStore,
  } = useTpvStore();

  const { data: config, isLoading: loadingConfig } = useGetConfiguration(); // <-- Nombre corregido
  const createFacturaMutation = useCreateFactura();
  const generarNumeroMutation = useGenerarSiguienteNumero();

  // --- Buscadores (Integrados con código GitHub) ---
  const BuscadorClientes = () => {
        return (
            <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !clienteSeleccionado && "text-muted-foreground")}>
                        <span className="truncate">{clienteSeleccionado?.nombre_completo || 'Seleccionar cliente...'}</span>
                        <User className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[40vh] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput placeholder="Buscar cliente..." value={busquedaCliente} onValueChange={setBusquedaCliente}/>
                        <CommandList>
                             {loadingClientes && <CommandItem disabled><LoadingSpinner/></CommandItem>}
                             <CommandEmpty>No encontrado.</CommandEmpty>
                             <CommandGroup>
                                 {clientes?.map((cliente) => (
                                 <CommandItem
                                     key={cliente.$id}
                                     value={cliente.nombre_completo || cliente.$id}
                                     onSelect={() => {
                                         seleccionarCliente(cliente);
                                         setClientePopoverOpen(false);
                                     }}
                                 >
                                     {cliente.nombre_completo} ({cliente.dnicli || cliente.email})
                                 </CommandItem>
                                 ))}
                             </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        );
    };

  const BuscadorArticulos = () => {
        // Filtrar artículos localmente para el buscador
        const articulosFiltrados = busquedaArticulo
            ? articulos?.filter(a => a.nombre.toLowerCase().includes(busquedaArticulo.toLowerCase()))
            : articulos;

        return (
             <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="py-4"><CardTitle>2. Artículos/Servicios</CardTitle></CardHeader>
                 <CardContent className="flex-1 flex flex-col gap-2 overflow-hidden p-2">
                     <Input
                        type="search"
                        placeholder="Buscar artículo..."
                        value={busquedaArticulo}
                        onChange={(e) => setBusquedaArticulo(e.target.value)}
                        className="mb-2"
                     />
                    <ScrollArea className="flex-1">
                        {loadingArticulos ? <LoadingSpinner /> : (
                            <div className="space-y-1 pr-2">
                                {articulosFiltrados?.map(articulo => (
                                    <Button
                                        key={articulo.$id}
                                        variant="outline"
                                        className="w-full justify-start h-auto py-2"
                                        onClick={() => agregarLinea(articulo)}
                                        disabled={!articulo.activo}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium">{articulo.nombre}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {articulo.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} - {articulo.tipo}
                                                {!articulo.activo && ' (Inactivo)'}
                                            </span>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                 </CardContent>
             </Card>
        );
    };

   // --- Limpiar ticket localmente (Añadido) ---
  const handleLimpiarTicketLocal = () => {
      limpiarTicketStore();
      setUltimaFacturaGenerada(null); // Limpiar también el último ticket
  };

  // --- Lógica de Cobro (Corregida y fusionada) ---
  const handleCobrar = async () => {
    if (!clienteSeleccionado || lineas.length === 0) {
      toast({ title: "Error", description: "Debe seleccionar un cliente y añadir al menos un artículo.", variant: "destructive" });
      return;
    }
    if (loadingConfig || !config) {
      toast({ title: "Error", description: "Cargando configuración. Intente de nuevo.", variant: "destructive" });
      return;
    }

    let numeroFacturaGenerado: string;
    try {
        const { numeroCompleto } = await generarNumeroMutation.mutateAsync({ config, tipo: 'factura' });
        numeroFacturaGenerado = numeroCompleto;
    } catch (error) {
         toast({ title: "Error al generar número de factura", description: (error as Error).message, variant: "destructive" });
         return;
    }

    const tipoIvaPredeterminado = config.tipoIvaPredeterminado || 21;
    let baseImponibleTotal = 0;
    let ivaTotal = 0;

    const lineasFactura: LineaFactura[] = lineas.map((lineaTpv: LineaTicket) => {
      const baseLinea = lineaTpv.importeTotal;
      const ivaImporteLinea = baseLinea * (tipoIvaPredeterminado / 100);
      baseImponibleTotal += baseLinea;
      ivaTotal += ivaImporteLinea;

      // Simplificamos la estructura de LineaFactura para que coincida con el tipo
      return {
        id: lineaTpv.id, // ID interno, puede ser útil pero no es parte estricta del tipo Factura
        articulo_id: lineaTpv.articulo.$id,
        descripcion: lineaTpv.articulo.nombre,
        cantidad: lineaTpv.cantidad,
        precioUnitario: lineaTpv.precioUnitario,
        tipoIva: tipoIvaPredeterminado,
        ivaImporte: ivaImporteLinea,
        descuentoPorcentaje: lineaTpv.descuentoPorcentaje,
        totalSinIva: baseLinea,
        totalConIva: baseLinea + ivaImporteLinea,
      };
    });

    const totalFacturaBruto = baseImponibleTotal + ivaTotal;
    const importeDescuentoGlobal = totalFacturaBruto * (descuentoGlobalPorcentaje / 100);
    const totalAPagarFinal = totalFacturaBruto - importeDescuentoGlobal;

    const facturaData: FacturaInputData = {
      numeroFactura: numeroFacturaGenerado,
      fechaEmision: formatISO(new Date(), { representation: 'date' }),
      estado: 'cobrada',
      cliente_id: clienteSeleccionado.$id,
      lineas: JSON.stringify(lineasFactura), // Convertir a JSON string
      baseImponible: baseImponibleTotal,
      totalIva: ivaTotal,
      totalFactura: totalFacturaBruto,
      descuentoGlobalPorcentaje: descuentoGlobalPorcentaje,
      importeDescuentoGlobal: importeDescuentoGlobal,
      totalAPagar: totalAPagarFinal,
      metodoPago: metodoPago,
    };

    try {
      // Guardamos la factura devuelta para el PDF
      const nuevaFactura = await createFacturaMutation.mutateAsync(facturaData as CreateFacturaInput);
      
      // Construimos FacturaConDatos con cliente y líneas parseadas para el PDF
      const facturaCompleta: FacturaConDatos & Models.Document = {
          ...nuevaFactura,
          cliente: clienteSeleccionado,
          lineas: JSON.parse(nuevaFactura.lineas as string) as LineaFactura[],
      };
      
      setUltimaFacturaGenerada(facturaCompleta);

      toast({
        title: "Venta Registrada",
        description: `Se creó el documento ${numeroFacturaGenerado}. Ticket limpiado.`,
      });
      limpiarTicketStore(); // Limpiar solo el store
    } catch (error) {
      console.error("Error al crear factura:", error);
      toast({ title: "Error al registrar la venta", description: (error as Error).message, variant: "destructive" });
    }
  };

  // --- Componente TicketActual (Corregido y fusionado) ---
  const TicketActual = () => {
    const tipoIva = config?.tipoIvaPredeterminado || 21;
    const ivaCalculado = totalNeto * (tipoIva / 100);
    const subtotal = totalNeto + ivaCalculado;
    const importeDtoGlobal = subtotal * (descuentoGlobalPorcentaje / 100);
    const totalFinal = subtotal - importeDtoGlobal;
    const isMutating = createFacturaMutation.isPending || generarNumeroMutation.isPending;

    return (
    <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-4"> <CardTitle>Ticket Actual</CardTitle> </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 px-4 py-2">
                {lineas.length === 0 ? ( <p className="text-center text-muted-foreground py-10">El ticket está vacío.</p> )
                 : ( <Table>
                       <TableHeader>
                           <TableRow>
                               <TableHead>Artículo</TableHead>
                               <TableHead className="w-16">Cant.</TableHead>
                               <TableHead className="w-24 text-right">Precio</TableHead>
                               <TableHead className="w-20 text-right">Dto %</TableHead>
                               <TableHead className="w-24 text-right">Total</TableHead>
                               <TableHead className="w-10"></TableHead>
                           </TableRow>
                       </TableHeader>
                       <TableBody>
                           {lineas.map((linea: LineaFactura) => (
                               <TableRow key={linea.id}>
                                   <TableCell className="font-medium truncate">
                                       {linea.articulo?.nombre ?? <span className="text-destructive">Sin artículo</span>}
                                   </TableCell>
                                   <TableCell>
                                       <EditableNumberCell
                                           value={linea.cantidad}
                                           onChange={(val) => actualizarCantidadLinea(linea.id, val)}
                                       />
                                   </TableCell>
                                    <TableCell>
                                       <EditableNumberCell value={linea.precioUnitario} onChange={(val) => actualizarPrecioLinea(linea.id, val)} />
                                   </TableCell>
                                   <TableCell>
                                       <EditableNumberCell value={linea.descuentoPorcentaje} onChange={(val) => actualizarDescuentoLinea(linea.id, val)} />
                                   </TableCell>
                                   <TableCell className="text-right font-medium">
                                       {linea.importeTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                   </TableCell>
                                   <TableCell>
                                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => eliminarLinea(linea.id)}>
                                           <Trash2 className="w-4 h-4"/>
                                       </Button>
                                   </TableCell>
                               </TableRow>
                           ))}
                       </TableBody>
                   </Table> 
                 )}
            </ScrollArea>
            
            <div className="border-t p-4 space-y-4 mt-auto bg-card">
                 <div className="space-y-1 text-sm">
                     <div className="flex justify-between">
                         <span>Base Imponible:</span>
                         <span>{totalNeto.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                     </div>
                     <div className="flex justify-between">
                         <span>IVA ({tipoIva}%):</span>
                         <span>{ivaCalculado.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                     </div>
                      <div className="flex justify-between font-medium">
                         <span>Subtotal:</span>
                         <span>{subtotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                     </div>
                     <div className="flex justify-between items-center text-destructive">
                         <div className="flex items-center gap-2">
                             <Percent className="w-4 h-4" />
                             <span>Dto. Global (%):</span>
                         </div>
                         <div className="flex items-center gap-1 w-32">
                             <Input 
                                type="number" 
                                value={descuentoGlobalPorcentaje} 
                                onChange={e => setDescuentoGlobalPorcentaje(parseFloat(e.target.value) || 0)}
                                className="h-8 text-right"
                                disabled={isMutating || lineas.length === 0}
                             />
                             <span>(-{importeDtoGlobal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })})</span>
                         </div>
                     </div>
                 </div>

                 <div className="flex justify-between items-center font-semibold text-2xl border-t pt-3">
                    <span>TOTAL:</span>
                    <span>{totalFinal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                 </div>

                 <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleLimpiarTicketLocal} disabled={isMutating}>Vaciar</Button>
                    <Select value={metodoPago} onValueChange={setMetodoPago} disabled={isMutating || lineas.length === 0}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                            <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                            <SelectItem value="Transferencia">Transferencia</SelectItem>
                            <SelectItem value="Mixto">Mixto</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        className="flex-1 text-lg py-6"
                        disabled={lineas.length === 0 || isMutating || loadingConfig}
                        onClick={handleCobrar}
                    >
                        {isMutating ? (
                            <LoadingSpinner className="h-5 w-5 mr-2"/>
                        ) : (
                            <CreditCard className="w-5 h-5 mr-2" />
                        )}
                        {isMutating ? 'Guardando...' : 'Cobrar'}
                    </Button>
                 </div>

                 {/* Botón Descargar Último Ticket */}
                 {ultimaFacturaGenerada && !loadingConfig && config && (
                    <DownloadFacturaPDF
                        factura={ultimaFacturaGenerada}
                        config={config}
                        className="w-full" // Aplicamos clase al wrapper del Link
                    >
                        {/* El children es el botón real */}
                        <Button variant="outline" className="w-full">
                            <Download className="w-4 h-4 mr-2" />
                            Descargar Ticket ({ultimaFacturaGenerada.numeroFactura})
                        </Button>
                    </DownloadFacturaPDF>
                 )}
            </div>
        </CardContent>
    </Card>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-100px)] overflow-hidden"> {/* Ajustar altura si es necesario */}
        {/* Columna Izquierda */}
        <div className="w-full md:w-[350px] lg:w-[400px] space-y-4 flex flex-col">
             <Card> 
                 <CardHeader className="py-4"><CardTitle>1. Cliente</CardTitle></CardHeader> 
                 <CardContent>
                    {clienteSeleccionado ? (
                         <div className="flex items-center justify-between p-3 border rounded-md">
                            <div className="truncate">
                                <p className="font-medium truncate">{clienteSeleccionado.nombre_completo}</p>
                                <p className="text-sm text-muted-foreground">{clienteSeleccionado.dnicli || clienteSeleccionado.email}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={limpiarCliente}><X className="w-4 h-4"/></Button>
                         </div>
                    ) : (
                        <BuscadorClientes />
                    )}
                 </CardContent> 
             </Card>
             {/* El BuscadorArticulos ahora es una Card y ocupa el espacio restante */}
             <BuscadorArticulos/> 
        </div>
        {/* Columna Derecha */}
        <div className="flex-1 flex flex-col min-h-0"> <TicketActual /> </div>
    </div>
  );
};

export default TPV;
