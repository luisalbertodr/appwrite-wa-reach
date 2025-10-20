import { useState } from 'react';
import { 
  useGetArticulos, 
  useGetFamilias, 
  useCreateArticulo, 
  useUpdateArticulo, 
  useDeleteArticulo,
  useCreateFamilia,  // <-- NUEVO
  useUpdateFamilia,  // <-- NUEVO
  useDeleteFamilia   // <-- NUEVO
} from '@/hooks/useArticulos';
import { Articulo, Familia, ArticuloInput, LipooutUserInput } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Settings, ListTree } from 'lucide-react'; // <-- NUEVO Icono
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArticuloForm } from '@/components/forms/ArticuloForm';
import { FamiliaForm } from '@/components/forms/FamiliaForm'; // <-- NUEVO Form
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- Tabla Artículos (sin cambios) ---
const ArticulosTable = ({ 
  familiaId, 
  onEdit,
  onDelete
}: { 
  familiaId?: string,
  onEdit: (articulo: Articulo & Models.Document) => void,
  onDelete: (articulo: Articulo & Models.Document) => void 
}) => {
  const { data: articulos, isLoading, error } = useGetArticulos(familiaId);
  // ... (renderizado de tabla sin cambios)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Familia</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {articulos?.map((articulo: Articulo & Models.Document) => (
          <TableRow key={articulo.$id} className={!articulo.activo ? 'opacity-50' : ''}>
            <TableCell className="font-medium">{articulo.nombre}</TableCell>
            <TableCell><Badge variant="outline">{articulo.tipo}</Badge></TableCell>
            <TableCell>{articulo.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
            <TableCell>{articulo.familia?.nombre || 'N/A'}</TableCell>
            <TableCell>
                <Badge variant={articulo.activo ? 'default' : 'outline'}>
                  {articulo.activo ? 'Activo' : 'Inactivo'}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
              {/* ... DropdownMenu ... */}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// --- Componente Gestión Familias (NUEVO) ---
const GestionFamilias = () => {
  const { data: familias, isLoading } = useGetFamilias();
  const createFamiliaMutation = useCreateFamilia();
  const updateFamiliaMutation = useUpdateFamilia();
  const deleteFamiliaMutation = useDeleteFamilia();
  const { toast } = useToast();
  const [familiaToEdit, setFamiliaToEdit] = useState<(Familia & Models.Document) | null>(null);

  const handleFamiliaSubmit = async (data: LipooutUserInput<Familia>) => {
    try {
      if (familiaToEdit) {
        await updateFamiliaMutation.mutateAsync({ id: familiaToEdit.$id, data });
        toast({ title: "Familia actualizada" });
        setFamiliaToEdit(null);
      } else {
        await createFamiliaMutation.mutateAsync(data);
        toast({ title: "Familia creada" });
      }
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteFamilia = async (familia: Familia & Models.Document) => {
    if (window.confirm(`¿Eliminar familia "${familia.nombre}"? (No se eliminarán sus artículos)`)) {
      try {
        await deleteFamiliaMutation.mutateAsync(familia.$id);
        toast({ title: "Familia eliminada" });
      } catch (err) {
        toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Columna 1: Crear / Editar */}
      <div>
        <h4 className="text-lg font-medium mb-4">{familiaToEdit ? "Editar Familia" : "Nueva Familia"}</h4>
        <FamiliaForm
          familiaInicial={familiaToEdit}
          onSubmit={handleFamiliaSubmit}
          isSubmitting={createFamiliaMutation.isPending || updateFamiliaMutation.isPending}
        />
        {familiaToEdit && (
            <Button variant="link" onClick={() => setFamiliaToEdit(null)} className="mt-2">
                Cancelar edición
            </Button>
        )}
      </div>

      {/* Columna 2: Lista */}
      <div>
        <h4 className="text-lg font-medium mb-4">Familias Existentes</h4>
        <ScrollArea className="h-[400px] border rounded-md">
            {isLoading && <LoadingSpinner />}
            {familias?.map(familia => (
                <div key={familia.$id} className="flex items-center justify-between p-2 border-b">
                    <span>{familia.nombre}</span>
                    <div className="space-x-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFamiliaToEdit(familia)}>
                            <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteFamilia(familia)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ))}
        </ScrollArea>
      </div>
    </div>
  );
};


// --- Componente Principal Artículos (MODIFICADO) ---
const Articulos = () => {
  const { data: familias, isLoading: loadingFamilias } = useGetFamilias();
  const createArticuloMutation = useCreateArticulo();
  const updateArticuloMutation = useUpdateArticulo();
  const deleteArticuloMutation = useDeleteArticulo();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('todos');
  const [isArticuloDialogOpen, setIsArticuloDialogOpen] = useState(false);
  const [isFamiliaDialogOpen, setIsFamiliaDialogOpen] = useState(false); // <-- NUEVO
  const [articuloToEdit, setArticuloToEdit] = useState<(Articulo & Models.Document) | null>(null);

  // ... (Manejadores CRUD Artículos sin cambios) ...
  const handleOpenCreateDialog = () => {
    setArticuloToEdit(null);
    setIsArticuloDialogOpen(true);
  };
  const handleOpenEditDialog = (articulo: Articulo & Models.Document) => {
    setArticuloToEdit(articulo);
    setIsArticuloDialogOpen(true);
  };
  const handleDeleteArticulo = async (articulo: Articulo & Models.Document) => { /* ... */ };
  const handleFormSubmit = async (data: LipooutUserInput<ArticuloInput>) => { /* ... */ };

  const renderTabsContent = (familiaId?: string) => (
    <ArticulosTable 
      familiaId={familiaId}
      onEdit={handleOpenEditDialog}
      onDelete={handleDeleteArticulo}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Artículos y Servicios</h1>
          <p className="text-muted-foreground">Gestión de productos, servicios y familias.</p>
        </div>
        <div className="flex gap-2"> {/* <-- NUEVO Wrapper */}
            <Button variant="outline" onClick={() => setIsFamiliaDialogOpen(true)}>
                <ListTree className="w-4 h-4 mr-2" />
                Gestionar Familias
            </Button>
            <Button onClick={handleOpenCreateDialog}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Crear Artículo
            </Button>
        </div>
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
                {renderTabsContent()}
              </TabsContent>
              {familias?.map((familia: Familia) => (
                <TabsContent key={familia.$id} value={familia.$id}>
                  {renderTabsContent(familia.$id)}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* --- Diálogo para Crear/Editar Artículo --- */}
      <Dialog open={isArticuloDialogOpen} onOpenChange={setIsArticuloDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{articuloToEdit ? 'Editar Artículo' : 'Crear Nuevo Artículo'}</DialogTitle>
          </DialogHeader>
          <ArticuloForm
            articuloInicial={articuloToEdit}
            onSubmit={handleFormSubmit}
            isSubmitting={createArticuloMutation.isPending || updateArticuloMutation.isPending}
          />
        </DialogContent>
      </Dialog>

       {/* --- Diálogo para Gestionar Familias (NUEVO) --- */}
      <Dialog open={isFamiliaDialogOpen} onOpenChange={setIsFamiliaDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gestionar Familias</DialogTitle>
          </DialogHeader>
          <GestionFamilias />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Articulos;