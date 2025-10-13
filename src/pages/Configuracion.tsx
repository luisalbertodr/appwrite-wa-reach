import { useState, useEffect } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { WahaConfig, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, Shield, Bot, Plus, HardDriveUpload, Download, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CONFIG_COLLECTION_ID, storage, IMPORT_BUCKET_ID, IMPORT_LOGS_COLLECTION_ID } from '@/lib/appwrite';
import { ID, Models } from 'appwrite';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';

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

const Configuracion = () => {
  const { data: configs, loading: loadingConfig, create: createConfig, update: updateConfig, reload: reloadConfig } = useAppwriteCollection<WahaConfig>(CONFIG_COLLECTION_ID);
  const { toast } = useToast();
  const [config, setConfig] = useState<Omit<WahaConfig, '$id' | 'apiKey'>>(defaultConfig);
  const { data: importLogs, loading: loadingImportLogs, reload: reloadImportLogs } = useAppwriteCollection<ImportLog>(IMPORT_LOGS_COLLECTION_ID);

  const [clientLoading, setClientLoading] = useState(false);
  const [showImportLogDialog, setShowImportLogDialog] = useState(false);
  const [importLogContent, setImportLogContent] = useState<string[]>([]);
  const [isLocalImporting, setIsLocalImporting] = useState(false);

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
  
  const handleLocalImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLocalImporting(true);
    setClientLoading(true);
    toast({ title: 'Subiendo archivo para importación...', description: 'El proceso de importación continuará en segundo plano.' });

    try {
      await storage.createFile(IMPORT_BUCKET_ID, ID.unique(), file);
      toast({ title: 'Archivo subido con éxito', description: 'La importación de clientes ha comenzado en el servidor.' });
      setTimeout(() => reloadImportLogs(), 2000); 
    } catch (error: any) {
      toast({
        title: 'Error al subir el archivo CSV',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLocalImporting(false);
      setClientLoading(false);
    }

    event.target.value = '';
  };

  const handleDownloadLog = (log: ImportLog) => {
      const logContent = `
Fecha: ${new Date(log.timestamp).toLocaleString()}
Archivo: ${log.filename}
Resultado: ${log.successfulImports} / ${log.totalProcessed}
Estado: ${log.status}
Detalles:
${log.errors.join('\n')}
`;
      const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `log_importacion_${log.filename}_${new Date(log.timestamp).toISOString()}.txt`;
      link.click();
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

          <Card>
            <CardHeader><CardTitle>Historial de Importaciones</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Label htmlFor="csv-upload-local" className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border cursor-pointer"><HardDriveUpload className="w-4 h-4" />Importar<Input id="csv-upload-local" type="file" accept=".csv" onChange={handleLocalImport} className="sr-only" disabled={isLocalImporting} /></Label>
              </div>
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

          <AlertDialog open={showImportLogDialog} onOpenChange={setShowImportLogDialog}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Log de Importación</AlertDialogTitle></AlertDialogHeader>
              <div className="max-h-[60vh] overflow-y-auto rounded-md bg-slate-950 p-4"><code className="text-white whitespace-pre-wrap">{importLogContent.join('\n')}</code></div>
              <AlertDialogFooter><AlertDialogAction>Cerrar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;