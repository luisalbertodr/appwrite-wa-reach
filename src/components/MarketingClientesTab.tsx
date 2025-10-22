import React, { useState, useMemo } from 'react'; // Import React
import { useGetClientes, useUpdateCliente, useDeleteCliente } from '@/hooks/useClientes';
import { ClienteFilters } from '@/services/appwrite-clientes'; // Importar interfaz de filtros
import { Cliente, LipooutUserInput } from '@/types';
import { Models } from 'appwrite';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Trash, Edit, Search } from 'lucide-react';
import { ClienteForm } from '@/components/forms/ClienteForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // Necesario para el botón de Crear
} from '@/components/ui/dialog';

export const MarketingClientsTab = () => {
  const { toast } = useToast();
  // --- Estado para los filtros ---
  const [filters, setFilters] = useState<ClienteFilters>({});
  const debouncedFilters = useDebounce(filters, 500); // Debounce de 500ms
  // --- Fin estado filtros ---

  const [filterSubscribed, setFilterSubscribed] = useState(false); // Filtro frontend
  const [editingClient, setEditingClient] = useState<(Cliente & Models.Document) | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // --- Pasar filtros debounced al hook ---
  const { data: clientes = [], isLoading: loadingClientes, refetch } = useGetClientes(debouncedFilters);
  const updateMutation = useUpdateCliente();
  const deleteMutation = useDeleteCliente();

  // Filtrado por 'suscrito' se hace en el frontend DESPUÉS de la búsqueda/fetch
  const displayedClients = useMemo(() => {
    return clientes.filter(client => {
      // Si el switch está activo, solo mostrar los que tienen 'enviar' a true
      if (filterSubscribed && !client.enviar) {
        return false;
      }
      return true; // Si no está activo el switch, o si el cliente cumple, mostrarlo
    });
  }, [clientes, filterSubscribed]);

  // --- Manejador de cambios genérico para filtros ---
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Actualizar el estado de los filtros
    setFilters(prev => ({
      ...prev,
      // Usar el nombre del input como clave en el objeto de filtros
      // Poner undefined si el valor está vacío para quitar ese filtro específico
      [name]: value || undefined
    }));
  };

  // Actualizar 'enviar' (suscripción)
  const handleToggleSubscribed = async (client: Cliente & Models.Document) => {
    try {
      // Mutar solo el campo 'enviar'
      await updateMutation.mutateAsync({ $id: client.$id, data: { enviar: !client.enviar } });
      toast({ title: client.enviar ? "Suscripción cancelada" : "Cliente suscrito" });
      // Refetch ya no es estrictamente necesario si `displayedClients` reacciona a los cambios en caché
      // Pero lo dejamos por seguridad o si la actualización de caché falla
      refetch();
    } catch (e) {
      toast({ title: "Error al actualizar", description: (e as Error).message, variant: 'destructive' });
    }
  };

  // Eliminar cliente
  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este cliente? Esta acción no se puede deshacer.")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: "Cliente eliminado" });
        // Refetch es necesario aquí ya que el cliente desaparece
        refetch();
      } catch (e) {
        toast({ title: "Error al eliminar", description: (e as Error).message, variant: 'destructive' });
      }
    }
  };

  // Abrir formulario para editar
  const handleEdit = (client: Cliente & Models.Document) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  // Abrir formulario para crear (nuevo botón)
   const handleCreate = () => {
       setEditingClient(null); // Asegurarse de que no hay datos iniciales
       setIsFormOpen(true);
   };

  // Cerrar formulario y refrescar
  const handleFormClose = (didSave: boolean = false) => {
      setIsFormOpen(false);
      setEditingClient(null);
      if (didSave) { // Solo refrescar si se guardó algo
          refetch();
      }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Gestor de Clientes (CRM)</CardTitle>
          <CardDescription>Busca, filtra y gestiona tu base de clientes.</CardDescription>
        </div>
        {/* Botón para crear nuevo cliente */}
        <Button onClick={handleCreate}>Crear Cliente</Button>
      </CardHeader>
      <CardContent>
        {/* --- Sección de Filtros Mejorada --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4 p-4 border rounded-md bg-muted/40">
           <Input
              placeholder="Código Cliente..."
              name="searchCodCli" // Corresponde a ClienteFilters
              value={filters.searchCodCli || ''}
              onChange={handleFilterChange}
           />
           <Input
              placeholder="Nombre / Apellidos..."
              name="searchNombreCompleto" // Corresponde a ClienteFilters
              value={filters.searchNombreCompleto || ''}
              onChange={handleFilterChange}
           />
           <Input
              placeholder="Teléfono..."
              name="searchTel1Cli" // Corresponde a ClienteFilters
              value={filters.searchTel1Cli || ''}
              onChange={handleFilterChange}
           />
           <Input
              placeholder="Email..."
              name="searchEmail" // Corresponde a ClienteFilters
              type="email"
              value={filters.searchEmail || ''}
              onChange={handleFilterChange}
           />
           <Input
              placeholder="Población..."
              name="searchPobCli" // Corresponde a ClienteFilters
              value={filters.searchPobCli || ''}
              onChange={handleFilterChange}
           />
           <Input
              placeholder="Provincia..."
              name="searchProCli" // Corresponde a ClienteFilters
              value={filters.searchProCli || ''}
              onChange={handleFilterChange}
           />
           {/* Switch de filtro 'Suscritos' */}
           <div className="flex items-center space-x-2 col-span-full sm:col-span-1 justify-self-end">
             <Switch
                id="subscribed-filter"
                checked={filterSubscribed}
                onCheckedChange={setFilterSubscribed}
             />
             <Label htmlFor="subscribed-filter">Solo suscritos</Label>
           </div>
        </div>

        {/* Diálogo de Edición/Creación */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            {/* No necesitamos DialogTrigger aquí si usamos el botón externo */}
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
                </DialogHeader>
                {/* Pasar un callback para saber si se guardó */}
                <ClienteForm clienteInicial={editingClient} onFinished={handleFormClose} />
            </DialogContent>
        </Dialog>

        {/* Tabla de Clientes */}
        <ScrollArea className="h-[600px] border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Población</TableHead>
                <TableHead>Suscrito</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingClientes &&
                <TableRow><TableCell colSpan={7} className="h-24 text-center"><LoadingSpinner /></TableCell></TableRow>
              }
              {!loadingClientes && displayedClients.length === 0 && (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No se encontraron clientes con los filtros aplicados.
                </TableCell></TableRow>
              )}
              {displayedClients.map(client => (
                <TableRow key={client.$id}>
                  <TableCell className="font-medium">{client.codcli}</TableCell>
                  <TableCell>{client.nombre_completo}</TableCell>
                  <TableCell>{client.tel1cli}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.pobcli}</TableCell>
                  <TableCell>
                      <Switch
                          checked={client.enviar}
                          onCheckedChange={() => handleToggleSubscribed(client)}
                          aria-label={client.enviar ? "Cancelar suscripción" : "Suscribir cliente"}
                      />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(client)} title="Editar">
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(client.$id)} title="Eliminar">
                        <Trash className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};