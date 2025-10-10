import { useState, useEffect } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { WahaConfig, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, Shield, Bot, Plus, Edit, Trash2, XCircle, Search, RotateCcw, HardDriveUpload, Download, Users, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CONFIG_COLLECTION_ID, CLIENTS_COLLECTION_ID, DATABASE_ID, databases, storage, IMPORT_BUCKET_ID, IMPORT_LOGS_COLLECTION_ID } from '@/lib/appwrite';
import { ID, Query, Models } from 'appwrite';
import Papa from 'papaparse';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { validateClient, calculateAge } from '@/lib/validators';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ImportLog extends Models.Document {
  timestamp: string;
  filename: string;
  successfulImports: number;
  totalProcessed: number;
  errors: string[];
  status: 'completed' | 'completed_with_errors' | 'failed';
}

const defaultConfig: Omit<WahaConfig, '$id' | 'apiKey'> = {
  apiUrl: import.meta.env.VITE_WAHA_API_URL || 'http://192.168.30.50:3000/api',
  minDelayMs: 2000, maxDelayMs: 5000, batchSizeMin: 15, batchSizeMax: 25,
  batchDelayMsMin: 60000, batchDelayMsMax: 120000, adminPhoneNumbers: [], notificationInterval: 50,
};

const FILTERS_STORAGE_KEY = 'client-filters';

const Configuracion = () => {
  const { data: configs, loading: loadingConfig, create: createConfig, update: updateConfig, reload: reloadConfig } = useAppwriteCollection<WahaConfig>(CONFIG_COLLECTION_ID);
  const { toast } = useToast();
  const [config, setConfig] = useState<Omit<WahaConfig, '$id' | 'apiKey'>>(defaultConfig);

  const { data: clients, total, loading: loadingClients, create: createClient, update: updateClient, remove: removeClient, applyQueries, reload: reloadClients } = useAppwriteCollection<Client>(CLIENTS_COLLECTION_ID, FILTERS_STORAGE_KEY, true);

  const { data: importLogs, loading: loadingImportLogs, reload: reloadImportLogs } = useAppwriteCollection<ImportLog>(IMPORT_LOGS_COLLECTION_ID);

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [editingClient, setEditingClient] = useState<(Client & Models.Document) | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const [newClient, setNewClient] = useState<Omit<Client, '$id' | 'edad' | 'importErrors' | 'nombre_completo'>>({
    codcli: '', nomcli: '', ape1cli: '', email: '', dnicli: '', dircli: '',
    codposcli: '', pobcli: '', procli: '', tel1cli: '', tel2cli: '', fecnac: '',
    enviar: 1, sexo: 'Otro', fecalta: new Date().toISOString().split('T')[0],
    facturacion: 0, intereses: [],
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showImportErrorsDialog, setShowImportErrorsDialog] = useState(false);
  const [importErrorLogs, setImportErrorLogs] = useState<string[]>([]);
  const [isLocalImporting, setIsLocalImporting] = useState(false);

  const [filters, setFilters] = useState({
      codcli: '', codcliMin: '', codcliMax: '', nomcli: '', ape1cli: '', email: '', dnicli: '',
      telefono: '', fecaltaMin: '', fecaltaMax: '', dircli: '', codposcli: '', pobcli: '', procli: '',
      sexo: 'all', edadMin: '', edadMax: '', facturacionMin: '', facturacionMax: '', intereses: ''
  });
  const [isFiltered, setIsFiltered] = useState(false);

  useEffect(() => {
    if (configs.length > 0) {
      const fetchedConfig = configs[0];
      setConfig({
        apiUrl: fetchedConfig.apiUrl || defaultConfig.apiUrl,
        minDelayMs: fetchedConfig.minDelayMs ?? defaultConfig.minDelayMs,
        maxDelayMs: fetchedConfig.maxDelayMs ?? defaultConfig.maxDelayMs,
        batchSizeMin: fetchedConfig.batchSizeMin ?? defaultConfig.batchSizeMin,
        batchSizeMax: fetchedConfig.batchSizeMax ?? defaultConfig.batchSizeMax,
        batchDelayMsMin: fetchedConfig.batchDelayMsMin ?? defaultConfig.batchDelayMsMin,
        batchDelayMsMax: fetchedConfig.batchDelayMsMax ?? defaultConfig.batchDelayMsMax,
        adminPhoneNumbers: fetchedConfig.adminPhoneNumbers || defaultConfig.adminPhoneNumbers,
        notificationInterval: fetchedConfig.notificationInterval ?? defaultConfig.notificationInterval,
      });
    }
  }, [configs]);

  useEffect(() => {
    const savedFiltersJSON = localStorage.getItem(FILTERS_STORAGE_KEY + '_values');
    if (savedFiltersJSON) {
        const savedFilters = JSON.parse(savedFiltersJSON);
        setFilters(savedFilters);
        setIsFiltered(true);
    }
  }, []);

  const handleSaveConfig = async () => {
    try {
      const configToSave = { ...config };
      if (configs.length > 0 && configs[0].$id) {
        await updateConfig(configs[0].$id, configToSave);
      } else {
        await createConfig(configToSave as Omit<WahaConfig, '$id'>);
      }
      reloadConfig();
      toast({ title: 'Configuración del sistema guardada' });
    } catch (error) {
      toast({ title: 'Error al guardar configuración', variant: 'destructive', description: (error as Error).message });
    }
  };

  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateClient(newClient);

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({ title: 'Errores de validación', variant: 'destructive' });
      return;
    }
    setValidationErrors({});
    setClientLoading(true);
    try {
      const clientToSave: Omit<Client, '$id'> = {
        ...newClient,
        nombre_completo: `${newClient.nomcli || ''} ${newClient.ape1cli || ''}`.trim(),
        edad: calculateAge(newClient.fecnac || ''),
        facturacion: newClient.facturacion || 0,
      };
      if (editingClient) {
        await updateClient(editingClient.$id, clientToSave);
        toast({ title: 'Cliente actualizado' });
      } else {
        await createClient(clientToSave, newClient.codcli);
        toast({ title: 'Cliente agregado' });
      }
      setIsAddingClient(false);
      setEditingClient(null);
      reloadClients();
    } catch (error) {
      toast({ title: 'Error al guardar cliente', description: (error as Error).message, variant: 'destructive' });
    } finally {
        setClientLoading(false);
    }
  };

  const handleLocalImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLocalImporting(true);
    setClientLoading(true);
    toast({ title: 'Iniciando importación local...' });

    Papa.parse<Client>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const clientsToImport = results.data;
        const importPromises = clientsToImport.map(async (clientData) => {
          const clientToSave: Partial<Client> = {
            ...clientData,
            nombre_completo: clientData.nombre_completo,
            edad: calculateAge(clientData.fecnac || ''),
            facturacion: Number(clientData.facturacion) || 0,
            enviar: clientData.enviar == 1 ? 1 : 0,
          };

          const errors = validateClient(clientToSave, false);
          if (Object.keys(errors).length > 0) {
            return { status: 'rejected', reason: `Cliente ${clientData.codcli}: ${Object.values(errors).join(', ')}` };
          }

          try {
            const existing = await databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, [
              Query.equal('codcli', clientData.codcli),
            ]);

            if (existing.documents.length > 0) {
              return updateClient(existing.documents[0].$id, clientToSave);
            } else {
              return createClient(clientToSave as Client, clientData.codcli);
            }
          } catch (error: any) {
            return { status: 'rejected', reason: `Error al importar cliente ${clientData.codcli}: ${error.message}` };
          }
        });

        const outcomes = await Promise.allSettled(importPromises);
        const successfulImports = outcomes.filter(o => o.status === 'fulfilled').length;
        const importErrors = outcomes
            .filter((o): o is PromiseRejectedResult => o.status === 'rejected')
            .map(o => o.reason);

        toast({
          title: 'Importación Local Completada',
          description: `${successfulImports} clientes importados, ${importErrors.length} errores.`,
        });

        if (importErrors.length > 0) {
          setImportErrorLogs(importErrors);
          setShowImportErrorsDialog(true);
        }

        setIsLocalImporting(false);
        setClientLoading(false);
        reloadClients();
      },
      error: (error: any) => {
        toast({
          title: 'Error al parsear el archivo CSV',
          description: error.message,
          variant: 'destructive',
        });
        setIsLocalImporting(false);
        setClientLoading(false);
      },
    });

    event.target.value = '';
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;
    try {
      await removeClient(id);
      toast({ title: 'Cliente eliminado' });
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };
  const handleEditClient = (client: Client & Models.Document) => {
    setEditingClient(client);
    setNewClient({
      codcli: client.codcli, nomcli: client.nomcli || '', ape1cli: client.ape1cli || '',
      email: client.email || '', dnicli: client.dnicli || '', dircli: client.dircli || '',
      codposcli: client.codposcli || '', pobcli: client.pobcli || '', procli: client.procli || '',
      tel1cli: client.tel1cli || '', tel2cli: client.tel2cli || '', fecnac: client.fecnac ? new Date(client.fecnac).toISOString().split('T')[0] : '',
      enviar: client.enviar ?? 1, sexo: client.sexo || 'Otro', fecalta: client.fecalta ? new Date(client.fecalta).toISOString().split('T')[0] : '',
      facturacion: client.facturacion || 0, intereses: client.intereses || [],
    });
    setIsAddingClient(true);
  };
  const handleFilter = () => {
    const newQueries: string[] = [];
    if (filters.nomcli) newQueries.push(Query.search('nombre_completo', filters.nomcli));
    if (filters.codcli) newQueries.push(Query.equal('codcli', filters.codcli));
    if (filters.email) newQueries.push(Query.search('email', filters.email));
    if (filters.dnicli) newQueries.push(Query.equal('dnicli', filters.dnicli));
    if (filters.telefono) newQueries.push(Query.search('tel2cli', filters.telefono));
    if (filters.fecaltaMin) newQueries.push(Query.greaterThanEqual('fecalta', filters.fecaltaMin));
    if (filters.fecaltaMax) newQueries.push(Query.lessThanEqual('fecalta', filters.fecaltaMax));
    
    localStorage.setItem(FILTERS_STORAGE_KEY + '_values', JSON.stringify(filters));
    applyQueries(newQueries);
    setIsFiltered(true);
  };
  const handleClearFilters = () => {
    setFilters({
      codcli: '', codcliMin: '', codcliMax: '', nomcli: '', ape1cli: '', email: '', dnicli: '',
      telefono: '', fecaltaMin: '', fecaltaMax: '', dircli: '', codposcli: '', pobcli: '', procli: '',
      sexo: 'all', edadMin: '', edadMax: '', facturacionMin: '', facturacionMax: '', intereses: ''
    });
    localStorage.removeItem(FILTERS_STORAGE_KEY);
    localStorage.removeItem(FILTERS_STORAGE_KEY + '_values');
    applyQueries([]);
    setIsFiltered(false);
  };
  const handleExport = () => {
    if (clients.length === 0) {
      toast({ title: 'No hay clientes para exportar', variant: 'destructive' });
      return;
    }
    const csv = Papa.unparse(clients);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `export_clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'Exportación completada' });
  };

  if (loadingConfig) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="icon" aria-label="Volver a Campañas">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Configuración y Clientes</h1>
              <p className="text-muted-foreground mt-2">
                Ajusta los parámetros y gestiona tu base de datos de clientes.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Configuración General</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="apiUrl">URL de la API de Waha</Label><Input id="apiUrl" value={config.apiUrl || ''} onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}/></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adminPhoneNumbers">Nº de Teléfonos de Admin (separados por comas)</Label>
                  <Textarea
                    id="adminPhoneNumbers"
                    value={config.adminPhoneNumbers?.join(', ') || ''}
                    onChange={(e) => setConfig({ ...config, adminPhoneNumbers: e.target.value.split(',').map(phone => phone.trim()).filter(phone => phone) })}
                    placeholder="34600111222, 34600333444"
                  />
                   <p className="text-xs text-muted-foreground mt-1">Incluye el código de país para cada número. Ej: 34 para España.</p>
                </div>
                <div>
                    <Label>Intervalo de Notificación</Label>
                    <Input type="number" value={config.notificationInterval || ''} onChange={(e) => setConfig({ ...config, notificationInterval: Number(e.target.value) })}/>
                    <p className="text-xs text-muted-foreground mt-1">Notificar cada X mensajes enviados.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" />Políticas de Envío</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Retardo entre Mensajes (ms)</Label><div className="flex gap-2"><Input type="number" value={config.minDelayMs || ''} onChange={(e) => setConfig({ ...config, minDelayMs: Number(e.target.value) })} placeholder="Mín"/> <Input type="number" value={config.maxDelayMs || ''} onChange={(e) => setConfig({ ...config, maxDelayMs: Number(e.target.value) })} placeholder="Máx"/></div></div>
                <div><Label>Tamaño de Lote</Label><div className="flex gap-2"><Input type="number" value={config.batchSizeMin || ''} onChange={(e) => setConfig({ ...config, batchSizeMin: Number(e.target.value) })} placeholder="Mín"/> <Input type="number" value={config.batchSizeMax || ''} onChange={(e) => setConfig({ ...config, batchSizeMax: Number(e.target.value) })} placeholder="Máx"/></div></div>
                <div><Label>Pausa entre Lotes (ms)</Label><div className="flex gap-2"><Input type="number" value={config.batchDelayMsMin || ''} onChange={(e) => setConfig({ ...config, batchDelayMsMin: Number(e.target.value) })} placeholder="Mín"/> <Input type="number" value={config.batchDelayMsMax || ''} onChange={(e) => setConfig({ ...config, batchDelayMsMax: Number(e.target.value) })} placeholder="Máx"/></div></div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSaveConfig} className="w-full"><Save className="w-4 h-4 mr-2" />Guardar Configuración del Sistema</Button>

          <hr className="my-8" />

          <div className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Gestión de Clientes</h2>
          </div>

          {isAddingClient && (
            <Card>
              <CardHeader><CardTitle>{editingClient ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitClient} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label>Código Cliente</Label><Input value={newClient.codcli} onChange={(e) => setNewClient({ ...newClient, codcli: e.target.value })} required disabled={!!editingClient}/>{validationErrors.codcli && <p className="text-red-500 text-xs mt-1">{validationErrors.codcli}</p>}</div>
                  <div><Label>Nombre</Label><Input value={newClient.nomcli} onChange={(e) => setNewClient({ ...newClient, nomcli: e.target.value })} />{validationErrors.nomcli && <p className="text-red-500 text-xs mt-1">{validationErrors.nomcli}</p>}</div>
                  <div><Label>Apellidos</Label><Input value={newClient.ape1cli} onChange={(e) => setNewClient({ ...newClient, ape1cli: e.target.value })} />{validationErrors.ape1cli && <p className="text-red-500 text-xs mt-1">{validationErrors.ape1cli}</p>}</div>
                  <div><Label>Email</Label><Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />{validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}</div>
                  <div><Label>DNI/NIE</Label><Input value={newClient.dnicli} onChange={(e) => setNewClient({ ...newClient, dnicli: e.target.value })} />{validationErrors.dnicli && <p className="text-red-500 text-xs mt-1">{validationErrors.dnicli}</p>}</div>
                  <div><Label>Teléfono Principal</Label><Input value={newClient.tel2cli} onChange={(e) => setNewClient({ ...newClient, tel2cli: e.target.value })} />{validationErrors.tel2cli && <p className="text-red-500 text-xs mt-1">{validationErrors.tel2cli}</p>}</div>
                  <div><Label>Teléfono Secundario</Label><Input value={newClient.tel1cli} onChange={(e) => setNewClient({ ...newClient, tel1cli: e.target.value })} />{validationErrors.tel1cli && <p className="text-red-500 text-xs mt-1">{validationErrors.tel1cli}</p>}</div>
                  <div><Label>Dirección</Label><Input value={newClient.dircli} onChange={(e) => setNewClient({ ...newClient, dircli: e.target.value })} />{validationErrors.dircli && <p className="text-red-500 text-xs mt-1">{validationErrors.dircli}</p>}</div>
                  <div><Label>Código Postal</Label><Input value={newClient.codposcli} onChange={(e) => setNewClient({ ...newClient, codposcli: e.target.value })} />{validationErrors.codposcli && <p className="text-red-500 text-xs mt-1">{validationErrors.codposcli}</p>}</div>
                  <div><Label>Población</Label><Input value={newClient.pobcli} onChange={(e) => setNewClient({ ...newClient, pobcli: e.target.value })} />{validationErrors.pobcli && <p className="text-red-500 text-xs mt-1">{validationErrors.pobcli}</p>}</div>
                  <div><Label>Provincia</Label><Input value={newClient.procli} onChange={(e) => setNewClient({ ...newClient, procli: e.target.value })} />{validationErrors.procli && <p className="text-red-500 text-xs mt-1">{validationErrors.procli}</p>}</div>
                  <div><Label>Fecha de Nacimiento</Label><Input type="date" value={newClient.fecnac} onChange={(e) => setNewClient({ ...newClient, fecnac: e.target.value })} />{validationErrors.fecnac && <p className="text-red-500 text-xs mt-1">{validationErrors.fecnac}</p>}</div>
                  <div><Label>Fecha de Alta</Label><Input type="date" value={newClient.fecalta} onChange={(e) => setNewClient({ ...newClient, fecalta: e.target.value })} />{validationErrors.fecalta && <p className="text-red-500 text-xs mt-1">{validationErrors.fecalta}</p>}</div>
                  <div><Label>Sexo</Label>
                    <Select value={newClient.sexo} onValueChange={(value) => setNewClient({ ...newClient, sexo: value as 'H' | 'M' | 'Otro' })}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="H">Hombre</SelectItem>
                        <SelectItem value="M">Mujer</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    {validationErrors.sexo && <p className="text-red-500 text-xs mt-1">{validationErrors.sexo}</p>}
                  </div>
                   <div><Label>Enviar Publicidad</Label>
                    <Select value={newClient.enviar?.toString()} onValueChange={(value) => setNewClient({ ...newClient, enviar: Number(value) as 0 | 1 })}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Sí</SelectItem>
                        <SelectItem value="0">No</SelectItem>
                      </SelectContent>
                    </Select>
                    {validationErrors.enviar && <p className="text-red-500 text-xs mt-1">{validationErrors.enviar}</p>}
                  </div>
                  <div><Label>Facturación</Label><Input type="number" value={newClient.facturacion} onChange={(e) => setNewClient({ ...newClient, facturacion: Number(e.target.value) })} /></div>
                  <div className="md:col-span-3"><Label>Intereses (separados por comas)</Label><Input value={newClient.intereses?.join(', ')} onChange={(e) => setNewClient({ ...newClient, intereses: e.target.value.split(',').map(i => i.trim()) })} /></div>
                  <div className="md:col-span-3 flex gap-2"><Button type="submit" disabled={clientLoading}>{clientLoading ? 'Guardando...' : 'Guardar'}</Button><Button type="button" variant="outline" onClick={() => {setIsAddingClient(false); setEditingClient(null);}}>Cancelar</Button></div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Base de Datos de Clientes ({total})</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Label htmlFor="csv-upload-local" className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border cursor-pointer"><HardDriveUpload className="w-4 h-4" />Importar (Local)<Input id="csv-upload-local" type="file" accept=".csv" onChange={handleLocalImport} className="sr-only" disabled={isLocalImporting} /></Label>
                <Button onClick={() => setIsAddingClient(true)} disabled={isAddingClient}><Plus className="w-4 h-4 mr-2" />Nuevo Cliente</Button>
              </div>
              <div className="space-y-2 mb-4 border-t pt-4">
                <h3 className="text-md font-medium">Filtrar Clientes</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Input value={filters.nomcli} onChange={(e) => setFilters({...filters, nomcli: e.target.value})} placeholder="Nombre y Apellidos"/>
                  <Input value={filters.codcli} onChange={(e) => setFilters({...filters, codcli: e.target.value})} placeholder="Cód. Cliente"/>
                  <Input value={filters.email} onChange={(e) => setFilters({...filters, email: e.target.value})} placeholder="Email"/>
                  <Input value={filters.dnicli} onChange={(e) => setFilters({...filters, dnicli: e.target.value})} placeholder="DNI"/>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleFilter}><Search className="w-4 h-4 mr-2" />Filtrar</Button>
                  <Button variant="outline" onClick={handleClearFilters}><RotateCcw className="w-4 h-4 mr-2" />Limpiar</Button>
                  <Button variant="outline" onClick={handleExport} disabled={clients.length === 0}><Download className="w-4 h-4 mr-2" />Exportar</Button>
                </div>
              </div>

              {loadingClients && <p>Buscando clientes...</p>}
              {!loadingClients && (
                <Table>
                  <TableHeader><TableRow><TableHead>Cód.</TableHead><TableHead>Nombre</TableHead><TableHead>Teléfono</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.$id}>
                        <TableCell>{client.codcli}</TableCell><TableCell>{client.nomcli}</TableCell><TableCell>{client.tel2cli}</TableCell>
                        <TableCell className="flex gap-2"><Button variant="outline" size="sm" onClick={() => handleEditClient(client)}><Edit className="w-4 h-4" /></Button><Button variant="destructive" size="sm" onClick={() => client.$id && handleDeleteClient(client.$id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Historial de Importaciones</CardTitle></CardHeader>
            <CardContent>
              {loadingImportLogs ? <p>Cargando historial...</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Archivo</TableHead><TableHead>Resultado</TableHead><TableHead>Estado</TableHead><TableHead>Errores</TableHead></TableRow></TableHeader>
                <TableBody>
                  {importLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log) => (
                    <TableRow key={log.$id}>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{log.filename}</TableCell>
                      <TableCell>{log.successfulImports} / {log.totalProcessed}</TableCell>
                      <TableCell><Badge variant={log.status === 'completed' ? 'default' : log.status === 'completed_with_errors' ? 'secondary' : 'destructive'}>{log.status}</Badge></TableCell>
                      <TableCell>{log.errors && log.errors.length > 0 && log.errors[0] !== 'Ninguno' && <Button variant="ghost" size="sm" onClick={() => { setImportErrorLogs(log.errors); setShowImportErrorsDialog(true); }}><XCircle className="w-4 h-4 text-red-500" /> {log.errors.length}</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>

          <AlertDialog open={showImportErrorsDialog} onOpenChange={setShowImportErrorsDialog}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Errores de Importación</AlertDialogTitle><AlertDialogDescription>Se encontraron los siguientes errores durante el proceso.</AlertDialogDescription></AlertDialogHeader>
              <div className="max-h-[400px] overflow-y-auto rounded-md bg-slate-950 p-4"><code className="text-white whitespace-pre-wrap">{importErrorLogs.join('\n\n')}</code></div>
              <AlertDialogFooter><AlertDialogAction>Cerrar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;