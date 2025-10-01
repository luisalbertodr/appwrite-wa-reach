import { useState, useEffect } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { WahaConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save, Shield, Bot, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CONFIG_COLLECTION_ID } from '@/lib/appwrite';

const defaultConfig: Omit<WahaConfig, '$id' | 'apiKey'> = {
  apiUrl: import.meta.env.VITE_WAHA_API_URL || 'http://192.168.30.50:3000/api',
  minDelayMs: 2000,
  maxDelayMs: 5000,
  batchSizeMin: 15,
  batchSizeMax: 25,
  batchDelayMsMin: 60000,
  batchDelayMsMax: 120000,
  adminPhoneNumber: '',
  notificationInterval: 50,
};

export function ConfigTab() {
  const { data: configs, loading, create, update, reload } = useAppwriteCollection<WahaConfig>(CONFIG_COLLECTION_ID);
  const { toast } = useToast();
  const [config, setConfig] = useState<Omit<WahaConfig, '$id' | 'apiKey'>>(defaultConfig);

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
        adminPhoneNumber: fetchedConfig.adminPhoneNumber || defaultConfig.adminPhoneNumber,
        notificationInterval: fetchedConfig.notificationInterval ?? defaultConfig.notificationInterval,
      });
    }
  }, [configs]);

  const handleSave = async () => {
    try {
      const configToSave = Object.fromEntries(
        Object.entries(config).map(([key, value]) => [key, value === '' ? 0 : value])
      );

      if (configs.length > 0 && configs[0].$id) {
        await update(configs[0].$id, configToSave);
      } else {
        await create(configToSave);
      }
      reload();
      toast({ title: 'Configuración guardada exitosamente' });
    } catch (error) {
      toast({ title: 'Error al guardar configuración', variant: 'destructive', description: (error as Error).message });
    }
  };

  if (loading) {
    return <div className="p-6">Cargando configuración...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Configuración del Sistema</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Configuración de Waha API</CardTitle>
          <CardDescription>URL del endpoint de Waha. La API Key se gestiona en el backend.</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="apiUrl">URL de la API de Waha</Label>
            <Input id="apiUrl" value={config.apiUrl || ''} onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })} placeholder="http://localhost:3000/api"/>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" />Políticas de Envío (Humanización)</CardTitle>
          <CardDescription>Parámetros para simular un comportamiento humano y reducir el riesgo de bloqueo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minDelayMs">Retardo Mínimo (ms)</Label>
              <Input id="minDelayMs" type="number" value={config.minDelayMs || ''} onChange={(e) => setConfig({ ...config, minDelayMs: Number(e.target.value) })} placeholder="2000"/>
              <p className="text-xs text-muted-foreground mt-1">Tiempo mínimo de espera entre mensajes.</p>
            </div>
            <div>
              <Label htmlFor="maxDelayMs">Retardo Máximo (ms)</Label>
              <Input id="maxDelayMs" type="number" value={config.maxDelayMs || ''} onChange={(e) => setConfig({ ...config, maxDelayMs: Number(e.target.value) })} placeholder="5000"/>
              <p className="text-xs text-muted-foreground mt-1">Tiempo máximo de espera entre mensajes.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batchSizeMin">Tamaño Mínimo de Lote</Label>
              <Input id="batchSizeMin" type="number" value={config.batchSizeMin || ''} onChange={(e) => setConfig({ ...config, batchSizeMin: Number(e.target.value) })} placeholder="15"/>
              <p className="text-xs text-muted-foreground mt-1">Mínimo de mensajes antes de una pausa.</p>
            </div>
            <div>
              <Label htmlFor="batchSizeMax">Tamaño Máximo de Lote</Label>
              <Input id="batchSizeMax" type="number" value={config.batchSizeMax || ''} onChange={(e) => setConfig({ ...config, batchSizeMax: Number(e.target.value) })} placeholder="25"/>
              <p className="text-xs text-muted-foreground mt-1">Máximo de mensajes antes de una pausa.</p>
            </div>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batchDelayMsMin">Pausa Mínima entre Lotes (ms)</Label>
              <Input id="batchDelayMsMin" type="number" value={config.batchDelayMsMin || ''} onChange={(e) => setConfig({ ...config, batchDelayMsMin: Number(e.target.value) })} placeholder="60000"/>
              <p className="text-xs text-muted-foreground mt-1">Tiempo mínimo de espera tras un lote.</p>
            </div>
            <div>
              <Label htmlFor="batchDelayMsMax">Pausa Máxima entre Lotes (ms)</Label>
              <Input id="batchDelayMsMax" type="number" value={config.batchDelayMsMax || ''} onChange={(e) => setConfig({ ...config, batchDelayMsMax: Number(e.target.value) })} placeholder="120000"/>
              <p className="text-xs text-muted-foreground mt-1">Tiempo máximo de espera tras un lote.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Notificaciones del Administrador</CardTitle>
          <CardDescription>Recibe notificaciones sobre el progreso de las campañas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="adminPhoneNumber">Nº de Teléfono del Admin (con cód. país)</Label>
              <Input id="adminPhoneNumber" value={config.adminPhoneNumber || ''} onChange={(e) => setConfig({ ...config, adminPhoneNumber: e.target.value })} placeholder="34600123456"/>
              <p className="text-xs text-muted-foreground mt-1">Ej: 34 para España.</p>
            </div>
            <div>
              <Label htmlFor="notificationInterval">Intervalo de Notificación</Label>
              <Input id="notificationInterval" type="number" value={config.notificationInterval || ''} onChange={(e) => setConfig({ ...config, notificationInterval: Number(e.target.value) })} placeholder="50"/>
              <p className="text-xs text-muted-foreground mt-1">Notificar cada X mensajes enviados.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full"><Save className="w-4 h-4 mr-2" />Guardar Toda la Configuración</Button>
    </div>
  );
}