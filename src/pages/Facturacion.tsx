import { useState } from 'react';
import { useGetFacturas, useCreateFactura, useUpdateFactura } from '@/hooks/useFacturas';
import { useGetConfiguration, useGenerarSiguienteNumero } from '@/hooks/useConfiguration'; // <-- Nombre corregido
import { Factura, FacturaInputData, CreateFacturaInput, UpdateFacturaInput, Configuracion, FacturaConDatos, LineaFactura } from '@/types'; // Importar Configuracion
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Edit, Trash2, FileText, CheckCircle, Search } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FacturaForm } from '@/components/forms/FacturaForm';
import { DownloadFacturaPDF } from '@/components/pdf/DownloadFacturaPDF'; // <-- Importar PDF
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Helper para traducir estado
const traducirEstadoFactura = (estado: string): string => {
    switch (estado) {
        case 'borrador': return 'Borrador';
        case 'finalizada': return 'Finalizada';
        case 'cobrada': return 'Cobrada';
        case 'anulada': return 'Anulada';
        case 'presupuesto': return 'Presupuesto';
        default: return estado;
    }
};

// Helper para transformar Factura a FacturaConDatos para PDF
const transformarFacturaParaPDF = (factura: Factura & Models.Document): FacturaConDatos & Models.Document => {
    return {
        ...factura,
        lineas: JSON.parse(factura.lineas as string) as LineaFactura[],
        // cliente es undefined - el PDF mostrará el cliente_id en su lugar
    };
};

const Facturacion = () => {
  // --- Estados de Filtros ---
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos'); // Valor inicial 'todos'

  // --- Hooks de Datos ---
  const { data: facturas, isLoading, error } = useGetFacturas(searchTerm, estadoFilter === 'todos' ? '' : estadoFilter);
  const createFacturaMutation = useCreateFactura();
  const updateFacturaMutation = useUpdateFactura();
  // const deleteFacturaMutation = useDeleteFactura(); // No usado directamente ahora
  const { data: config, isLoading: loadingConfig } = useGetConfiguration(); // Obtener config para PDF y conversión
  const generarNumeroMutation = useGenerarSiguienteNumero(); // Para convertir presupuesto
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [facturaToEdit, setFacturaToEdit] = useState<(Factura & Models.Document) | null>(null);

  // --- Manejadores ---
  const handleOpenCreateDialog = () => {
    setFacturaToEdit(null);
    setIsDialogOpen(true);
  };
  const handleOpenEditDialog = (factura: Factura & Models.Document) => {
    setFacturaToEdit(factura);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (data: FacturaInputData) => {
     try {
      if (facturaToEdit) {
        await updateFacturaMutation.mutateAsync({ id: facturaToEdit.$id, data: data as UpdateFacturaInput });
        toast({ title: "Documento actualizado" });
      } else {
        await createFacturaMutation.mutateAsync(data as CreateFacturaInput);
        toast({ title: `Documento ${data.numeroFactura} creado` });
      }
      setIsDialogOpen(false);
      setFacturaToEdit(null);
      // refetchFacturas(); // InvalidateQueries lo hace
    } catch (err) {
      toast({ title: `Error al ${facturaToEdit ? 'actualizar' : 'crear'}`, description: (err as Error).message, variant: "destructive" });
    }
  };

  // Anular (cambiar estado)
  const handleAnularFactura = async (factura: Factura & Models.Document) => {
     if (window.confirm(`¿Estás seguro de anular el documento ${factura.numeroFactura}?`)) {
        try {
            await updateFacturaMutation.mutateAsync({ id: factura.$id, data: { estado: 'anulada' } });
            toast({ title: "Documento anulado" });
            // refetchFacturas(); // InvalidateQueries lo hace
        } catch (err) {
            toast({ title: "Error al anular", description: (err as Error).message, variant: "destructive" });
        }
    }
  };

  // Convertir Presupuesto a Factura
  const handleConvertirPresupuesto = async (presupuesto: Factura & Models.Document) => {
    if (presupuesto.estado !== 'presupuesto' || !config) {
        toast({ title: "Error", description: "No es un presupuesto válido o la configuración no ha cargado.", variant: "destructive" });
        return;
    }

    if (window.confirm(`¿Convertir el presupuesto ${presupuesto.numeroFactura} en factura?`)) {
        try {
            // 1. Generar nuevo número de FACTURA
            const { numeroCompleto } = await generarNumeroMutation.mutateAsync({ config, tipo: 'factura' });
            
            // 2. Preparar actualización
            const updateData: UpdateFacturaInput = {
                estado: 'finalizada', // Convertir a 'finalizada'
                numeroFactura: numeroCompleto,
                fechaEmision: format(new Date(), 'yyyy-MM-dd'),
            };

            // 3. Ejecutar actualización
            await updateFacturaMutation.mutateAsync({ id: presupuesto.$id, data: updateData });

            toast({ title: "Presupuesto Aceptado", description: `Se ha generado la factura ${numeroCompleto}.` });

        } catch (err) {
            toast({ title: "Error al convertir", description: (err as Error).message, variant: "destructive" });
        }
    }
  };


  const renderContent = () => {
    if (isLoading) { return <div className="flex justify-center py-8"><LoadingSpinner /></div>; }
    if (error) { return <p className="text-center text-destructive py-8">Error al cargar documentos.</p>; }
    if (!facturas || facturas.length === 0) { 
         return <p className="text-center text-muted-foreground py-8">
             {searchTerm || (estadoFilter && estadoFilter !== 'todos') ? 'No se encontraron documentos.' : 'No hay documentos creados.'}
         </p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {facturas.map((factura: Factura & Models.Document) => (
            <TableRow key={factura.$id}>
               <TableCell className="font-medium">{factura.numeroFactura}</TableCell>
               <TableCell>{factura.fechaEmision ? format(parseISO(factura.fechaEmision), 'dd/MM/yyyy', { locale: es }) : '-'}</TableCell>
               <TableCell className="truncate max-w-xs">{factura.cliente_id}</TableCell>
               <TableCell className="text-right">{(typeof factura.totalAPagar === 'number') ? factura.totalAPagar.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-'}</TableCell>
               <TableCell>
                   <Badge variant={factura.estado === 'cobrada' ? 'default' : factura.estado === 'anulada' ? 'destructive' : 'outline'}>
                       {traducirEstadoFactura(factura.estado)}
                   </Badge>
                </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"> <MoreHorizontal className="w-4 h-4" /> <span className="sr-only">Acciones</span> </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEditDialog(factura)} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" /> Ver/Editar
                    </DropdownMenuItem>
                    
                    {/* Botón Convertir */}
                    {factura.estado === 'presupuesto' && (
                       <DropdownMenuItem 
                            onClick={() => handleConvertirPresupuesto(factura)} 
                            className="cursor-pointer text-green-600"
                            disabled={loadingConfig || generarNumeroMutation.isPending || updateFacturaMutation.isPending}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" /> Aceptar Presupuesto
                       </DropdownMenuItem>
                    )}

                    {/* Botón Descargar PDF */}
                    {loadingConfig || !config ? (
                        <DropdownMenuItem disabled>
                            <LoadingSpinner className="w-4 h-4 mr-2" /> Cargando PDF...
                        </DropdownMenuItem>
                    ) : (
                        <DownloadFacturaPDF
                            factura={transformarFacturaParaPDF(factura)}
                            config={config}
                            // Pasamos las clases CSS esperadas por DropdownMenuItem como className
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                        >
                             {/* Este es el 'children' que DownloadFacturaPDF clonará y modificará */}
                            <DropdownMenuItem 
                                className="cursor-pointer p-0 w-full" // Ajustar padding y ancho si es necesario
                                onSelect={(e) => e.preventDefault()} // Evitar cierre del menú
                            >
                                <FileText className="mr-2 h-4 w-4" /> Descargar PDF
                            </DropdownMenuItem>
                        </DownloadFacturaPDF>
                    )}

                    {/* Botón Anular */}
                    {factura.estado !== 'anulada' && factura.estado !== 'presupuesto' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            onClick={() => handleAnularFactura(factura)} 
                            className="text-destructive cursor-pointer"
                            disabled={updateFacturaMutation.isPending}
                        >
                           <Trash2 className="mr-2 h-4 w-4" /> Anular
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div>
          <h1 className="text-3xl font-bold">Facturación</h1>
          <p className="text-muted-foreground">Gestión de facturas y presupuestos.</p>
        </div>
        <Button onClick={handleOpenCreateDialog}> <PlusCircle className="w-4 h-4 mr-2" /> Nueva Factura / Presupuesto </Button>
      </div>

      <Card>
        {/* Filtros */}
        <CardHeader>
          <CardTitle>Historial</CardTitle>
           <div className="mt-4 flex flex-col md:flex-row gap-2">
             <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por Nº Factura o Cliente..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filtrar por estado..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="presupuesto">Presupuesto</SelectItem>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                    <SelectItem value="cobrada">Cobrada</SelectItem> {/* Corregido valor */}
                    <SelectItem value="anulada">Anulada</SelectItem>
                </SelectContent>
             </Select>
           </div>
        </CardHeader>
        <CardContent>
           {renderContent()}
           {/* TODO: Añadir paginación si hay muchos documentos */}
        </CardContent>
      </Card>

      {/* Diálogo Crear/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
           <DialogHeader>
                <DialogTitle>{facturaToEdit ? `Editar ${facturaToEdit.estado}` : 'Nuevo Documento'}</DialogTitle>
            </DialogHeader>
           <FacturaForm
                facturaInicial={facturaToEdit}
                onSubmit={handleFormSubmit}
                isSubmitting={createFacturaMutation.isPending || updateFacturaMutation.isPending || generarNumeroMutation.isPending}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Facturacion;
