import { useState, useRef, useEffect } from 'react';
import { useTpvStore, LineaTicket } from '@/stores/tpvStore';
import { useGetClientes } from '@/hooks/useClientes';
import { useGetArticulos } from '@/hooks/useArticulos';
import { useCreateFactura } from '@/hooks/useFacturas';
import { useGetConfiguracion, useGenerarSiguienteNumero } from '@/hooks/useConfiguracion'; // <-- 1. Importar hooks config
import { Cliente, Articulo, LineaFactura, FacturaInputData, CreateFacturaInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, X, Plus, Minus, Trash2, CreditCard, Percent, Banknote } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // <-- 2. Importar Select
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { formatISO, format } from 'date-fns';

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

  const { data: clientes, isLoading: loadingClientes } = useGetClientes(clientePopoverOpen ? busquedaCliente : "");
  const { data: articulos, isLoading: loadingArticulos } = useGetArticulos();

  // <-- 3. Obtener estado y acciones del TPV Store -->
  const {
    clienteSeleccionado,
    lineas,
    totalNeto, // Base Imponible
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
    limpiarTicket,
  } = useTpvStore();

  // <-- 4. Hooks para Config y Facturación -->
  const { data: config, isLoading: loadingConfig } = useGetConfiguracion();
  const createFacturaMutation = useCreateFactura();
  const generarNumeroMutation = useGenerarSiguienteNumero();

  // --- Buscadores (sin cambios) ---
  const BuscadorClientes = () => { /* ... sin cambios ... */ };
  const BuscadorArticulos = () => { /* ... sin cambios ... */ };

  // --- Lógica de Cobro (MUY MODIFICADA) ---
  const handleCobrar = async () => {
    if (!clienteSeleccionado || lineas.length === 0) {
      toast({ title: "Error", description: "Debe seleccionar un cliente y añadir al menos un artículo.", variant: "destructive" });
      return;
    }
    if (loadingConfig || !config) {
      toast({ title: "Error", description: "Cargando configuración. Intente de nuevo.", variant: "destructive" });
      return;
    }

    // --- 5. Generar Número de Factura (Ticket) ---
    let numeroFacturaGenerado: string;
    try {
        // El TPV genera 'facturas' (estado cobrada)
        const { numeroCompleto } = await generarNumeroMutation.mutateAsync({ config, tipo: 'factura' });
        numeroFacturaGenerado = numeroCompleto;
    } catch (error) {
         toast({ title: "Error al generar número de factura", description: (error as Error).message, variant: "destructive" });
         return;
    }


    // --- 6. Calcular Totales Finales ---
    const tipoIvaPredeterminado = config.tipoIvaPredeterminado || 21; // Usar de config
    let baseImponibleTotal = 0;
    let ivaTotal = 0;

    const lineasFactura: LineaFactura[] = lineas.map((lineaTpv) => {
      // totalNeto (base imponible) ya tiene descuento de línea
      const baseLinea = lineaTpv.importeTotal; 
      const ivaImporteLinea = baseLinea * (tipoIvaPredeterminado / 100);
      baseImponibleTotal += baseLinea;
      ivaTotal += ivaImporteLinea;

      return {
        id: lineaTpv.id,
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

    const totalFacturaBruto = baseImponibleTotal + ivaTotal; // Total antes de dto global
    const importeDescuentoGlobal = totalFacturaBruto * (descuentoGlobalPorcentaje / 100);
    const totalAPagarFinal = totalFacturaBruto - importeDescuentoGlobal;

    // --- 7. Preparar datos para Appwrite ---
    const facturaData: FacturaInputData = {
      numeroFactura: numeroFacturaGenerado,
      fechaEmision: formatISO(new Date(), { representation: 'date' }), // YYYY-MM-DD
      estado: 'cobrada', // TPV siempre cobra
      cliente_id: clienteSeleccionado.$id,
      lineas: JSON.stringify(lineasFactura),
      baseImponible: baseImponibleTotal,
      totalIva: ivaTotal,
      totalFactura: totalFacturaBruto,
      descuentoGlobalPorcentaje: descuentoGlobalPorcentaje,
      importeDescuentoGlobal: importeDescuentoGlobal,
      totalAPagar: totalAPagarFinal,
      metodoPago: metodoPago, // <-- Nuevo
    };

    try {
      await createFacturaMutation.mutateAsync(facturaData as CreateFacturaInput);
      toast({
        title: "Venta Registrada",
        description: `Se creó el documento ${numeroFacturaGenerado}. El ticket se ha limpiado.`,
      });
      limpiarTicket(); // Limpiar TPV
    } catch (error) {
      console.error("Error al crear factura:", error);
      toast({ title: "Error al registrar la venta", description: (error as Error).message, variant: "destructive" });
      // NOTA: No revertimos el contador aquí, podría causar números duplicados.
      // Se registrará el error, pero el número se considera "quemado".
    }
  };

  // --- Componente TicketActual (MODIFICADO) ---
  const TicketActual = () => {
    // Calculamos totales para la UI (reflejando Dto Global)
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
                           {lineas.map(linea => (
                               <TableRow key={linea.id}>
                                   <TableCell className="font-medium truncate">{linea.articulo.nombre}</TableCell>
                                   <TableCell>
                                       <EditableNumberCell value={linea.cantidad} onChange={(val) => actualizarCantidadLinea(linea.id, val)} />
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
            
            {/* --- Footer Fijo (MODIFICADO) --- */}
            <div className="border-t p-4 space-y-4 mt-auto bg-card">
                 
                 {/* --- Totales --- */}
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
                                disabled={isMutating}
                             />
                             <span>(-{importeDtoGlobal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })})</span>
                         </div>
                     </div>
                 </div>

                 {/* --- TOTAL --- */}
                 <div className="flex justify-between items-center font-semibold text-2xl border-t pt-3">
                    <span>TOTAL:</span>
                    <span>{totalFinal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                 </div>

                 {/* --- Acciones --- */}
                 <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={limpiarTicket} disabled={lineas.length === 0 || isMutating}>Vaciar</Button>
                    <Select value={metodoPago} onValueChange={setMetodoPago} disabled={isMutating}>
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
            </div>
        </CardContent>
    </Card>
    );
  };

  // --- Renderizado principal (sin cambios) ---
  return (
    <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden">
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
             <div className="flex-1 flex flex-col min-h-0"> 
                <BuscadorArticulos/> 
             </div>
        </div>
        {/* Columna Derecha */}
        <div className="flex-1 flex flex-col min-h-0"> <TicketActual /> </div>
    </div>
  );
};

export default TPV;