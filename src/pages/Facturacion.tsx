import { useState } from 'react';
import { useGetFacturas, useCreateFactura, useUpdateFactura, useDeleteFactura } from '@/hooks/useFacturas';
import { useGetConfiguracion, useGenerarSiguienteNumero } from '@/hooks/useConfiguracion'; // <-- 1. Importar
import { Factura, FacturaInputData, CreateFacturaInput, UpdateFacturaInput } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // <-- 2. Importar
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // <-- 2. Importar
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Edit, Trash2, FileText, CheckCircle, Search } from 'lucide-react'; // <-- 2. Importar
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  DropdownMenu,
  // ... (otros imports)
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  // ... (otros imports)
} from "@/components/ui/dialog";
import { FacturaForm } from '@/components/forms/FacturaForm';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// (Helper sin cambios)
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

const Facturacion = () => {
  // --- 3. Estado de Filtros ---
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState(''); // 'todos'

  // --- 4. Hooks de Datos ---
  const { data: facturas, isLoading, error, refetch: refetchFacturas } = useGetFacturas(searchTerm, estadoFilter === 'todos' ? '' : estadoFilter);
  const createFacturaMutation = useCreateFactura();
  const updateFacturaMutation = useUpdateFactura();
  const deleteFacturaMutation = useDeleteFactura();
  const { data: config, isLoading: loadingConfig } = useGetConfiguracion(); // Para convertir
  const generarNumeroMutation = useGenerarSiguienteNumero(); // Para convertir
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [facturaToEdit, setFacturaToEdit] = useState<(Factura & Models.Document) | null>(null);

  // ... (Manejadores Dialog y FormSubmit sin cambios) ...
  const handleOpenCreateDialog = () => { /* ... */ };
  const handleOpenEditDialog = (factura: Factura & Models.Document) => { /* ... */ };
  const handleFormSubmit = async (data: FacturaInputData) => { /* ... */ };

  // (Anular sin cambios)
  const handleAnularFactura = async (factura: Factura & Models.Document) => { /* ... */ };

  // --- 5. (NUEVO) Manejador para Convertir Presupuesto ---
  const handleConvertirPresupuesto = async (presupuesto: Factura & Models.Document) => {
    if (presupuesto.estado !== 'presupuesto' || !config) {
        toast({ title: "Error", description: "No es un presupuesto válido o la configuración no ha cargado.", variant: "destructive" });
        return;
    }

    if (window.confirm(`¿Estás seguro de convertir el presupuesto ${presupuesto.numeroFactura} en una factura?`)) {
        try {
            // 1. Generar nuevo número de FACTURA
            const { numeroCompleto } = await generarNumeroMutation.mutateAsync({ config, tipo: 'factura' });
            
            // 2. Preparar actualización
            const updateData: UpdateFacturaInput = {
                estado: 'finalizada', // Convertir a 'finalizada' (o 'borrador' si se prefiere)
                numeroFactura: numeroCompleto, // Asignar nuevo número
                fechaEmision: format(new Date(), 'yyyy-MM-dd'), // Actualizar fecha
            };

            // 3. Ejecutar actualización
            await updateFacturaMutation.mutateAsync({ $id: presupuesto.$id, data: updateData });

            toast({ title: "Presupuesto Aceptado", description: `Se ha generado la factura ${numeroCompleto}.` });
            // refetchFacturas(); // InvalidateQueries lo hace

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
              {/* ... Celdas ... */}
               <TableCell className="font-medium">{factura.numeroFactura}</TableCell>
               <TableCell>{factura.fechaEmision ? format(parseISO(factura.fechaEmision), 'dd/MM/yyyy', { locale: es }) : '-'}</TableCell>
               <TableCell className="truncate">{factura.cliente?.nombre_completo || factura.cliente_id}</TableCell>
               <TableCell className="text-right">{(typeof factura.totalAPagar === 'number') ? factura.totalAPagar.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-'}</TableCell>
               <TableCell><Badge variant={factura.estado === 'cobrada' ? 'default' : 'outline'}>{traducirEstadoFactura(factura.estado)}</Badge></TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"> <MoreHorizontal className="w-4 h-4" /> <span className="sr-only">Acciones</span> </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEditDialog(factura)} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" /> Ver/Editar
                    </DropdownMenuItem>
                    
                    {/* --- 6. (NUEVO) Botón Convertir --- */}
                    {factura.estado === 'presupuesto' && (
                       <DropdownMenuItem 
                            onClick={() => handleConvertirPresupuesto(factura)} 
                            className="cursor-pointer text-green-600"
                            disabled={loadingConfig || generarNumeroMutation.isPending}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" /> Aceptar Presupuesto
                       </DropdownMenuItem>
                    )}

                    <DropdownMenuItem disabled>
                       <FileText className="mr-2 h-4 w-4" /> Descargar PDF
                    </DropdownMenuItem>

                    {factura.estado !== 'anulada' && factura.estado !== 'presupuesto' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAnularFactura(factura)} className="text-destructive cursor-pointer">
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
        {/* --- 7. (NUEVO) Filtros --- */}
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
                    <SelectItem value("cobrada">Cobrada</SelectItem>
                    <SelectItem value="anulada">Anulada</SelectItem>
                </SelectContent>
             </Select>
           </div>
        </CardHeader>
        <CardContent>
           {renderContent()}
        </CardContent>
      </Card>

      {/* --- Diálogo (sin cambios) --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          {/* ... (Contenido Diálogo sin cambios) ... */}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Facturacion;