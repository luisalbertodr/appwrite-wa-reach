import { useState } from 'react';
import { useGetArticulos, useGetFamilias } from '@/hooks/useArticulos';
import { Articulo, Familia } from '@/types';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Componente para renderizar la tabla de artículos
const ArticulosTable = ({ familiaId }: { familiaId?: string }) => {
  const { data: articulos, isLoading, error } = useGetArticulos(familiaId);

  if (isLoading) return <LoadingSpinner className="mt-8" />;
  if (error) return <p className="text-center text-destructive">Error al cargar artículos.</p>;
  if (!articulos || articulos.length === 0) {
    return <p className="text-center text-muted-foreground mt-8">No se encontraron artículos.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Familia</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {articulos.map((articulo: Articulo) => (
          <TableRow key={articulo.$id}>
            <TableCell className="font-medium">{articulo.nombre}</TableCell>
            <TableCell><Badge variant="outline">{articulo.tipo}</Badge></TableCell>
            <TableCell>{articulo.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
            <TableCell>{articulo.familia?.nombre || 'N/A'}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Editar</DropdownMenuItem>
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

const Articulos = () => {
  const { data: familias, isLoading: loadingFamilias } = useGetFamilias();
  const [activeTab, setActiveTab] = useState('todos');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Artículos y Servicios</h1>
          <p className="text-muted-foreground">Gestión de productos, servicios y familias.</p>
        </div>
        <Button>
          <PlusCircle className="w-4 h-4 mr-2" />
          Crear Artículo
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Lista de Artículos</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingFamilias ? (
            <LoadingSpinner />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="todos">Todos</TabsTrigger>
                {familias?.map((familia: Familia) => (
                  <TabsTrigger key={familia.$id} value={familia.$id}>
                    {familia.nombre}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="todos">
                <ArticulosTable />
              </TabsContent>
              {familias?.map((familia: Familia) => (
                <TabsContent key={familia.$id} value={familia.$id}>
                  <ArticulosTable familiaId={familia.$id} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Articulos;