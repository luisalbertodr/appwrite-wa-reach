import { useState } from 'react';
import { useGetFacturas, useCreateFactura, useUpdateFactura, useDeleteFactura } from '@/hooks/useFacturas'; // Importar hooks CRUD
import { Factura, FacturaInputData, CreateFacturaInput, UpdateFacturaInput } from '@/types'; // Importar tipos Input
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Edit, Trash2, FileText } from 'lucide-react'; // Añadir iconos
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
import { FacturaForm } from '@/components/forms/FacturaForm'; // <-- Importar el formulario
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const traducirEstadoFactura = (estado: string): string => { /* ... */ };

const Facturacion = () => {
  const { data: facturas, isLoading, error, refetch: refetchFacturas } = useGetFacturas(); // Obtener refetch
  const createFacturaMutation = useCreateFactura();
  const updateFacturaMutation = useUpdateFactura();
  const deleteFacturaMutation = useDeleteFactura(); // Usaremos anular (update) en lugar de delete
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [facturaToEdit, setFacturaToEdit] = useState<(Factura & Models.Document) | null>(null);

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
        await updateFacturaMutation.mutateAsync({ $id: facturaToEdit.$id, data: data as UpdateFacturaInput });
        toast({ title: "Documento actualizado" });
      } else {
        await createFacturaMutation.mutateAsync(data as CreateFacturaInput);
        toast({ title: "Documento creado" });
      }
      setIsDialogOpen(false);
      setFacturaToEdit(null);
      // refetchFacturas(); // invalidateQueries lo hace
    } catch (err) {
      toast({ title: `Error al ${facturaToEdit ? 'actualizar' : 'crear'}`, description: (err as Error).message, variant: "destructive" });
    }
  };

  // Anular factura (cambiar estado)
  const handleAnularFactura = async (factura: Factura & Models.Document) => {
      if (factura.estado === 'anulada') return; // Ya está anulada
      if (window.confirm(`¿Estás seguro de anular el documento ${factura.numeroFactura}?`)) {
          try {
              await updateFacturaMutation.mutateAsync({ $id: factura.$id, data: { estado: 'anulada' } });
              toast({ title: "Documento anulado" });
               // refetchFacturas(); // invalidateQueries lo hace
          } catch (err) {
              toast({ title: "Error al anular", description: (err as Error).message, variant: "destructive" });
          }
      }
  };


  const renderContent = () => {
    if (isLoading) { /* ... */ }
    if (error) { /* ... */ }
    if (!facturas || facturas.length === 0) { /* ... */ }

    return (
      <Table>
        <TableHeader> {/* ... */} </TableHeader>
        <TableBody>
          {facturas.map((factura: Factura & Models.Document) => ( // Tipo completo
            <TableRow key={factura.$id}>
              {/* ... Celdas ... */}
               <TableCell className="font-medium">{factura.numeroFactura}</TableCell>
               <TableCell>{factura.fechaEmision ? format(parseISO(factura.fechaEmision), 'dd/MM/yyyy', { locale: es }) : '-'}</TableCell>
               <TableCell className="truncate">{factura.cliente?.nombre_completo || factura.cliente_id}</TableCell>
               <TableCell className="text-right">{(typeof factura.totalAPagar === 'number') ? factura.totalAPagar.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-'}</TableCell>
               <TableCell><Badge variant={/*...*/}>{traducirEstadoFactura(factura.estado)}</Badge></TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"> <MoreHorizontal className="w-4 h-4" /> <span className="sr-only">Acciones</span> </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEditDialog(factura)} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" /> Ver/Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled> {/* Deshabilitado por ahora */}
                       <FileText className="mr-2 h-4 w-4" /> Descargar PDF
                    </DropdownMenuItem>
                    {factura.estado !== 'anulada' && (
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
        {/* ... Título ... */}
         <div>
          <h1 className="text-3xl font-bold">Facturación</h1>
          <p className="text-muted-foreground">Gestión de facturas y presupuestos.</p>
        </div>
        <Button onClick={handleOpenCreateDialog}> <PlusCircle className="w-4 h-4 mr-2" /> Nueva Factura / Presupuesto </Button>
      </div>

      <Card>
        <CardHeader> <CardTitle>Historial</CardTitle> </CardHeader> {/* Simplificado */}
        <CardContent> {renderContent()} </CardContent>
      </Card>

      {/* --- Diálogo para Crear/Editar Factura --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         {/* Hacemos el diálogo más grande para el formulario complejo */}
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{facturaToEdit ? `Editar ${facturaToEdit.estado}` : 'Nuevo Documento'}</DialogTitle>
          </DialogHeader>
          {/* El formulario ahora ocupa el espacio y tiene su propio scroll */}
          <div className="flex-1 min-h-0">
             <FacturaForm
                facturaInicial={facturaToEdit}
                onSubmit={handleFormSubmit}
                isSubmitting={createFacturaMutation.isPending || updateFacturaMutation.isPending}
              />
          </div>
           {/* El botón de submit está DENTRO de FacturaForm */}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Facturacion;