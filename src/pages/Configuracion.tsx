import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { WahaConfig, LipooutUserInput } from '@/types';
import type { Configuracion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, Save, Settings, Server } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfigurationForm } from '@/components/forms/ConfigurationForm';
import { useGetConfiguration, useUpdateConfiguration } from '@/hooks/useConfiguration';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  CONFIG_COLLECTION_ID,
  IMPORT_LOGS_COLLECTION_ID,
  DATABASE_ID_WAHA,
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
  const { data: configs, update: updateWahaConfig, loading: loadingWahaConfig, reload: reloadWahaConfig } = useAppwriteCollection<WahaConfig>(CONFIG_COLLECTION_ID, DATABASE_ID_WAHA);
  const [wahaSettings, setWahaSettings] = useState<Partial<WahaConfig>>({});
  const [sessions, setSessions] = useState<{ name: string; status: string }[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isSavingWaha, setIsSavingWaha] = useState(false);

  // --- Estado y Hooks para Importación CSV ---
  const { data: importLogsData, loading: loadingLogs, reload: reloadLogs } = useAppwriteCollection<ImportLog>(IMPORT_LOGS_COLLECTION_ID, DATABASE_ID_WAHA);
  const importLogs = importLogsData as ImportLog[];
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Estado y Hooks para Configuración Clínica ---
  const { data: clinicConfig, isLoading: loadingClinicConfig } = useGetConfiguration();
  const updateClinicMutation = useUpdateConfiguration();

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

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Ajustes generales del sistema.</p>
       </div>

      <Tabs defaultValue="waha">
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="clinica"> <Settings className="w-4 h-4 mr-2"/> Clínica</TabsTrigger>
          <TabsTrigger value="waha"> <Server className="w-4 h-4 mr-2"/> WhatsApp (WAHA)</TabsTrigger>
          <TabsTrigger value="import"> <Upload className="w-4 h-4 mr-2"/> Importar Clientes (CSV)</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default Configuracion;
