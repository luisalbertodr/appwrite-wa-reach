import { useState } from 'react';
import { useGetClientes, useCreateCliente, useUpdateCliente, useDeleteCliente } from '@/hooks/useClientes';
import { Cliente, LipooutUserInput } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // <-- Importar Input
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Search } from 'lucide-react'; // <-- Importar Search
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  DropdownMenu,
  // ... (otros imports Dropdown)
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  // ... (otros imports Dialog)
} from "@/components/ui/dialog";
import { ClienteForm } from '@/components/forms/ClienteForm';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

// --- (Si no existe useDebounce, usar este simple) ---
// import { useEffect } from 'react';
// const useDebounce = (value: string, delay: number) => {
//   const [debouncedValue, setDebouncedValue] = useState(value);
//   useEffect(() => {
//     const handler = setTimeout(() => {
//       setDebouncedValue(value);
//     }, delay);
//     return () => {
//       clearTimeout(handler);
//     };
//   }, [value, delay]);
//   return debouncedValue;
// };
// ----------------------------------------------------


const Clientes = () => {
  // --- (NUEVO) Estado de Búsqueda ---
  const [searchTerm, setSearchTerm] = useState("");
  // const debouncedSearchTerm = useDebounce(searchTerm, 300); // Opcional
  
  // (MODIFICADO) Hook usa el término de búsqueda
  const { data: clientes, isLoading, error, refetch: refetchClientes } = useGetClientes(searchTerm); // Usamos searchTerm directo
  
  const createClienteMutation = useCreateCliente();
  const updateClienteMutation = useUpdateCliente();
  const deleteClienteMutation = useDeleteCliente();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [clienteToEdit, setClienteToEdit] = useState<(Cliente & Models.Document) | null>(null);

  // ... (Manejadores handleOpen... y handleFormSubmit sin cambios) ...
  const handleOpenCreateDialog = () => { /* ... */ };
  const handleOpenEditDialog = (cliente: Cliente & Models.Document) => { /* ... */ };
  const handleFormSubmit = async (data: LipooutUserInput<Cliente>) => { /* ... */ };
  const handleDeleteCliente = async (clienteId: string, nombreCliente: string) => { /* ... */ };


  const renderContent = () => {
    if (isLoading) { 
        return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
    }
    if (error) { 
        return <p className="text-center text-destructive py-8">Error al cargar clientes.</p>;
    }
    if (!clientes || clientes.length === 0) { 
        return <p className="text-center text-muted-foreground py-8">
            {searchTerm ? 'No se encontraron clientes.' : 'No hay clientes creados.'}
        </p>;
    }

    return (
      <Table>
        {/* ... (Table Header sin cambios) ... */}
        <TableBody>
          {clientes.map((cliente: Cliente & Models.Document) => (
            <TableRow key={cliente.$id}>
              {/* ... (Celdas sin cambios) ... */}
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
        <Button onClick={handleOpenCreateDialog}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Crear Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          {/* --- (NUEVO) Barra de Búsqueda --- */}
          <div className="mt-4 relative">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
             <Input
                type="search"
                placeholder="Buscar por nombre, DNI, email..."
                className="pl-8 w-full md:w-1/3"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>

      {/* --- Diálogo (sin cambios) --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {/* ... (Contenido Diálogo sin cambios) ... */}
      </Dialog>
    </div>
  );
};

export default Clientes;
