import { useState } from 'react';
import { useGetFacturas, useCreateFactura, useUpdateFactura, useDeleteFactura } from '@/hooks/useFacturas';
import { useGetConfiguracion, useGenerarSiguienteNumero } from '@/hooks/useConfiguracion';
import { Factura, FacturaInputData, CreateFacturaInput, UpdateFacturaInput, Configuracion } from '@/types'; // Importar Configuracion
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
import { DownloadFacturaPDF } from '@/components/pdf/DownloadFacturaPDF'; // <-- 1. Importar
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ... (Helper traducirEstadoFactura sin cambios) ...

const Facturacion = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  const { data: facturas, isLoading, error } = useGetFacturas(searchTerm, estadoFilter === 'todos' ? '' : estadoFilter);
  const updateFacturaMutation = useUpdateFactura();
  const { data: config, isLoading: loadingConfig } = useGetConfiguracion(); // <-- 2. Obtener config
  const generarNumeroMutation = useGenerarSiguienteNumero();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [facturaToEdit, setFacturaToEdit] = useState<(Factura & Models.Document) | null>(null);

  // ... (Manejadores handleOpen... handleFormSubmit... handleAnularFactura... handleConvertirPresupuesto... sin cambios) ...

  const renderContent = () => {
    if (isLoading) { /* ... */ }
    if (error) { /* ... */ }
    if (!facturas || facturas.length === 0) { /* ... */ }

    return (
      <Table>
        {/* ... (TableHeader sin cambios) ... */}
        <TableBody>
          {facturas.map((factura: Factura & Models.Document) => (
            <TableRow key={factura.$id}>
              {/* ... (Otras Celdas sin cambios) ... */}
               <TableCell className="font-medium">{factura.numeroFactura}</TableCell>
               <TableCell>{factura.fechaEmision ? format(parseISO(factura.fechaEmision), 'dd/MM/yyyy', { locale: es }) : '-'}</TableCell>
               <TableCell className="truncate">{factura.cliente?.nombre_completo || factura.cliente_id}</TableCell>
               <TableCell className="text-right">{/* ... (Total) ... */}</TableCell>
               <TableCell>{/* ... (Badge Estado) ... */}</TableCell>
              
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"> <MoreHorizontal className="w-4 h-4" /> <span className="sr-only">Acciones</span> </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEditDialog(factura)} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" /> Ver/Editar
                    </DropdownMenuItem>
                    
                    {/* --- 3. (MODIFICADO) Botón Descargar PDF --- */}
                    {loadingConfig || !config ? (
                        <DropdownMenuItem disabled>
                            <LoadingSpinner className="w-4 h-4 mr-2" /> Cargando PDF...
                        </DropdownMenuItem>
                    ) : (
                        <DownloadFacturaPDF
                            factura={factura}
                            config={config}
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                        >
                            {/* Este es el 'children' que DownloadFacturaPDF clonará */}
                            <DropdownMenuItem 
                                className="cursor-pointer p-0" 
                                onSelect={(e) => e.preventDefault()} // Evitar que el menú se cierre al hacer clic
                            >
                                <FileText className="mr-2 h-4 w-4" /> Descargar PDF
                            </DropdownMenuItem>
                        </DownloadFacturaPDF>
                    )}
                    
                    {/* ... (Botones Aceptar Presupuesto y Anular sin cambios) ... */}
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
       {/* ... (Header y CardHeader con filtros sin cambios) ... */}
       <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
           <div className="mt-4 flex flex-col md:flex-row gap-2">
            {/* ... (Filtros) ... */}
           </div>
        </CardHeader>
        <CardContent>
           {renderContent()}
        </CardContent>
      </Card>

      {/* --- Diálogo (sin cambios) --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {/* ... */}
      </Dialog>
    </div>
  );
};

export default Facturacion;