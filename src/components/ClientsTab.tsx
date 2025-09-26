import { useState } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CLIENTS_COLLECTION_ID } from '@/lib/appwrite';

export function ClientsTab() {
  const { data: clients, loading, create, remove } = useAppwriteCollection<Client>(CLIENTS_COLLECTION_ID);
  const { toast } = useToast();
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState<Omit<Client, '$id'>>({
    nombre: '',
    edad: 0,
    facturacion: 0,
    intereses: [],
    telefono: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create(newClient);
      setNewClient({ nombre: '', edad: 0, facturacion: 0, intereses: [], telefono: '' });
      setIsAddingClient(false);
      toast({ title: 'Cliente agregado exitosamente' });
    } catch (error) {
      toast({ title: 'Error al agregar cliente', variant: 'destructive' });
    }
  };

  const handleImport = () => {
    toast({ title: 'Importación simulada exitosa', description: 'Se importaron 50 clientes' });
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast({ title: 'Cliente eliminado' });
    } catch (error) {
      toast({ title: 'Error al eliminar cliente', variant: 'destructive' });
    }
  };

  const handleInteresesChange = (value: string) => {
    const intereses = value.split(',').map(i => i.trim()).filter(i => i);
    setNewClient({ ...newClient, intereses });
  };

  if (loading) return <div className="p-6">Cargando clientes...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Clientes</h2>
        <div className="flex gap-2">
          <Button onClick={handleImport} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importar Clientes
          </Button>
          <Button onClick={() => setIsAddingClient(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {isAddingClient && (
        <Card>
          <CardHeader>
            <CardTitle>Agregar Nuevo Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={newClient.nombre}
                  onChange={(e) => setNewClient({ ...newClient, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edad">Edad</Label>
                <Input
                  id="edad"
                  type="number"
                  value={newClient.edad}
                  onChange={(e) => setNewClient({ ...newClient, edad: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="facturacion">Facturación</Label>
                <Input
                  id="facturacion"
                  type="number"
                  value={newClient.facturacion}
                  onChange={(e) => setNewClient({ ...newClient, facturacion: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono WhatsApp</Label>
                <Input
                  id="telefono"
                  value={newClient.telefono}
                  onChange={(e) => setNewClient({ ...newClient, telefono: e.target.value })}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="intereses">Intereses (separados por coma)</Label>
                <Input
                  id="intereses"
                  value={newClient.intereses.join(', ')}
                  onChange={(e) => handleInteresesChange(e.target.value)}
                  placeholder="tecnología, deportes, música"
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">Guardar Cliente</Button>
                <Button type="button" variant="outline" onClick={() => setIsAddingClient(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Edad</TableHead>
                <TableHead>Facturación</TableHead>
                <TableHead>Intereses</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.$id}>
                  <TableCell>{client.nombre}</TableCell>
                  <TableCell>{client.edad}</TableCell>
                  <TableCell>${client.facturacion.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.intereses.map((interes, idx) => (
                        <Badge key={idx} variant="secondary">{interes}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{client.telefono}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => client.$id && handleDelete(client.$id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}