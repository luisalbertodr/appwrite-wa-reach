import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
// --- *** INICIO CORRECCIÓN *** ---
import { useArticulos } from '@/hooks/useArticulos'; // Importación nombrada (CORRECTA)
// --- *** FIN CORRECCIÓN *** ---
import { TArticulo } from '@/types/articulo.types'; // Tipo de dato para Articulo
import { ArticuloForm } from '@/components/forms/ArticuloForm'; // Importación nombrada (ya corregida antes)
import LoadingSpinner from '@/components/LoadingSpinner'; // Indicador de carga
import { toast } from '@/components/ui/use-toast'; // Para mostrar notificaciones

// Componentes de Sheet para el panel lateral
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";


function Articulos() {
  // Estado y hooks
  const { articulos, isLoading, error, createArticulo, updateArticulo, deleteArticulo } = useArticulos(); // Hook para datos de artículos
  const [selectedArticulo, setSelectedArticulo] = useState<TArticulo | null>(null); // Artículo seleccionado para editar
  const [isSheetOpen, setIsSheetOpen] = useState(false); // Controla si el panel lateral (Sheet) está abierto
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado de envío del formulario

  // --- Manejadores de eventos ---

  // Abre el Sheet con los datos del artículo para editarlo
  const handleEdit = (articulo: TArticulo) => {
    setSelectedArticulo(articulo);
    setIsSheetOpen(true);
  };

  // Elimina un artículo por su ID
  const handleDelete = async (id: string) => {
    try {
      await deleteArticulo(id);
      toast({
        title: "Artículo eliminado",
        description: "El artículo ha sido eliminado correctamente.",
      });
    } catch (err) {
      toast({
        title: "Error al eliminar",
        description: `No se pudo eliminar el artículo. Error: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      });
    }
  };

  // Abre el Sheet con el formulario vacío para crear un nuevo artículo
  const handleCreate = () => {
    setSelectedArticulo(null); // Limpia la selección previa
    setIsSheetOpen(true); // Abre el panel
  };

  // Maneja el envío del formulario (crear o actualizar)
  const handleSubmit = async (data: any) => {
    console.log('🎯 Articulos.tsx - Datos recibidos en handleSubmit:', data);
    console.log('🎯 Articulos.tsx - selectedArticulo:', selectedArticulo);
    setIsSubmitting(true);
    try {
      if (selectedArticulo) {
        // Actualizar artículo existente
        console.log('⚡ Articulos.tsx - Llamando a updateArticulo con:', { id: selectedArticulo.$id, data });
        await updateArticulo({ id: selectedArticulo.$id, data });
        toast({
          title: "Artículo actualizado",
          description: "El artículo ha sido actualizado correctamente.",
        });
      } else {
        // Crear nuevo artículo
        console.log('⚡ Articulos.tsx - Llamando a createArticulo con:', data);
        await createArticulo(data);
        toast({
          title: "Artículo creado",
          description: "El artículo ha sido creado correctamente.",
        });
      }
      // Cerrar el Sheet y limpiar selección
      setIsSheetOpen(false);
      setSelectedArticulo(null);
    } catch (err) {
      console.error('❌ Articulos.tsx - Error:', err);
      toast({
        title: "Error",
        description: `No se pudo ${selectedArticulo ? 'actualizar' : 'crear'} el artículo. Error: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Renderizado condicional ---

  // Muestra spinner mientras carga
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Muestra mensaje de error si falla la carga
  if (error) {
    return <div className="text-red-500">Error al cargar artículos: {error.message}</div>;
  }

  // --- Renderizado principal ---
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6"> {/* Añadido padding para consistencia */}

      {/* --- Botón Crear y Panel Lateral (Sheet) --- */}
      <div className="flex justify-end">
        {/* Usamos Sheet para controlar el estado abierto/cerrado */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          {/* SheetTrigger envuelve el botón que abre el panel */}
          <SheetTrigger asChild>
            <Button size="sm" className="h-8 gap-1" onClick={handleCreate}> {/* Ajustado tamaño de botón */}
              <PlusCircle className="h-4 w-4" /> {/* Ajustado tamaño de icono */}
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Crear Artículo
              </span>
            </Button>
          </SheetTrigger>
          {/* SheetContent es el contenedor del panel lateral */}
          <SheetContent className="sm:max-w-lg"> {/* Aumentado ancho máximo */}
            {/* SheetHeader contiene título y descripción */}
            <SheetHeader>
              <SheetTitle>{selectedArticulo ? 'Editar Artículo' : 'Crear Nuevo Artículo'}</SheetTitle>
              {/* SheetDescription mejora la accesibilidad */}
              <SheetDescription>
                {selectedArticulo
                  ? "Modifica los detalles del artículo existente y guarda los cambios."
                  : "Rellena los campos para añadir un nuevo artículo al catálogo."}
              </SheetDescription>
            </SheetHeader>
            {/* Renderiza el formulario dentro del panel */}
            <div className="py-4"> {/* Añadido padding vertical */}
              <ArticuloForm
                articuloInicial={selectedArticulo}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* --- Tarjeta con la Tabla de Artículos --- */}
      <Card>
        <CardHeader>
          <CardTitle>Artículos</CardTitle>
          <CardDescription>Gestiona los artículos y servicios ofrecidos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Familia</TableHead>
                <TableHead className="hidden sm:table-cell">Precio</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Si hay artículos, mapearlos a filas */}
              {articulos && articulos.length > 0 ? (
                articulos.map((articulo) => (
                  <TableRow key={articulo.$id}>
                    <TableCell className="font-medium">{articulo.nombre}</TableCell>
                    <TableCell className="hidden md:table-cell">{articulo.familia?.nombre || 'N/A'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{`${articulo.precio?.toFixed(2) ?? '0.00'} €`}</TableCell>
                    <TableCell>
                      <Badge variant={articulo.activo ? 'default' : 'outline'}>
                        {articulo.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right"> {/* Alineado a la derecha */}
                      {/* Menú desplegable para acciones */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(articulo)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(articulo.$id)}> {/* Estilo para eliminar */}
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // Mensaje si no hay artículos
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24"> {/* Añadido altura */}
                    No se encontraron artículos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {/*
        <CardFooter>
          // Aquí podría ir la paginación si fuera necesaria
        </CardFooter>
        */}
      </Card>
    </div>
  );
}

export default Articulos;
