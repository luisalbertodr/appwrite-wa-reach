import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { WahaConfig, LipooutUserInput, Configuracion, Template } from '@/types'; // <-- Importar Template
import type { ImportLog } from '@/types'; // Import tipo-only
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Upload, Loader2, Save, Settings, Server, MessageSquare, Plus, Trash } from 'lucide-react'; // <-- Iconos añadidos
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfigurationForm } from '@/components/forms/ConfigurationForm';
import { useGetConfiguration, useUpdateConfiguration } from '@/hooks/useConfiguration';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  WAHA_CONFIG_COLLECTION_ID,
  IMPORT_LOGS_COLLECTION_ID,
  TEMPLATES_COLLECTION_ID, // <-- Importar ID de plantillas
  databases,
  DATABASE_ID,
  storage,
  IMPORT_BUCKET_ID,
  client,
} from '@/lib/appwrite';
import { Functions, Models, ID } from 'appwrite'; // <-- Añadir Models e ID
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea'; // <-- Importar Textarea
import { templateSchema } from '@/lib/validators'; // <-- Importar validador

const functions = new Functions(client);

const Configuracion = () => {
  const { toast } = useToast();
  // --- Estado y Hooks para Configuración WAHA ---
  const { data: configs, update: updateWahaConfig, loading: loadingWahaConfig, reload: reloadWahaConfig } = useAppwriteCollection<WahaConfig>(WAHA_CONFIG_COLLECTION_ID);
  const [wahaSettings, setWahaSettings] = useState<Partial<WahaConfig>>({});
  const [sessions, setSessions] = useState<{ name: string; status: string }[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isSavingWaha, setIsSavingWaha] = useState(false);

  // --- Estado y Hooks para Importación CSV ---
  const { data: importLogsData, loading: loadingLogs, reload: reloadLogs } = useAppwriteCollection<ImportLog>(IMPORT_LOGS_COLLECTION_ID, undefined, false); // Manual
  const importLogs = importLogsData as ImportLog[];
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Estado y Hooks para Configuración Clínica ---
  const { data: clinicConfig, isLoading: loadingClinicConfig } = useGetConfiguration();
  const updateClinicMutation = useUpdateConfiguration();

  // --- Estado y Hooks para Plantillas de Marketing (NUEVO) ---
  const { data: templates, create: createTemplate, update: updateTemplate, remove: deleteTemplate, loading: loadingTemplates, reload: reloadTemplates } = useAppwriteCollection<Template>(TEMPLATES_COLLECTION_ID);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Cargar configuración WAHA inicial
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
    if (!configs[0]?.$id) {
        toast({ title: 'Error', description: 'No se encontró el documento de configuración WAHA para actualizar.', variant: 'destructive' });
        return;
    }
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
      // El JSON parseado es directamente el array de sesiones
      setSessions(JSON.parse(result.responseBody));
    } catch (error) {
      const errorBody = (error as any).response?.body;
      let description = (error as Error).message;
      if (errorBody) {
          try {
              const parsedBody = JSON.parse(errorBody);
              description = parsedBody.error || errorBody;
          } catch (e) {
              description = errorBody;
          }
      }
      toast({ title: 'Error al obtener sesiones', description, variant: 'destructive' });
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

  // --- Lógica de Plantillas (NUEVO) ---
  const handleTemplateChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!editingTemplate) return;
      const { name, value } = e.target;
      if (name === 'variables') {
          setEditingTemplate({ ...editingTemplate, variables: value.split(',').map(v => v.trim()).filter(Boolean) });
      } else {
          setEditingTemplate({ ...editingTemplate, [name]: value });
      }
  };

  const handleSaveTemplate = async () => {
      if (!editingTemplate) return;

      const validation = templateSchema.safeParse(editingTemplate);
      if (!validation.success) {
          toast({ title: "Error de validación", description: validation.error.errors[0].message, variant: 'destructive' });
          return;
      }
      
      setIsSavingTemplate(true);
      try {
          const dataToSave: LipooutUserInput<Template> = {
              name: validation.data.name,
              text: validation.data.text,
              variables: validation.data.variables || [],
          };

          if (editingTemplate.$id) {
              await updateTemplate(editingTemplate.$id, dataToSave);
              toast({ title: "Plantilla actualizada" });
          } else {
              await createTemplate(dataToSave);
              toast({ title: "Plantilla creada" });
          }
          setEditingTemplate(null);
          reloadTemplates();
      } catch (e) {
          toast({ title: "Error al guardar plantilla", description: (e as Error).message, variant: 'destructive' });
      } finally {
          setIsSavingTemplate(false);
      }
  };

  const handleNewTemplate = () => {
      setEditingTemplate({ name: '', text: '', variables: [] });
  };

  const handleEditTemplate = (template: Template & Models.Document) => {
      setEditingTemplate(template);
  };
  
  const handleDeleteTemplate = async (id: string) => {
      if (window.confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
          try {
              await deleteTemplate(id);
              toast({ title: "Plantilla eliminada" });
              reloadTemplates();
          } catch (e) {
              toast({ title: "Error al eliminar", description: (e as Error).message, variant: 'destructive' });
          }
      }
  };
  
  // Recargar logs al entrar en la pestaña
  const onTabChange = (value: string) => {
      if (value === 'import' && importLogs.length === 0) {
          reloadLogs();
      }
  }


  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Ajustes generales del sistema.</p>
       </div>

      <Tabs defaultValue="clinica" onValueChange={onTabChange}>
        <TabsList className="mb-4 grid w-full grid-cols-4"> {/* Ajustado para 4 pestañas */}
          <TabsTrigger value="clinica"> <Settings className="w-4 h-4 mr-2"/> Clínica</TabsTrigger>
          <TabsTrigger value="waha"> <Server className="w-4 h-4 mr-2"/> WhatsApp (WAHA)</TabsTrigger>
          <TabsTrigger value="import"> <Upload className="w-4 h-4 mr-2"/> Importar Clientes</TabsTrigger>
          <TabsTrigger value="plantillas"> <MessageSquare className="w-4 h-4 mr-2"/> Plantillas</TabsTrigger>
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
                             <Button onClick={handleSaveWahaConfig} disabled={isSavingWaha || !configs[0]?.$id}>
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
                                <ul className="list-disc pl-5 space-y-1">
                                    {sessions.length > 0 ? sessions.map(s => (
                                        <li key={s.name}>
                                            <span className="font-medium">{s.name}:</span>{' '}
                                            <Badge variant={s.status === 'STARTED' ? 'default' : 'outline'}>{s.status}</Badge>
                                        </li>
                                    )) : <p className="text-muted-foreground">No se encontraron sesiones o error al cargar.</p>}
                                </ul>
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
        
        {/* --- Contenido Pestaña Plantillas (NUEVO) --- */}
        <TabsContent value="plantillas">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                   <div>
                       <CardTitle>Gestor de Plantillas</CardTitle>
                       <CardDescription>Crea y edita las plantillas para las campañas de marketing.</CardDescription>
                   </div>
                   <Button onClick={handleNewTemplate}><Plus className="w-4 h-4 mr-2"/> Nueva Plantilla</Button>
                </CardHeader>
                <CardContent>
                    {loadingTemplates ? <LoadingSpinner /> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Formulario de Edición */}
                            <div>
                                {editingTemplate ? (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>{editingTemplate.$id ? 'Editar Plantilla' : 'Nueva Plantilla'}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <Label htmlFor="name">Nombre</Label>
                                                <Input id="name" name="name" value={editingTemplate.name || ''} onChange={handleTemplateChange} />
                                            </div>
                                            <div>
                                                <Label htmlFor="text">Texto de la Plantilla</Label>
                                                <Textarea id="text" name="text" value={editingTemplate.text || ''} onChange={handleTemplateChange} rows={6} />
                                                <p className="text-xs text-muted-foreground mt-1">Usa `{"{{name}}"}`, `{"{{var1}}"}`, `{"{{var2}}"}`, etc. para variables.</p>
                                            </div>
                                            <div>
                                                <Label htmlFor="variables">Variables (separadas por coma)</Label>
                                                <Input id="variables" name="variables" value={editingTemplate.variables?.join(', ') || ''} onChange={handleTemplateChange} />
                                                <p className="text-xs text-muted-foreground mt-1">Ej: var1, var2, var3</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={handleSaveTemplate} disabled={isSavingTemplate}>
                                                    {isSavingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                                    Guardar
                                                </Button>
                                                <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancelar</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        <p>Selecciona una plantilla para editarla o crea una nueva.</p>
                                    </div>
                                )}
                            </div>
                            {/* Lista de Plantillas */}
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium">Plantillas Guardadas</h3>
                                {templates.map(template => (
                                    <Card key={template.$id} className="flex items-center justify-between p-4">
                                        <div>
                                            <p className="font-semibold">{template.name}</p>
                                            <p className="text-sm text-muted-foreground truncate max-w-xs">{template.text}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)}>Editar</Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteTemplate(template.$id)}>
                                                <Trash className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                                {templates.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No hay plantillas creadas.</p>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default Configuracion;