import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { WahaConfig, LipooutUserInput } from '@/types';
import type { Configuracion, Empleado, Recurso, Aparato, Proveedor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Upload, Loader2, Save, Settings, Server, Users, Package, Wrench, Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfigurationForm } from '@/components/forms/ConfigurationForm';
import { EmpleadoForm } from '@/components/forms/EmpleadoForm';
import { RecursoForm } from '@/components/forms/RecursoForm';
import { AparatoForm } from '@/components/forms/AparatoForm';
import { ProveedorForm } from '@/components/forms/ProveedorForm';
import { useGetConfiguration, useUpdateConfiguration } from '@/hooks/useConfiguration';
import { useGetEmpleados, useCreateEmpleado, useUpdateEmpleado, useDeleteEmpleado } from '@/hooks/useEmpleados';
import { useGetRecursos, useCreateRecurso, useUpdateRecurso, useDeleteRecurso } from '@/hooks/useRecursos';
import { useGetAparatos, useCreateAparato, useUpdateAparato, useDeleteAparato } from '@/hooks/useAparatos';
import { useGetProveedores, useCreateProveedor, useUpdateProveedor, useDeleteProveedor } from '@/hooks/useProveedores';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  CONFIG_COLLECTION_ID,
  IMPORT_LOGS_COLLECTION_ID,
  storage,
  IMPORT_BUCKET_ID,
  client,
} from '@/lib/appwrite';
import { Functions, Models } from 'appwrite';
import { format } from 'date-fns';

const functions = new Functions(client);

interface ImportLog extends Models.Document {
    timestamp: string;
    filename: string;
    successfulImports: number;
    totalProcessed: number;
    errors?: string[];
    status: 'completed' | 'completed_with_errors' | 'failed';
}

const Configuracion = () => {
  const { toast } = useToast();
  
  // --- Estado y Hooks para Configuración WAHA ---
  const { data: configs, update: updateWahaConfig, loading: loadingWahaConfig, reload: reloadWahaConfig } = useAppwriteCollection<WahaConfig>(CONFIG_COLLECTION_ID);
  const [wahaSettings, setWahaSettings] = useState<Partial<WahaConfig>>({});
  const [sessions, setSessions] = useState<{ name: string; status: string }[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isSavingWaha, setIsSavingWaha] = useState(false);

  // --- Estado y Hooks para Importación CSV ---
  const { data: importLogsData, loading: loadingLogs, reload: reloadLogs } = useAppwriteCollection<ImportLog>(IMPORT_LOGS_COLLECTION_ID);
  const importLogs = importLogsData as ImportLog[];
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Estado y Hooks para Configuración Clínica ---
  const { data: clinicConfig, isLoading: loadingClinicConfig } = useGetConfiguration();
  const updateClinicMutation = useUpdateConfiguration();

  // --- Hooks para Gestión de Entidades ---
  const { data: empleados, isLoading: loadingEmpleados } = useGetEmpleados();
  const deleteEmpleadoMutation = useDeleteEmpleado();
  
  const { data: recursos, isLoading: loadingRecursos } = useGetRecursos();
  const deleteRecursoMutation = useDeleteRecurso();
  
  const { data: aparatos, isLoading: loadingAparatos } = useGetAparatos();
  const deleteAparatoMutation = useDeleteAparato();
  
  const { data: proveedores, isLoading: loadingProveedores } = useGetProveedores();
  const deleteProveedorMutation = useDeleteProveedor();

  // --- Estados para Sheets de Gestión ---
  const [empleadoSheetOpen, setEmpleadoSheetOpen] = useState(false);
  const [empleadoEditing, setEmpleadoEditing] = useState<Empleado | null>(null);
  const createEmpleadoMutation = useCreateEmpleado();
  const updateEmpleadoMutation = useUpdateEmpleado();

  const [recursoSheetOpen, setRecursoSheetOpen] = useState(false);
  const [recursoEditing, setRecursoEditing] = useState<Recurso | null>(null);
  const createRecursoMutation = useCreateRecurso();
  const updateRecursoMutation = useUpdateRecurso();

  const [aparatoSheetOpen, setAparatoSheetOpen] = useState(false);
  const [aparatoEditing, setAparatoEditing] = useState<Aparato | null>(null);
  const createAparatoMutation = useCreateAparato();
  const updateAparatoMutation = useUpdateAparato();

  const [proveedorSheetOpen, setProveedorSheetOpen] = useState(false);
  const [proveedorEditing, setProveedorEditing] = useState<Proveedor | null>(null);
  const createProveedorMutation = useCreateProveedor();
  const updateProveedorMutation = useUpdateProveedor();

  // Cargar configuración WAHA inicial en el estado local
  useEffect(() => {
    if (configs.length > 0) {
      setWahaSettings(configs[0]);
    }
  }, [configs]);

  // Manejar cambios en formulario WAHA
  const handleWahaChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setWahaSettings({ ...wahaSettings, [e.target.name]: e.target.value });
  };

  // Guardar configuración WAHA
  const handleSaveWahaConfig = async () => {
    if (!configs[0]?.$id) return;
    setIsSavingWaha(true);
    try {
      const dataToSave: LipooutUserInput<WahaConfig> = {
          apiUrl: wahaSettings.apiUrl || '',
          apiKey: wahaSettings.apiKey,
          session: wahaSettings.session,
      };
      await updateWahaConfig(configs[0].$id, dataToSave);
      toast({ title: 'Configuración WAHA guardada' });
      reloadWahaConfig();
    } catch (e) {
      toast({ title: 'Error al guardar', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setIsSavingWaha(false);
    }
  };

  // Obtener sesiones WAHA
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const result = await functions.createExecution('getWahaSessionsFunction', '{}', false);
      if (result.status === 'completed') {
        const responseData = JSON.parse(result.responseBody);
        setSessions(responseData);
      } else {
        throw new Error(result.responseBody || 'Error desconocido');
      }
    } catch (error) {
      toast({ title: 'Error al obtener sesiones', description: (error as Error).message, variant: 'destructive' });
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [toast]);

  // Selección de archivo CSV
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  // Subir archivo CSV
  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await storage.createFile(IMPORT_BUCKET_ID, 'unique()', selectedFile);
      toast({ title: 'Archivo subido', description: 'La importación se procesará en segundo plano.' });
      setSelectedFile(null);
      setTimeout(reloadLogs, 5000);
    } catch (error) {
      toast({ title: 'Error al subir archivo', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  // --- Guardar Configuración Clínica ---
  const handleSaveClinicConfig = async (data: LipooutUserInput<Configuracion>) => {
       if (!clinicConfig?.$id) {
           toast({ title: "Error", description: "No se encontró el ID de configuración.", variant: "destructive" });
           return;
       }
        try {
            await updateClinicMutation.mutateAsync({ id: clinicConfig.$id, data });
            toast({ title: "Configuración de la clínica guardada" });
        } catch (err) {
            toast({ title: "Error al guardar", description: (err as Error).message, variant: "destructive" });
        }
  };

  // --- Handlers para Empleados ---
  const handleNuevoEmpleado = () => {
    setEmpleadoEditing(null);
    setEmpleadoSheetOpen(true);
  };

  const handleEditarEmpleado = (empleado: Empleado) => {
    setEmpleadoEditing(empleado);
    setEmpleadoSheetOpen(true);
  };

  const handleSaveEmpleado = async (data: any) => {
    try {
      if (empleadoEditing) {
        await updateEmpleadoMutation.mutateAsync({ id: empleadoEditing.$id, data });
        toast({ title: "Empleado actualizado" });
      } else {
        await createEmpleadoMutation.mutateAsync(data);
        toast({ title: "Empleado creado" });
      }
      setEmpleadoSheetOpen(false);
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  // --- Handlers para Recursos ---
  const handleNuevoRecurso = () => {
    setRecursoEditing(null);
    setRecursoSheetOpen(true);
  };

  const handleEditarRecurso = (recurso: Recurso) => {
    setRecursoEditing(recurso);
    setRecursoSheetOpen(true);
  };

  const handleSaveRecurso = async (data: any) => {
    try {
      if (recursoEditing) {
        await updateRecursoMutation.mutateAsync({ id: recursoEditing.$id, data });
        toast({ title: "Recurso actualizado" });
      } else {
        await createRecursoMutation.mutateAsync(data);
        toast({ title: "Recurso creado" });
      }
      setRecursoSheetOpen(false);
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  // --- Handlers para Aparatos ---
  const handleNuevoAparato = () => {
    setAparatoEditing(null);
    setAparatoSheetOpen(true);
  };

  const handleEditarAparato = (aparato: Aparato) => {
    setAparatoEditing(aparato);
    setAparatoSheetOpen(true);
  };

  const handleSaveAparato = async (data: any) => {
    try {
      if (aparatoEditing) {
        await updateAparatoMutation.mutateAsync({ id: aparatoEditing.$id, data });
        toast({ title: "Aparato actualizado" });
      } else {
        await createAparatoMutation.mutateAsync(data);
        toast({ title: "Aparato creado" });
      }
      setAparatoSheetOpen(false);
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  // --- Handlers para Proveedores ---
  const handleNuevoProveedor = () => {
    setProveedorEditing(null);
    setProveedorSheetOpen(true);
  };

  const handleEditarProveedor = (proveedor: Proveedor) => {
    setProveedorEditing(proveedor);
    setProveedorSheetOpen(true);
  };

  const handleSaveProveedor = async (data: any) => {
    try {
      if (proveedorEditing) {
        await updateProveedorMutation.mutateAsync({ id: proveedorEditing.$id, data });
        toast({ title: "Proveedor actualizado" });
      } else {
        await createProveedorMutation.mutateAsync(data);
        toast({ title: "Proveedor creado" });
      }
      setProveedorSheetOpen(false);
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Ajustes generales del sistema.</p>
       </div>

      <Tabs defaultValue="waha">
        <TabsList className="mb-4 grid w-full grid-cols-7 gap-1">
          <TabsTrigger value="clinica"><Settings className="w-4 h-4 mr-2"/> Clínica</TabsTrigger>
          <TabsTrigger value="waha"><Server className="w-4 h-4 mr-2"/> WAHA</TabsTrigger>
          <TabsTrigger value="import"><Upload className="w-4 h-4 mr-2"/> Import</TabsTrigger>
          <TabsTrigger value="empleados"><Users className="w-4 h-4 mr-2"/> Empleados</TabsTrigger>
          <TabsTrigger value="recursos"><Package className="w-4 h-4 mr-2"/> Recursos</TabsTrigger>
          <TabsTrigger value="aparatos"><Wrench className="w-4 h-4 mr-2"/> Aparatos</TabsTrigger>
          <TabsTrigger value="proveedores"><Building2 className="w-4 h-4 mr-2"/> Proveedores</TabsTrigger>
        </TabsList>

        {/* --- Contenido Pestaña Clínica --- */}
        <TabsContent value="clinica">
            <Card>
                <CardHeader>
                    <CardTitle>Datos de la Clínica</CardTitle>
                    <CardDescription>Información general y configuración de facturación.</CardDescription>
                </CardHeader>
                <CardContent>
                   <ConfigurationForm
                        configInicial={clinicConfig}
                        isLoading={loadingClinicConfig}
                        isSubmitting={updateClinicMutation.isPending}
                        onSubmit={handleSaveClinicConfig}
                   />
                </CardContent>
            </Card>
        </TabsContent>

        {/* --- Contenido Pestaña WAHA --- */}
        <TabsContent value="waha">
           <Card>
                <CardHeader>
                    <CardTitle>Configuración WAHA</CardTitle>
                    <CardDescription>Define la conexión con tu instancia de WhatsApp HTTP API.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loadingWahaConfig ? <LoadingSpinner /> : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="apiUrl">URL de la API</Label>
                                    <Input id="apiUrl" name="apiUrl" value={wahaSettings.apiUrl || ''} onChange={handleWahaChange} />
                                </div>
                                <div>
                                    <Label htmlFor="apiKey">API Key (Opcional)</Label>
                                    <Input id="apiKey" name="apiKey" type="password" value={wahaSettings.apiKey || ''} onChange={handleWahaChange} />
                                </div>
                                <div>
                                    <Label htmlFor="session">Nombre de Sesión</Label>
                                    <Input id="session" name="session" value={wahaSettings.session || ''} onChange={handleWahaChange} />
                                </div>
                            </div>
                             <Button onClick={handleSaveWahaConfig} disabled={isSavingWaha}>
                                {isSavingWaha ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} Guardar
                             </Button>

                            <Separator className="my-6"/>

                             <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium">Estado de Sesiones WAHA</h3>
                                <Button variant="outline" onClick={fetchSessions} disabled={loadingSessions}>
                                    {loadingSessions ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Refrescar
                                </Button>
                             </div>
                             {loadingSessions ? <LoadingSpinner /> : (
                                sessions.length > 0 ? (
                                    <ul className="list-disc pl-5 space-y-1">
                                        {sessions.map(s => (
                                            <li key={s.name}>
                                                <span className="font-medium">{s.name}:</span>{' '}
                                                <Badge variant={s.status === 'STARTED' ? 'default' : 'outline'}>{s.status}</Badge>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-muted-foreground">No se encontraron sesiones o error al cargar.</p>
                                )
                             )}
                        </>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        {/* --- Contenido Pestaña Importación --- */}
        <TabsContent value="import">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Subir Archivo CSV</CardTitle>
                <CardDescription>Selecciona el archivo CSV para importar clientes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input type="file" accept=".csv" onChange={handleFileChange} />
                {selectedFile && <p className="text-sm text-muted-foreground">Archivo seleccionado: {selectedFile.name}</p>}
                <Button onClick={handleFileUpload} disabled={!selectedFile || isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {isUploading ? 'Subiendo...' : 'Iniciar Importación'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Asegúrate de que el CSV tenga las columnas: `codcli`, `nomcli`, `ape1cli`, `email`, `dnicli`, `dircli`, `codposcli`, `pobcli`, `procli`, `tel1cli`, `tel2cli`, `fecnac` (YYYY-MM-DD), `enviar` (1 o 0), `sexo` (H/M/Otro), `fecalta` (YYYY-MM-DD).
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>Historial de Importaciones</CardTitle>
                  <CardDescription>Últimas importaciones realizadas.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={reloadLogs} disabled={loadingLogs}>
                  {loadingLogs ? <Loader2 className="h-4 w-4 animate-spin"/> : "Refrescar"}
                </Button>
              </CardHeader>
              <CardContent>
                {loadingLogs ? <LoadingSpinner /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Archivo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importLogs && importLogs.length > 0 ? importLogs.map(log => (
                        <TableRow key={log.$id}>
                          <TableCell>{format(new Date(log.timestamp), 'dd/MM/yy HH:mm')}</TableCell>
                          <TableCell className="truncate max-w-[150px]">{log.filename}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === 'completed' ? 'default' : log.status === 'completed_with_errors' ? 'secondary' : 'destructive'}>
                              {log.status === 'completed' ? 'Completado' : log.status === 'completed_with_errors' ? 'Con Errores' : 'Fallido'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.successfulImports}/{log.totalProcessed}
                            {log.errors && log.errors.length > 0 && <span className="text-destructive"> ({log.errors.length} err.)</span>}
                          </TableCell>
                        </TableRow>
                      )) : (
                          <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">No hay logs de importación.</TableCell>
                          </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- Contenido Pestaña Empleados --- */}
        <TabsContent value="empleados">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestión de Empleados</CardTitle>
                <CardDescription>Administra los empleados de la clínica.</CardDescription>
              </div>
              <Button onClick={handleNuevoEmpleado}><Plus className="w-4 h-4 mr-2"/> Nuevo Empleado</Button>
            </CardHeader>
            <CardContent>
              {loadingEmpleados ? <LoadingSpinner /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empleados && empleados.length > 0 ? empleados.map(emp => (
                      <TableRow key={emp.$id}>
                        <TableCell className="font-medium">{emp.nombre} {emp.apellidos}</TableCell>
                        <TableCell>{emp.email}</TableCell>
                        <TableCell>{emp.telefono}</TableCell>
                        <TableCell>
                          <Badge variant={emp.activo ? 'default' : 'secondary'}>
                            {emp.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditarEmpleado(emp)}><Pencil className="w-4 h-4"/></Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            if (confirm('¿Eliminar empleado?')) {
                              deleteEmpleadoMutation.mutate(emp.$id);
                            }
                          }}><Trash2 className="w-4 h-4"/></Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">No hay empleados registrados.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Contenido Pestaña Recursos --- */}
        <TabsContent value="recursos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestión de Recursos</CardTitle>
                <CardDescription>Administra salas, camillas y equipamiento.</CardDescription>
              </div>
              <Button onClick={handleNuevoRecurso}><Plus className="w-4 h-4 mr-2"/> Nuevo Recurso</Button>
            </CardHeader>
            <CardContent>
              {loadingRecursos ? <LoadingSpinner /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recursos && recursos.length > 0 ? recursos.map(rec => (
                      <TableRow key={rec.$id}>
                        <TableCell className="font-medium">{rec.nombre}</TableCell>
                        <TableCell><Badge variant="outline">{rec.tipo}</Badge></TableCell>
                        <TableCell className="max-w-[200px] truncate">{rec.descripcion || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={rec.activo ? 'default' : 'secondary'}>
                            {rec.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditarRecurso(rec)}><Pencil className="w-4 h-4"/></Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            if (confirm('¿Eliminar recurso?')) {
                              deleteRecursoMutation.mutate(rec.$id);
                            }
                          }}><Trash2 className="w-4 h-4"/></Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">No hay recursos registrados.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Contenido Pestaña Aparatos --- */}
        <TabsContent value="aparatos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestión de Aparatos</CardTitle>
                <CardDescription>Administra los equipos médicos de la clínica.</CardDescription>
              </div>
              <Button onClick={handleNuevoAparato}><Plus className="w-4 h-4 mr-2"/> Nuevo Aparato</Button>
            </CardHeader>
            <CardContent>
              {loadingAparatos ? <LoadingSpinner /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Nº Serie</TableHead>
                      <TableHead>Próximo Mantenimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aparatos && aparatos.length > 0 ? aparatos.map(ap => (
                      <TableRow key={ap.$id}>
                        <TableCell className="font-medium">{ap.nombre}</TableCell>
                        <TableCell>{ap.marca ? `${ap.marca} ${ap.modelo || ''}` : '-'}</TableCell>
                        <TableCell>{ap.numero_serie || '-'}</TableCell>
                        <TableCell>{ap.fecha_proximo_mantenimiento ? format(new Date(ap.fecha_proximo_mantenimiento), 'dd/MM/yyyy') : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={ap.activo ? 'default' : 'secondary'}>
                            {ap.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditarAparato(ap)}><Pencil className="w-4 h-4"/></Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            if (confirm('¿Eliminar aparato?')) {
                              deleteAparatoMutation.mutate(ap.$id);
                            }
                          }}><Trash2 className="w-4 h-4"/></Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">No hay aparatos registrados.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Contenido Pestaña Proveedores --- */}
        <TabsContent value="proveedores">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestión de Proveedores</CardTitle>
                <CardDescription>Administra los proveedores de la clínica.</CardDescription>
              </div>
              <Button onClick={handleNuevoProveedor}><Plus className="w-4 h-4 mr-2"/> Nuevo Proveedor</Button>
            </CardHeader>
            <CardContent>
              {loadingProveedores ? <LoadingSpinner /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>CIF</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proveedores && proveedores.length > 0 ? proveedores.map(prov => (
                      <TableRow key={prov.$id}>
                        <TableCell className="font-medium">{prov.nombre}</TableCell>
                        <TableCell>{prov.cif || '-'}</TableCell>
                        <TableCell>{prov.telefono || '-'}</TableCell>
                        <TableCell>{prov.email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={prov.activo ? 'default' : 'secondary'}>
                            {prov.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditarProveedor(prov)}><Pencil className="w-4 h-4"/></Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            if (confirm('¿Eliminar proveedor?')) {
                              deleteProveedorMutation.mutate(prov.$id);
                            }
                          }}><Trash2 className="w-4 h-4"/></Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">No hay proveedores registrados.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- Sheets para Gestión de Entidades --- */}
      <Sheet open={empleadoSheetOpen} onOpenChange={setEmpleadoSheetOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{empleadoEditing ? 'Editar Empleado' : 'Nuevo Empleado'}</SheetTitle>
          </SheetHeader>
          <EmpleadoForm
            empleadoInicial={empleadoEditing || undefined}
            onSubmit={handleSaveEmpleado}
            isSubmitting={createEmpleadoMutation.isPending || updateEmpleadoMutation.isPending}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={recursoSheetOpen} onOpenChange={setRecursoSheetOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{recursoEditing ? 'Editar Recurso' : 'Nuevo Recurso'}</SheetTitle>
          </SheetHeader>
          <RecursoForm
            recursoInicial={recursoEditing || undefined}
            onSubmit={handleSaveRecurso}
            isSubmitting={createRecursoMutation.isPending || updateRecursoMutation.isPending}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={aparatoSheetOpen} onOpenChange={setAparatoSheetOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{aparatoEditing ? 'Editar Aparato' : 'Nuevo Aparato'}</SheetTitle>
          </SheetHeader>
          <AparatoForm
            aparatoInicial={aparatoEditing || undefined}
            onSubmit={handleSaveAparato}
            isSubmitting={createAparatoMutation.isPending || updateAparatoMutation.isPending}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={proveedorSheetOpen} onOpenChange={setProveedorSheetOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{proveedorEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</SheetTitle>
          </SheetHeader>
          <ProveedorForm
            proveedorInicial={proveedorEditing || undefined}
            onSubmit={handleSaveProveedor}
            isSubmitting={createProveedorMutation.isPending || updateProveedorMutation.isPending}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Configuracion;
