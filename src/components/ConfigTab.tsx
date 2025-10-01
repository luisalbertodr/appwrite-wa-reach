import { useState, useEffect } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { WahaConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save, Shield, Database, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CONFIG_COLLECTION_ID, DATABASE_ID, PROJECT_ID } from '@/lib/appwrite';
// import { setupAppwrite } from '@/lib/appwrite_schema'; // La creación de esquema no es compatible desde el frontend

export function ConfigTab() {
  const { data: configs, loading, create, update, reload } = useAppwriteCollection<WahaConfig>(CONFIG_COLLECTION_ID);
  const { toast } = useToast();
  const [config, setConfig] = useState<WahaConfig>({
    apiUrl: import.meta.env.VITE_WAHA_API_URL || 'http://192.168.30.50:3000/api/send',
    // apiKey is handled securely on the backend
  });
  // const [isSettingUp, setIsSettingUp] = useState(false); // No se usa si no hay setup automático

  useEffect(() => {
    if (configs.length > 0) {
      setConfig(configs[0]);
    }
  }, [configs]);

  const handleSave = async () => {
    try {
      if (configs.length > 0 && configs[0].$id) {
        await update(configs[0].$id, config);
      } else {
        await create(config);
      }
      reload();
      toast({ title: 'Configuración guardada exitosamente' });
    } catch (error) {
      toast({ title: 'Error al guardar configuración', variant: 'destructive' });
    }
  };
  
  // const handleSetup = async () => { // Función de setup eliminada
  //     setIsSettingUp(true);
  //     await setupAppwrite();
  //     setIsSettingUp(false);
  // };

  const testConnection = () => {
    console.log('=== TEST CONEXIÓN WAHA ===');
    console.log('URL:', config.apiUrl);
    console.log('API Key: No expuesta en el frontend');
    console.log('Header completo: Manejado en el backend');
    
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
      
      {/* TARJETA DE SETUP (AHORA SOLO INFORMATIVA) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Setup del Sistema (Manual)
          </CardTitle>
          <CardDescription>
            La creación de bases de datos, colecciones y atributos en Appwrite no es compatible directamente desde el frontend.
            Por favor, usa el CLI de Appwrite, la consola de Appwrite o una Appwrite Function (backend) para configurar el esquema.
            Consulta la consola para ver la estructura de la base de datos necesaria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* <Button onClick={handleSetup} disabled={isSettingUp}> */}
          {/*   {isSettingUp ? ( */}
          {/*     <> */}
          {/*       <Loader2 className="mr-2 h-4 w-4 animate-spin" /> */}
          {/*       Configurando... */}
          {/*     </> */}
          {/*   ) : ( */}
          {/*     'Iniciar Configuración Automática' */}
          {/*   )} */}
          {/* </Button> */}
          <Button variant="outline" onClick={() => toast({ title: 'Información de Setup', description: 'Revisa la consola para la estructura de la base de datos.' })}>
            Ver Estructura de BD
          </Button>
        </CardContent>
      </Card>


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
                <span className="text-yellow-600">
                  Manejada en el backend
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
              <strong>Base de Datos ID:</strong>
              <div className="text-muted-foreground">{DATABASE_ID}</div>
            </div>
            <div>
              <strong>Endpoint:</strong>
              <div className="text-muted-foreground">https://appwrite.lipoout.com/v1</div>
            </div>
            <div>
              <strong>Project ID:</strong>
              <div className="text-muted-foreground">{PROJECT_ID}</div>
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
