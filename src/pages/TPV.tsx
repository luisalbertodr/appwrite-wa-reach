import { useState } from 'react';
import { useTpvStore, LineaTicket } from '@/stores/tpvStore'; // Importamos el store y tipos
import { useGetClientes } from '@/hooks/useClientes'; // Para buscar clientes
import { useGetArticulos } from '@/hooks/useArticulos'; // Para buscar artículos
import { Cliente, Articulo } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, X, Plus, Minus, Trash2, CreditCard } from 'lucide-react'; // Quitamos Search no usado aquí
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import LoadingSpinner from '@/components/LoadingSpinner';

const TPV = () => {
  // Estado local para búsquedas
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaArticulo, setBusquedaArticulo] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false); // Estado para controlar el popover

  // Hooks para obtener datos
  // Solo activamos la query de clientes si el popover está abierto y hay búsqueda
  const { data: clientes, isLoading: loadingClientes } = useGetClientes(
    clientePopoverOpen ? busquedaCliente : "" // Solo busca si el popover está abierto
  );
  const { data: articulos, isLoading: loadingArticulos } = useGetArticulos(); // Traemos todos por ahora

  // Acceso al store del TPV
  const {
    clienteSeleccionado,
    lineas,
    totalNeto,
    seleccionarCliente,
    limpiarCliente,
    agregarLinea,
    eliminarLinea,
    actualizarCantidadLinea,
    limpiarTicket,
  } = useTpvStore();

  // Componente interno para mostrar/buscar clientes
  const BuscadorClientes = () => (
    <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
          {clienteSeleccionado ? (
            <div className="flex justify-between items-center w-full">
              <span className="truncate pr-2">{clienteSeleccionado.nombre_completo || `${clienteSeleccionado.nomcli} ${clienteSeleccionado.ape1cli}`}</span>
              <Button
                 variant="ghost"
                 size="sm"
                 onClick={(e) => {
                    e.stopPropagation(); // Evita que el popover se cierre/abra
                    limpiarCliente();
                 }}
                 className="h-auto p-1 text-muted-foreground hover:text-destructive"
                 aria-label="Limpiar cliente"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <span className="text-muted-foreground flex items-center"><User className="w-4 h-4 mr-2" />Seleccionar Cliente</span>
          )}
        </Button>
      </PopoverTrigger>
      {/* Ajustamos tamaño y estilos del PopoverContent */}
      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[40vh] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar cliente por nombre..."
            value={busquedaCliente}
            onValueChange={setBusquedaCliente} // Actualiza el estado de búsqueda
            aria-label="Input de búsqueda de cliente"
          />
          <CommandList>
            {loadingClientes && <CommandItem disabled><LoadingSpinner className="my-4" /></CommandItem>}
            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
            <CommandGroup>
              {clientes?.map((cliente: Cliente) => (
                <CommandItem
                  key={cliente.$id}
                  value={cliente.nombre_completo || `${cliente.nomcli} ${cliente.ape1cli}`}
                  onSelect={() => {
                    seleccionarCliente(cliente);
                    setBusquedaCliente('');
                    setClientePopoverOpen(false); // Cerrar popover al seleccionar
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                     <span className="font-medium">{cliente.nombre_completo || `${cliente.nomcli} ${cliente.ape1cli}`}</span>
                     <span className="text-xs text-muted-foreground">{cliente.dnicli || cliente.tel2cli}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  // Componente interno para mostrar/buscar artículos
  const BuscadorArticulos = () => {
    const articulosFiltrados = busquedaArticulo
        ? articulos?.filter(a => a.activo && a.nombre.toLowerCase().includes(busquedaArticulo.toLowerCase())) // Solo activos
        : articulos?.filter(a => a.activo).slice(0, 50); // Solo activos y limitar

     return (
        <Command className="rounded-lg border shadow-md h-full"> {/* h-full para ocupar espacio */}
             <CommandInput
                placeholder="Buscar artículo o servicio..."
                value={busquedaArticulo}
                onValueChange={setBusquedaArticulo}
                aria-label="Input de búsqueda de artículo"
            />
            {/* ScrollArea debe tener una altura definida o un contenedor flex */}
            <ScrollArea className="flex-1">
                <CommandList>
                    {loadingArticulos && <CommandItem disabled><LoadingSpinner className="my-4" /></CommandItem>}
                    <CommandEmpty>No se encontraron artículos activos.</CommandEmpty>
                    <CommandGroup heading="Artículos y Servicios Activos">
                         {articulosFiltrados?.map((articulo: Articulo) => (
                            <CommandItem
                                key={articulo.$id}
                                value={articulo.nombre}
                                onSelect={() => {
                                    agregarLinea(articulo);
                                    setBusquedaArticulo('');
                                }}
                                className="flex justify-between items-center cursor-pointer"
                            >
                                <span>{articulo.nombre}</span>
                                <span className="text-sm font-semibold">
                                     {articulo.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </ScrollArea>
        </Command>
     );
  }

  // Componente interno para mostrar las líneas del ticket
  const TicketActual = () => (
    <Card className="flex-1 flex flex-col overflow-hidden"> {/* overflow-hidden */}
        <CardHeader className="py-4"> {/* Menos padding vertical */}
            <CardTitle>Ticket Actual</CardTitle>
        </CardHeader>
        {/* Usamos flex-1 en CardContent y ScrollArea para que ocupen el espacio */}
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 px-4 py-2"> {/* Padding ajustado */}
                {lineas.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">El ticket está vacío.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%]">Artículo</TableHead>
                                <TableHead className="text-center w-[80px]">Cant.</TableHead>
                                <TableHead className="text-right w-[100px]">Precio</TableHead>
                                <TableHead className="text-right w-[110px]">Total</TableHead>
                                <TableHead className="w-[40px] p-0"></TableHead> {/* Ajuste ancho y padding */}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lineas.map((linea: LineaTicket) => (
                                <TableRow key={linea.id}>
                                    <TableCell className="font-medium py-2">{linea.articulo.nombre}</TableCell> {/* Menos padding vertical */}
                                    <TableCell className="text-center py-2">
                                         <div className="flex items-center justify-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => actualizarCantidadLinea(linea.id, linea.cantidad - 1)} aria-label="Reducir cantidad"><Minus className="w-3 h-3"/></Button>
                                            <span className="w-6 text-center">{linea.cantidad}</span> {/* Ancho fijo */}
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => actualizarCantidadLinea(linea.id, linea.cantidad + 1)} aria-label="Aumentar cantidad"><Plus className="w-3 h-3"/></Button>
                                         </div>
                                    </TableCell>
                                    <TableCell className="text-right py-2">{linea.precioUnitario.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                                    <TableCell className="text-right font-semibold py-2">{linea.importeTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                                    <TableCell className="py-2 px-1 text-right"> {/* Padding ajustado */}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => eliminarLinea(linea.id)} aria-label="Eliminar línea">
                                            <Trash2 className="w-4 h-4"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </ScrollArea>
            {/* Footer Fijo */}
            <div className="border-t p-4 space-y-3 mt-auto bg-card"> {/* Fondo para que no se transparente */}
                 <div className="flex justify-between items-center font-semibold text-xl"> {/* Tamaño de fuente mayor */}
                    <span>TOTAL:</span>
                    <span>{totalNeto.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                 </div>
                 <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={limpiarTicket} disabled={lineas.length === 0}>Vaciar</Button>
                    <Button className="flex-1 text-lg py-6" disabled={lineas.length === 0}> {/* Botón más grande */}
                        <CreditCard className="w-5 h-5 mr-2" />
                        Cobrar
                    </Button>
                 </div>
            </div>
        </CardContent>
    </Card>
  );


  return (
    // Quitamos el cálculo de altura, dejamos que flex controle
    <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden">
        {/* Columna Izquierda: Cliente y Artículos */}
        <div className="w-full md:w-[350px] lg:w-[400px] space-y-4 flex flex-col"> {/* Ancho fijo */}
             <Card>
                <CardHeader className="py-4"><CardTitle>Cliente</CardTitle></CardHeader>
                <CardContent><BuscadorClientes /></CardContent>
             </Card>
             {/* flex-1 para que ocupe el resto del espacio vertical */}
             <div className="flex-1 flex flex-col min-h-0">
                <BuscadorArticulos/>
             </div>
        </div>

        {/* Columna Derecha: Ticket Actual */}
        <div className="flex-1 flex flex-col min-h-0"> {/* flex-1 para ocupar espacio, min-h-0 para scroll */}
            <TicketActual />
        </div>
    </div>
  );
};

export default TPV;