import { useState } from 'react'; // Importar useState
import { useGetClientes, useCreateCliente, useUpdateCliente, useDeleteCliente } from '@/hooks/useClientes'; // Importar hooks CRUD
import { Cliente, LipooutUserInput } from '@/types';
import { Models } from 'appwrite'; // Importar Models
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react'; // Añadir iconos Edit, Trash2
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
  DialogTrigger,
  DialogFooter, // Importar DialogFooter si lo usa ClienteForm
  DialogClose // Importar DialogClose si lo usa ClienteForm
} from "@/components/ui/dialog"; // Importar Dialog
import { ClienteForm } from '@/components/forms/ClienteForm'; // <-- Importar el formulario
import { useToast } from '@/hooks/use-toast'; // Para notificaciones

const Clientes = () => {
  const { data: clientes, isLoading, error, refetch: refetchClientes } = useGetClientes(); // Obtener refetch
  const createClienteMutation = useCreateCliente();
  const updateClienteMutation = useUpdateCliente();
  const deleteClienteMutation = useDeleteCliente();
  const { toast } = useToast();

  // Estado para controlar el diálogo y el cliente a editar
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [clienteToEdit, setClienteToEdit] = useState<(Cliente & Models.Document) | null>(null);

  // Abrir diálogo para crear
  const handleOpenCreateDialog = () => {
    setClienteToEdit(null); // Asegurar que no hay datos de edición
    setIsDialogOpen(true);
  };

  // Abrir diálogo para editar
  const handleOpenEditDialog = (cliente: Cliente & Models.Document) => {
    setClienteToEdit(cliente);
    setIsDialogOpen(true);
  };

  // Manejar envío del formulario (crear o actualizar)
  const handleFormSubmit = async (data: LipooutUserInput<Cliente>) => {
    try {
      if (clienteToEdit) {
        // Actualizar cliente existente
        await updateClienteMutation.mutateAsync({ $id: clienteToEdit.$id, data });
        toast({ title: "Cliente actualizado con éxito" });
      } else {
        // Crear nuevo cliente
        await createClienteMutation.mutateAsync(data);
        toast({ title: "Cliente creado con éxito" });
      }
      setIsDialogOpen(false); // Cerrar diálogo
      setClienteToEdit(null); // Limpiar cliente en edición
      refetchClientes(); // Recargar la lista de clientes
    } catch (err) {
      toast({
        title: `Error al ${clienteToEdit ? 'actualizar' : 'crear'} cliente`,
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

   // Manejar eliminación de cliente (con confirmación simple)
   const handleDeleteCliente = async (clienteId: string, nombreCliente: string) => {
       if (window.confirm(`¿Estás seguro de que deseas eliminar a ${nombreCliente}? Esta acción no se puede deshacer.`)) {
           try {
               await deleteClienteMutation.mutateAsync(clienteId);
               toast({ title: "Cliente eliminado" });
               refetchClientes(); // Recargar lista
           } catch (err) {
               toast({
                   title: "Error al eliminar cliente",
                   description: (err as Error).message,
                   variant: "destructive",
               });
           }
       }
   };


  const renderContent = () => {
    if (isLoading) { /* ... */ }
    if (error) { /* ... */ }
    if (!clientes || clientes.length === 0) { /* ... */ }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre Completo</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>DNI/NIE</TableHead>
            <TableHead className="text-right">Acciones</TableHead> {/* Alineado a la derecha */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((cliente: Cliente & Models.Document) => ( // Añadir Models.Document al tipo
            <TableRow key={cliente.$id}>
              <TableCell> <Badge variant="outline">{cliente.codcli}</Badge> </TableCell>
              <TableCell className="font-medium">{cliente.nombre_completo || `${cliente.nomcli || ''} ${cliente.ape1cli || ''}`.trim()}</TableCell>
              <TableCell>{cliente.email}</TableCell>
              <TableCell>{cliente.tel2cli || cliente.tel1cli}</TableCell>
              <TableCell>{cliente.dnicli}</TableCell>
              <TableCell className="text-right"> {/* Contenedor alineado a la derecha */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"> {/* Ajustar tamaño */}
                      <MoreHorizontal className="w-4 h-4" />
                       <span className="sr-only">Acciones</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end"> {/* Alinear menú */}
                    <DropdownMenuItem onClick={() => handleOpenEditDialog(cliente)} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                       onClick={() => handleDeleteCliente(cliente.$id, cliente.nombre_completo || cliente.nomcli || 'este cliente')}
                       className="text-destructive cursor-pointer"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
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
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gestión de la base de datos de clientes.</p>
        </div>
        {/* Botón para abrir diálogo de creación */}
        <Button onClick={handleOpenCreateDialog}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Crear Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          {/* TODO: Añadir filtros y búsqueda */}
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>

      {/* --- Diálogo para Crear/Editar Cliente --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl"> {/* Hacer el diálogo más ancho */}
          <DialogHeader>
            <DialogTitle>{clienteToEdit ? 'Editar Cliente' : 'Crear Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          {/* Renderizar el formulario dentro del diálogo */}
          {/* Pasamos el cliente a editar (o null) y la función de submit */}
          <ClienteForm
            clienteInicial={clienteToEdit}
            onSubmit={handleFormSubmit}
            isSubmitting={createClienteMutation.isPending || updateClienteMutation.isPending}
          />
           {/* El botón de submit está dentro de ClienteForm */}
           {/* Podemos añadir un botón de cancelar si no está en ClienteForm */}
           {/* <DialogFooter> <DialogClose asChild> <Button variant="ghost">Cancelar</Button> </DialogClose> </DialogFooter> */}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;