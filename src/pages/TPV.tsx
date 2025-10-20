import { useState, useRef, useEffect } from 'react';
import { useTpvStore, LineaTicket } from '@/stores/tpvStore';
import { useGetClientes } from '@/hooks/useClientes';
import { useGetArticulos } from '@/hooks/useArticulos';
import { useCreateFactura } from '@/hooks/useFacturas'; // <-- 1. Importar hook de crear factura
import { Cliente, Articulo, LineaFactura, FacturaInputData } from '@/types'; // <-- Añadir tipos de Factura
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, X, Plus, Minus, Trash2, CreditCard, Percent } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { formatISO, format } from 'date-fns'; // <-- Añadir format

// Componente EditableNumberCell (sin cambios)
const EditableNumberCell = ({ value, onChange, className }: { value: number, onChange: (newValue: number) => void, className?: string }) => { /* ... */ };

const TPV = () => {
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaArticulo, setBusquedaArticulo] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const { toast } = useToast();

  const { data: clientes, isLoading: loadingClientes } = useGetClientes(clientePopoverOpen ? busquedaCliente : "");
  const { data: articulos, isLoading: loadingArticulos } = useGetArticulos();

  const {
    clienteSeleccionado,
    lineas,
    totalNeto, // Usaremos este como totalAPagar por ahora
    seleccionarCliente,
    limpiarCliente,
    agregarLinea,
    eliminarLinea,
    actualizarCantidadLinea,
    actualizarPrecioLinea,
    actualizarDescuentoLinea,
    limpiarTicket,
  } = useTpvStore();

  // <-- 2. Hook para crear la factura -->
  const createFacturaMutation = useCreateFactura();

  const BuscadorClientes = () => { /* ... sin cambios ... */ };
  const BuscadorArticulos = () => { /* ... sin cambios ... */ };

  // --- Lógica de Cobro (MODIFICADA) ---
  const handleCobrar = async () => {
    if (!clienteSeleccionado || lineas.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar un cliente y añadir al menos un artículo.",
        variant: "destructive",
      });
      return;
    }

    // Preparar líneas de factura desde líneas de ticket
    let baseImponibleTotal = 0;
    let ivaTotal = 0;
    const tipoIvaPredeterminado = 21; // <-- IVA Fijo (ej. 21%)

    const lineasFactura: LineaFactura[] = lineas.map((lineaTpv) => {
      const totalSinIvaLinea = lineaTpv.importeTotal; // Asumimos que importeTotal del TPV es sin IVA por ahora
      const ivaImporteLinea = totalSinIvaLinea * (tipoIvaPredeterminado / 100);
      baseImponibleTotal += totalSinIvaLinea;
      ivaTotal += ivaImporteLinea;

      return {
        id: lineaTpv.id, // Reutilizamos el ID interno
        articulo_id: lineaTpv.articulo.$id,
        descripcion: lineaTpv.articulo.nombre, // Usamos el nombre del artículo
        cantidad: lineaTpv.cantidad,
        precioUnitario: lineaTpv.precioUnitario, // Precio sin IVA
        tipoIva: tipoIvaPredeterminado,
        ivaImporte: ivaImporteLinea,
        descuentoPorcentaje: lineaTpv.descuentoPorcentaje,
        totalSinIva: totalSinIvaLinea,
        totalConIva: totalSinIvaLinea + ivaImporteLinea,
        // 'articulo' (objeto completo) no se guarda en Appwrite directamente
      };
    });

    const totalFacturaConIva = baseImponibleTotal + ivaTotal;

    // Generar número de factura simple (temporal)
    // TODO: Obtener último número y serie de la configuración
    const numeroFacturaTemporal = `TICKET-${format(new Date(), 'yyyyMMddHHmmss')}`;

    // Preparar datos para Appwrite (tipo FacturaInputData)
    const facturaData: FacturaInputData = {
      numeroFactura: numeroFacturaTemporal,
      fechaEmision: formatISO(new Date(), { representation: 'date' }), // Formato YYYY-MM-DD
      estado: 'cobrada', // Marcamos como cobrada directamente
      cliente_id: clienteSeleccionado.$id,
      lineas: JSON.stringify(lineasFactura), // Convertir a JSON string
      baseImponible: baseImponibleTotal,
      totalIva: ivaTotal,
      totalFactura: totalFacturaConIva,
      totalAPagar: totalFacturaConIva, // Asumimos que totalNeto era sin IVA, totalAPagar es con IVA
      // Podríamos añadir metodoPago si lo implementamos
    };

    try {
      await createFacturaMutation.mutateAsync(facturaData as CreateFacturaInput); // Hacemos cast a CreateFacturaInput
      toast({
        title: "Venta Registrada",
        description: `Se creó el documento ${numeroFacturaTemporal}. El ticket se ha limpiado.`,
      });
      limpiarTicket(); // Limpiar el TPV si la creación fue exitosa
    } catch (error) {
      console.error("Error al crear factura:", error);
      toast({
        title: "Error al registrar la venta",
        description: (error as Error).message || "No se pudo guardar la factura en la base de datos.",
        variant: "destructive",
      });
    }
  };

  // Componente TicketActual (sin cambios estructurales, solo usa handleCobrar)
  const TicketActual = () => (
    <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-4"> <CardTitle>Ticket Actual</CardTitle> </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 px-4 py-2">
                {lineas.length === 0 ? ( <p className="text-center text-muted-foreground py-10">El ticket está vacío.</p> )
                 : ( <Table> {/* ... Contenido de la tabla con celdas editables ... */} </Table> )}
            </ScrollArea>
            {/* Footer Fijo */}
            <div className="border-t p-4 space-y-3 mt-auto bg-card">
                 <div className="flex justify-between items-center font-semibold text-xl">
                    <span>TOTAL:</span>
                    {/* Mostramos el total CON IVA calculado */}
                    <span>{(totalNeto * (1 + tipoIvaPredeterminado / 100)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                 </div>
                 <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={limpiarTicket} disabled={lineas.length === 0}>Vaciar</Button>
                    <Button
                        className="flex-1 text-lg py-6"
                        disabled={lineas.length === 0 || createFacturaMutation.isPending} // Deshabilitar mientras se guarda
                        onClick={handleCobrar}
                    >
                        {createFacturaMutation.isPending ? (
                            <LoadingSpinner className="h-5 w-5 mr-2"/>
                        ) : (
                            <CreditCard className="w-5 h-5 mr-2" />
                        )}
                        {createFacturaMutation.isPending ? 'Guardando...' : 'Cobrar'}
                    </Button>
                 </div>
            </div>
        </CardContent>
    </Card>
  );

  // --- Renderizado principal (sin cambios) ---
  return (
    <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden">
        {/* Columna Izquierda */}
        <div className="w-full md:w-[350px] lg:w-[400px] space-y-4 flex flex-col">
             <Card> <CardHeader>...</CardHeader> <CardContent><BuscadorClientes /></CardContent> </Card>
             <div className="flex-1 flex flex-col min-h-0"> <BuscadorArticulos/> </div>
        </div>
        {/* Columna Derecha */}
        <div className="flex-1 flex flex-col min-h-0"> <TicketActual /> </div>
    </div>
  );
};

export default TPV;