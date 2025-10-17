import { useGetClientes } from '@/hooks/useClientes';
import { Cliente } from '@/types'; // Verificado
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner'; // Verificado
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Clientes = () => {
  const { data: clientes, isLoading, error } = useGetClientes();

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner className="mt-16" />;
    }

    if (error) {
      return <p className="text-center text-destructive">Error al cargar clientes: {error.message}</p>;
    }

    if (!clientes || clientes.length === 0) {
      return <p className="text-center text-muted-foreground mt-8">No se encontraron clientes.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre Completo</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>DNI/NIE</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((cliente: Cliente) => (
            <TableRow key={cliente.$id}>
              <TableCell>
                <Badge variant="outline">{cliente.codcli}</Badge>
              </TableCell>
              <TableCell className="font-medium">{cliente.nombre_completo || `${cliente.nomcli || ''} ${cliente.ape1cli || ''}`.trim()}</TableCell> {/* Fallback si nombre_completo falta */}
              <TableCell>{cliente.email}</TableCell>
              <TableCell>{cliente.tel2cli || cliente.tel1cli}</TableCell>
              <TableCell>{cliente.dnicli}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    {/* Corregido el cierre de tag */}
                    <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
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
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gestión de la base de datos de clientes.</p>
        </div>
        <Button>
          <PlusCircle className="w-4 h-4 mr-2" />
          Crear Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          {/* Aquí irán los filtros y la búsqueda */}
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Clientes;