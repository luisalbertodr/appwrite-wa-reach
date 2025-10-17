import { useGetEmpleados } from '@/hooks/useEmpleados'; // Importamos el hook
import { Empleado } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Empleados = () => {
  // Usamos el hook para obtener los empleados (solo activos por defecto)
  const { data: empleados, isLoading, error } = useGetEmpleados();

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner className="mt-16" />;
    }

    if (error) {
      return <p className="text-center text-destructive">Error al cargar empleados: {error.message}</p>;
    }

    if (!empleados || empleados.length === 0) {
      return <p className="text-center text-muted-foreground mt-8">No se encontraron empleados activos.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre Completo</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empleados.map((empleado: Empleado) => (
            <TableRow key={empleado.$id}>
              <TableCell className="font-medium">{empleado.nombre_completo}</TableCell>
              <TableCell>{empleado.email}</TableCell>
              <TableCell>{empleado.telefono}</TableCell>
              <TableCell><Badge variant="secondary">{empleado.rol}</Badge></TableCell>
              <TableCell>
                <Badge variant={empleado.activo ? 'default' : 'outline'}>
                  {empleado.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      {empleado.activo ? 'Desactivar' : 'Activar'}
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
        <div>
          <h1 className="text-3xl font-bold">Empleados</h1>
          <p className="text-muted-foreground">Gestión de personal y horarios.</p>
        </div>
        <Button>
          <PlusCircle className="w-4 h-4 mr-2" />
          Crear Empleado
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Lista de Empleados</CardTitle>
          {/* Aquí irán los filtros (ej. mostrar inactivos) */}
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Empleados;