import { useState, useEffect } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { WahaConfig, LipooutUserInput } from '@/types'; // Importar tipos necesarios
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, Shield, Bot, HardDriveUpload, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WAHA_CONFIG_COLLECTION_ID, IMPORT_LOGS_COLLECTION_ID, client } from '@/lib/appwrite';
import { Models } from 'appwrite';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoadingSpinner from '@/components/LoadingSpinner'; // Importado

interface ImportLog extends Models.Document {
  timestamp: string;
  filename: string;
  successfulImports: number;
  totalProcessed: number;
  errors: string[];
  status: 'completed' | 'completed_with_errors' | 'failed';
}

// Usamos LipooutUserInput para el estado y el default config
type WahaConfigInput = LipooutUserInput<WahaConfig>;

const defaultConfig: WahaConfigInput = {
  apiUrl: import.meta.env.VITE_WAHA_API_URL || 'http://192.168.30.50:3000/api',
  session: 'default',
  minDelayMs: 2000, maxDelayMs: 5000, batchSizeMin: 15, batchSizeMax: 25,
  batchDelayMsMin: 60000, batchDelayMsMax: 120000, adminPhoneNumbers: [], notificationInterval: 50,
  startTime: '09:00',
  endTime: '18:00',
  // Quitamos apiKey si no lo usamos directamente en el form/estado
};

const Configuracion = () => {
  // Aseguramos que el hook use el tipo correcto (WahaConfig incluye LipooutDocument)
  const { data: configs, loading: loadingConfig, create: createConfig, update: updateConfig, reload: reloadConfig } = useAppwriteCollection<WahaConfig>(WAHA_CONFIG_COLLECTION_ID);
  const { toast } = useToast();
  // El estado usa el tipo Input sin metadata
  const [config, setConfig] = useState<WahaConfigInput>(defaultConfig);
  const { data: importLogs, loading: loadingImportLogs } = useAppwriteCollection<ImportLog>(IMPORT_LOGS_COLLECTION_ID);

  const [wahaSessions] = useState<string[]>([]);
  const [showImportLogDialog, setShowImportLogDialog] = useState(false);
  const [importLogContent, setImportLogContent] = useState<string[]>([]);
  const [isLocalImporting] = useState(false);

  useEffect(() => {
    const fetchWahaSessions = async () => { /* ... lógica sin cambios ... */ };
    fetchWahaSessions();
  }, [toast]);

  useEffect(() => {
    if (configs.length > 0) {
      const fetchedConfig = configs[0];
      // Mapeamos los campos del documento al tipo Input para el estado
      setConfig({
        apiUrl: fetchedConfig.apiUrl || defaultConfig.apiUrl,
        session: fetchedConfig.session || defaultConfig.session,
        minDelayMs: fetchedConfig.minDelayMs ?? defaultConfig.minDelayMs,
        maxDelayMs: fetchedConfig.maxDelayMs ?? defaultConfig.maxDelayMs,
        batchSizeMin: fetchedConfig.batchSizeMin ?? defaultConfig.batchSizeMin,
        batchSizeMax: fetchedConfig.batchSizeMax ?? defaultConfig.batchSizeMax,
        batchDelayMsMin: fetchedConfig.batchDelayMsMin ?? defaultConfig.batchDelayMsMin,
        batchDelayMsMax: fetchedConfig.batchDelayMsMax ?? defaultConfig.batchDelayMsMax,
        adminPhoneNumbers: fetchedConfig.adminPhoneNumbers || defaultConfig.adminPhoneNumbers,
        notificationInterval: fetchedConfig.notificationInterval ?? defaultConfig.notificationInterval,
        startTime: fetchedConfig.startTime || defaultConfig.startTime,
        endTime: fetchedConfig.endTime || defaultConfig.endTime,
      });
    }
  }, [configs]);

  const handleSaveConfig = async () => {
    try {
      // El estado 'config' ya es del tipo correcto (WahaConfigInput)
      const configToSave = { ...config };
      if (configs.length > 0 && configs[0].$id) {
        await updateConfig(configs[0].$id, configToSave);
      } else {
        // createConfig espera el tipo Input
        await createConfig(configToSave);
      }
      reloadConfig();
      toast({ title: 'Configuración del sistema guardada' });
    } catch (error) {
      toast({ title: 'Error al guardar configuración', variant: 'destructive', description: (error as Error).message });
    }
  };

  const handleLocalImport = async (event: React.ChangeEvent<HTMLInputElement>) => { /* ... lógica sin cambios ... */ };
  const handleDownloadLog = (log: ImportLog) => { /* ... lógica sin cambios ... */ };

  if (loadingConfig) {
    return <LoadingSpinner className="mt-16" />; // Usamos el componente importado
  }

  // --- Renderizado JSX (sin cambios estructurales, solo verificamos que use LoadingSpinner) ---
  return (
     <div className="space-y-6">
       <div>
         <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
         <p className="text-muted-foreground mt-2">
           Ajusta los parámetros de Waha y gestiona la importación de datos.
         </p>
       </div>
       {/* ... resto del JSX sin cambios ... */}
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Configuración General (WAHA)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* ... Inputs ... */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="apiUrl">URL de la API de Waha</Label>
                      <Input id="apiUrl" value={config.apiUrl || ''} onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}/>
                  </div>
                  <div>
                      <Label htmlFor="waha-session">Sesión de Waha</Label>
                      <Select value={config.session} onValueChange={(value) => setConfig({ ...config, session: value })}>
                          <SelectTrigger id="waha-session">
                              <SelectValue placeholder="Selecciona una sesión" />
                          </SelectTrigger>
                          <SelectContent>
                              {wahaSessions.map(session => (
                                  <SelectItem key={session} value={session}>{session}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
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
                    <Input type="number" value={config.notificationInterval ?? ''} onChange={(e) => setConfig({ ...config, notificationInterval: Number(e.target.value) || undefined })}/> {/* Usar undefined si está vacío */}
                    <p className="text-xs text-muted-foreground mt-1">Notificar cada X mensajes enviados.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" />Políticas de Envío (WAHA)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Horas hábiles (desde)</Label><Input type="time" value={config.startTime || ''} onChange={(e) => setConfig({ ...config, startTime: e.target.value })}/></div>
                    <div><Label>Horas hábiles (hasta)</Label><Input type="time" value={config.endTime || ''} onChange={(e) => setConfig({ ...config, endTime: e.target.value })}/></div>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Retardo entre Mensajes (ms)</Label><div className="flex gap-2"><Input type="number" value={config.minDelayMs ?? ''} onChange={(e) => setConfig({ ...config, minDelayMs: Number(e.target.value) || undefined })} placeholder="Mín"/> <Input type="number" value={config.maxDelayMs ?? ''} onChange={(e) => setConfig({ ...config, maxDelayMs: Number(e.target.value) || undefined })} placeholder="Máx"/></div></div>
                <div><Label>Tamaño de Lote</Label><div className="flex gap-2"><Input type="number" value={config.batchSizeMin ?? ''} onChange={(e) => setConfig({ ...config, batchSizeMin: Number(e.target.value) || undefined })} placeholder="Mín"/> <Input type="number" value={config.batchSizeMax ?? ''} onChange={(e) => setConfig({ ...config, batchSizeMax: Number(e.target.value) || undefined })} placeholder="Máx"/></div></div>
                <div><Label>Pausa entre Lotes (ms)</Label><div className="flex gap-2"><Input type="number" value={config.batchDelayMsMin ?? ''} onChange={(e) => setConfig({ ...config, batchDelayMsMin: Number(e.target.value) || undefined })} placeholder="Mín"/> <Input type="number" value={config.batchDelayMsMax ?? ''} onChange={(e) => setConfig({ ...config, batchDelayMsMax: Number(e.target.value) || undefined })} placeholder="Máx"/></div></div>
              </div>
            </CardContent>
          </Card>
          {/* ... Botón Guardar ... */}
          <Button onClick={handleSaveConfig} className="w-full"><Save className="w-4 h-4 mr-2" />Guardar Configuración del Sistema</Button>
          {/* ... Historial Importaciones ... */}
          <hr className="my-8" />
           <Card>
             <CardHeader><CardTitle>Historial de Importaciones (CSV)</CardTitle></CardHeader>
             <CardContent>
                {/* ... Botón Importar y tabla ... */}
                 <div className="flex flex-wrap gap-2 mb-4">
                    <Label htmlFor="csv-upload-local" className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90">
                    <HardDriveUpload className="w-4 h-4" />
                    Importar Clientes CSV
                    <Input id="csv-upload-local" type="file" accept=".csv" onChange={handleLocalImport} className="sr-only" disabled={isLocalImporting} />
                    </Label>
                </div>
                 <p className="text-sm text-muted-foreground mb-4">
                    Sube un archivo CSV para importar clientes en lote. Los clientes se añadirán a la colección principal `clientes`.
                 </p>
                 {loadingImportLogs ? <p>Cargando historial...</p> : (
                 <Table>
                    <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Archivo</TableHead><TableHead>Resultado</TableHead><TableHead>Estado</TableHead><TableHead>Log</TableHead></TableRow></TableHeader>
                    <TableBody>
                    {importLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log) => (
                        <TableRow key={log.$id}>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{log.filename}</TableCell>
                        <TableCell>{log.successfulImports} / {log.totalProcessed}</TableCell>
                        <TableCell>
                            <button onClick={() => { setImportLogContent(log.errors); setShowImportLogDialog(true); }}>
                            <Badge variant={log.status === 'completed' ? 'default' : log.status === 'completed_with_errors' ? 'secondary' : 'destructive'}>{log.status}</Badge>
                            </button>
                        </TableCell>
                        <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleDownloadLog(log)}>
                                <Download className="w-4 h-4" />
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                 </Table>
                 )}
             </CardContent>
            </Card>
           {/* ... AlertDialog ... */}
            <AlertDialog open={showImportLogDialog} onOpenChange={setShowImportLogDialog}>
                <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Log de Importación</AlertDialogTitle>
                    <AlertDialogDescription>
                    Este es el registro de la importación de clientes.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="max-h-[60vh] overflow-y-auto rounded-md bg-slate-950 p-4"><code className="text-white whitespace-pre-wrap">{importLogContent.join('\n')}</code></div>
                <AlertDialogFooter><AlertDialogAction>Cerrar</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

     </div>
  );
};

export default Configuracion;
