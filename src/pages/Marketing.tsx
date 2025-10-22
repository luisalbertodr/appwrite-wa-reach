import { useMemo } from 'react';
// --- CORRECCIÓN AQUÍ ---
import { useGetClientes } from '@/hooks/useClientes'; // Usamos el hook renombrado
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { Cliente, MessageLog } from '@/types'; // Usamos el tipo Cliente de Agenda
import { MESSAGE_LOGS_COLLECTION_ID } from '@/lib/appwrite';
import { Models } from 'appwrite';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Users, MessageSquare } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CampaignsTab } from '@/components/CampaignsTab'; 

const Marketing = () => {
  // --- LÓGICA REFACTORIZADA ---
  
  // --- CORRECCIÓN AQUÍ ---
  // 1. Usamos 'useGetClientes' y desestructuramos 'data' e 'isLoading' de react-query
  const { data: clientes = [], isLoading: loadingClientes } = useGetClientes();
  
  // 2. Filtramos los clientes usando los campos de 'Agenda' (enviar === true)
  const subscribedClients = useMemo(() => {
    return clientes.filter(c => c.enviar === true);
  }, [clientes]);
  // --- FIN LÓGICA REFACTORIZADA ---

  const { data: logs, loading: loadingLogs } = useAppwriteCollection<MessageLog>(MESSAGE_LOGS_COLLECTION_ID);

  const getClientName = (clientId: string) => {
    const client = clientes.find(c => c.$id === clientId);
    // Usamos los campos de la colección 'clientes'
    return client ? `${client.nomcli} ${client.ape1cli || ''}`.trim() : 'Cliente no encontrado';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marketing por WhatsApp</h1>
        <p className="text-muted-foreground">Crea, gestiona y monitoriza tus campañas de marketing.</p>
      </div>
      
      {/* Tarjetas de Resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingClientes ? <LoadingSpinner size="sm" /> : (
              <div className="text-2xl font-bold">{subscribedClients.length}</div>
            )}
            <p className="text-xs text-muted-foreground">De {clientes.length} clientes totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensajes Enviados (Total)</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingLogs ? <LoadingSpinner size="sm" /> : (
               <div className="text-2xl font-bold">{logs.filter(l => l.status === 'sent').length}</div>
            )}
            <p className="text-xs text-muted-foreground">Total histórico</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Fallos (Total)</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingLogs ? <LoadingSpinner size="sm" /> : (
               <div className="text-2xl font-bold">
                   {logs.length > 0 ? 
                     `${((logs.filter(l => l.status === 'failed').length / logs.length) * 100).toFixed(1)}%`
                     : '0%'}
               </div>
            )}
            <p className="text-xs text-muted-foreground">{logs.filter(l => l.status === 'failed').length} fallos</p>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas de Campañas y Logs */}
      <Tabs defaultValue="campaigns">
        <TabsList className="mb-4">
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="logs">Últimos Envíos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="campaigns">
          {/* ¡IMPORTANTE! Pasamos los clientes y el estado de carga al componente */}
          <CampaignsTab 
            clientes={clientes} 
            loadingClientes={loadingClientes}
          />
        </TabsContent>
        
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Envíos</CardTitle>
              <CardDescription>Últimos 50 mensajes enviados por todas las campañas.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? <LoadingSpinner /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.slice(0, 50).map(log => (
                      <TableRow key={log.$id}>
                        <TableCell>{format(new Date(log.timestamp), 'dd/MM/yy HH:mm', { locale: es })}</TableCell>
                        <TableCell>{getClientName(log.clientId)}</TableCell>
                        <TableCell>{log.phone}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                            {log.status === 'sent' ? <CheckCircle className="w-3 h-3 mr-1"/> : <AlertCircle className="w-3 h-3 mr-1"/>}
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[200px]">{log.error}</TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center">No hay logs de envío.</TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Marketing;