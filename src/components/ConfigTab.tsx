import { useState, useEffect } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { WahaConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CONFIG_COLLECTION_ID } from '@/lib/appwrite';

export function ConfigTab() {
  const { data: configs, loading, create, update } = useAppwriteCollection<WahaConfig>(CONFIG_COLLECTION_ID);
  const { toast } = useToast();
  const [config, setConfig] = useState<WahaConfig>({
    apiUrl: 'http://192.168.30.50:3000/api/send',
    apiKey: ''
  });

  useEffect(() => {
    if (configs.length > 0) {
      setConfig(configs[0]);
    }
  }, [configs]);

  const handleSave = async () => {
    try {
      if (configs.length > 0) {
        await update(configs[0].$id!, config);
      } else {
        await create(config);
      }
      toast({ title: 'Configuración guardada exitosamente' });
    } catch (error) {
      toast({ title: 'Error al guardar configuración', variant: 'destructive' });
    }
  };

  const testConnection = () => {
    console.log('=== TEST CONEXIÓN WAHA ===');
    console.log('URL:', config.apiUrl);
    console.log('API Key (fragmento):', config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'No configurada');
    console.log('Header completo:', `Bearer ${config.apiKey}`);
    
    toast({ 
      title: 'Test de conexión', 
      description: 'Ver consola para detalles de la configuración' 
    });
  };

  if (loading) return <div className="p-6">Cargando configuración...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Configuración y Seguridad</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Configuración de Waha API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="apiUrl">URL de la API</Label>
            <Input
              id="apiUrl"
              value={config.apiUrl}
              onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
              placeholder="http://192.168.30.50:3000/api/send"
            />
            <div className="text-xs text-muted-foreground mt-1">
              URL completa del endpoint de Waha para envío de mensajes
            </div>
          </div>

          <div>
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="Ingresa tu API Key de Waha"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Token de autenticación para acceder a la API de Waha
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button onClick={handleSave} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Guardar Configuración
            </Button>
            <Button onClick={testConnection} variant="outline" className="flex-1">
              Test Conexión
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Estado de la Configuración</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>URL API:</span>
                <span className={config.apiUrl ? 'text-green-600' : 'text-red-600'}>
                  {config.apiUrl ? 'Configurada' : 'No configurada'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>API Key:</span>
                <span className={config.apiKey ? 'text-green-600' : 'text-red-600'}>
                  {config.apiKey ? 'Configurada' : 'No configurada'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Base de Datos:</strong>
              <div className="text-muted-foreground">Appwrite (Conectado)</div>
            </div>
            <div>
              <strong>Endpoint:</strong>
              <div className="text-muted-foreground">https://appwrite.lipoout.com/v1</div>
            </div>
            <div>
              <strong>Project ID:</strong>
              <div className="text-muted-foreground">68d6d4060020e39899f6</div>
            </div>
            <div>
              <strong>Estado:</strong>
              <div className="text-green-600">Activo</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}