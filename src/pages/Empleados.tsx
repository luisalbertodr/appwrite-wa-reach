import { useState } from 'react';
import { useGetEmpleados, useCreateEmpleado, useUpdateEmpleado, useDeleteEmpleado } from '@/hooks/useEmpleados'; // Importar hooks CRUD
import { Empleado, LipooutUserInput } from '@/types'; // Importar tipo Input
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Edit, Trash2, UserX, UserCheck } from 'lucide-react'; // Añadir iconos estado
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
import { EmpleadoForm } from '@/components/forms/EmpleadoForm'; // <-- Importar el formulario
import { useToast } from '@/hooks/use-toast';

const Empleados = () => {
  const { data: empleados, isLoading, error, refetch: refetchEmpleados } = useGetEmpleados(false); // Traer todos (activos e inactivos)
  const createEmpleadoMutation = useCreateEmpleado();
  const updateEmpleadoMutation = useUpdateEmpleado();
  // El hook deleteEmpleado elimina permanentemente, usaremos update para activar/desactivar
  // const deleteEmpleadoMutation = useDeleteEmpleado();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [empleadoToEdit, setEmpleadoToEdit] = useState<(Empleado & Models.Document) | null>(null);

  const handleOpenCreateDialog = () => {
    setEmpleadoToEdit(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (empleado: Empleado & Models.Document) => {
    setEmpleadoToEdit(empleado);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (data: LipooutUserInput<Empleado>) => {
    try {
      if (empleadoToEdit) {
        await updateEmpleadoMutation.mutateAsync({ id: empleadoToEdit.$id, data });
        toast({ title: "Empleado actualizado" });
      } else {
        // TODO: Crear usuario en Appwrite Auth si es necesario?
        await createEmpleadoMutation.mutateAsync(data);
        toast({ title: "Empleado creado" });
      }
      setIsDialogOpen(false);
      setEmpleadoToEdit(null);
      // refetchEmpleados(); // invalidateQueries lo hace
    } catch (err) {
      toast({ title: `Error al ${empleadoToEdit ? 'actualizar' : 'crear'}`, description: (err as Error).message, variant: "destructive" });
    }
  };

  // Cambiar estado activo/inactivo
  const handleToggleActivo = async (empleado: Empleado & Models.Document) => {
      const nuevoEstado = !empleado.activo;
      try {
          await updateEmpleadoMutation.mutateAsync({ id: empleado.$id, data: { activo: nuevoEstado } });
          toast({ title: `Empleado ${nuevoEstado ? 'activado' : 'desactivado'}` });
          // refetchEmpleados(); // invalidateQueries lo hace
      } catch (err) {
           toast({ title: "Error al cambiar estado", description: (err as Error).message, variant: "destructive" });
      }
  };


  const renderContent = () => {
    if (isLoading) { /* ... */ }
    if (error) { /* ... */ }
    if (!empleados || empleados.length === 0) {
       return <p className="text-center text-muted-foreground mt-8">No se encontraron empleados.</p>;
    }

    // Ordenar: Activos primero, luego por nombre
    const empleadosOrdenados = [...empleados].sort((a, b) => {
        if (a.activo !== b.activo) {
            return a.activo ? -1 : 1; // Activos primero
        }
        return (a.nombre_completo || '').localeCompare(b.nombre_completo || ''); // Luego por nombre
    });

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre Completo</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empleadosOrdenados.map((empleado: Empleado & Models.Document) => (
            <TableRow key={empleado.$id} className={!empleado.activo ? 'opacity-50' : ''}> {/* Atenuar inactivos */}
              <TableCell className="font-medium">{empleado.nombre_completo}</TableCell>
              <TableCell>{empleado.email}</TableCell>
              <TableCell>{empleado.telefono}</TableCell>
              <TableCell><Badge variant="secondary">{empleado.rol}</Badge></TableCell>
              <TableCell>
                <Badge variant={empleado.activo ? 'default' : 'outline'}>
                  {empleado.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-8 w-8"> <MoreHorizontal className="w-4 h-4" /> <span className="sr-only">Acciones</span> </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEditDialog(empleado)} className="cursor-pointer">
                       <Edit className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActivo(empleado)} className={`cursor-pointer ${empleado.activo ? 'text-destructive' : 'text-green-600'}`}>
                      {empleado.activo ? <><UserX className="mr-2 h-4 w-4" /> Desactivar</> : <><UserCheck className="mr-2 h-4 w-4" /> Activar</>}
                    </DropdownMenuItem>
                     {/* Podríamos añadir opción de eliminar permanente si es necesario */}
                     {/* <DropdownMenuSeparator />
                     <DropdownMenuItem className="text-destructive cursor-pointer"> <Trash2 className="mr-2 h-4 w-4" /> Eliminar </DropdownMenuItem> */}
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
            <h1 className="text-3xl font-bold">Empleados</h1>
            <p className="text-muted-foreground">Gestión de personal y roles.</p> {/* Actualizado */}
         </div>
        <Button onClick={handleOpenCreateDialog}> <PlusCircle className="w-4 h-4 mr-2" /> Crear Empleado </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Empleados</CardTitle>
          {/* TODO: Añadir filtros (por rol, estado) */}
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>

      {/* --- Diálogo para Crear/Editar Empleado --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{empleadoToEdit ? 'Editar Empleado' : 'Crear Nuevo Empleado'}</DialogTitle>
          </DialogHeader>
          <EmpleadoForm
            empleadoInicial={empleadoToEdit}
            onSubmit={handleFormSubmit}
            isSubmitting={createEmpleadoMutation.isPending || updateEmpleadoMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Empleados;
