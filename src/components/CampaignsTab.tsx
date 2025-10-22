import { useState } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { Campaign, Cliente, Template, MessageLog, CampaignProgress, LipooutUserInput } from '@/types';
import {
  CAMPAIGNS_COLLECTION_ID,
  TEMPLATES_COLLECTION_ID,
  MESSAGE_LOGS_COLLECTION_ID,
  CAMPAIGN_PROGRESS_COLLECTION_ID,
  client
} from '@/lib/appwrite';
import { Models, Functions } from 'appwrite';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { campaignSchema } from '@/lib/validators';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, Loader2, Send, Trash, Plus, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import LoadingSpinner from '@/components/LoadingSpinner';

const functions = new Functions(client);

type CampaignFormData = z.infer<typeof campaignSchema>;

// Props para el componente
interface CampaignsTabProps {
  clientes: (Cliente & Models.Document)[]; // Recibimos los clientes de la página principal
  loadingClientes: boolean;
}

export function CampaignsTab({ clientes, loadingClientes }: CampaignsTabProps) {
  const { toast } = useToast();
  
  // Hooks de Appwrite
  const { data: templates, loading: loadingTemplates } = useAppwriteCollection<Template>(TEMPLATES_COLLECTION_ID);
  const { data: campaigns, create: createCampaign, remove: deleteCampaign, loading: loadingCampaigns, reload: reloadCampaigns } = useAppwriteCollection<Campaign>(CAMPAIGNS_COLLECTION_ID);
  const { data: logs, loading: loadingLogs, reload: reloadLogs } = useAppwriteCollection<MessageLog>(MESSAGE_LOGS_COLLECTION_ID);
  const { data: progress, loading: loadingProgress } = useAppwriteCollection<CampaignProgress>(CAMPAIGN_PROGRESS_COLLECTION_ID);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCampaignLogs, setSelectedCampaignLogs] = useState<MessageLog[] | null>(null);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      templateId: '',
      clientIds: [],
      status: 'pending',
    },
  });

  // Clientes filtrados (solo los que aceptan envío)
  const subscribedClients = clientes.filter(c => c.enviar === true);

  const onSubmit = async (data: CampaignFormData) => {
    setIsSubmitting(true);
    try {
      const dataToSave: LipooutUserInput<Campaign> = {
        ...data,
        sendTime: data.sendTime.toISOString(), // Convertir Date a ISO string
      };
      
      await createCampaign(dataToSave);
      toast({ title: 'Campaña creada', description: 'La campaña se programó correctamente.' });
      form.reset();
      reloadCampaigns();
    } catch (e) {
      toast({ title: 'Error al crear campaña', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign(id);
      toast({ title: 'Campaña eliminada' });
      reloadCampaigns();
    } catch (e) {
      toast({ title: 'Error al eliminar', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleShowLogs = (campaignId: string) => {
    reloadLogs(); // Recargar logs
    const campaignLogs = logs.filter(log => log.campaignId === campaignId);
    setSelectedCampaignLogs(campaignLogs);
  };

  const handleRunCampaign = async (campaign: Campaign & Models.Document) => {
    toast({ title: 'Iniciando campaña...', description: `"${campaign.name}" comenzará a enviarse.` });
    try {
        await functions.createExecution(
            'sendWhatsAppFunction', // Nombre de la función en Appwrite
            JSON.stringify({ campaignId: campaign.$id }), // Payload
            false // No asíncrono, esperar respuesta
        );
        toast({ title: "Campaña en proceso", description: "La función de envío ha sido invocada." });
        reloadCampaigns();
        reloadLogs();
    } catch (e) {
         toast({ title: "Error al iniciar campaña", description: (e as Error).message, variant: 'destructive' });
    }
  };

  // Función para obtener el estado de la campaña
  const getCampaignProgress = (campaignId: string) => {
    const p = progress.find(p => p.campaignId === campaignId);
    if (!p) return null;
    return (
      <div className="text-xs">
        <p>{p.status === 'processing' ? 'Procesando...' : 'Completado'}</p>
        <p>{p.sentMessages} / {p.totalMessages} enviados</p>
        {p.failedMessages > 0 && <p className="text-destructive">{p.failedMessages} fallidos</p>}
      </div>
    );
  };
  
  // Función para buscar el nombre del cliente (usando la prop 'clientes')
  const getClientName = (clientId: string) => {
      const client = clientes.find(c => c.$id === clientId);
      // Usamos los campos de la colección 'clientes'
      return client ? `${client.nomcli} ${client.ape1cli || ''}`.trim() : 'Cliente no encontrado';
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna de Crear Campaña */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Nueva Campaña</CardTitle>
          <CardDescription>Configura y programa una nueva campaña de marketing.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Campaña</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Promo Navidad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plantilla</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingTemplates}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingTemplates ? "Cargando..." : "Selecciona una plantilla"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map(template => (
                          <SelectItem key={template.$id} value={template.$id}>{template.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clientes</FormLabel>
                    <FormControl>
                       <Button 
                         type="button" 
                         variant="outline" 
                         className="w-full justify-start"
                         onClick={() => field.onChange(subscribedClients.map(c => c.$id))}
                       >
                         {`Seleccionar ${subscribedClients.length} cliente(s) con permiso`}
                       </Button>
                    </FormControl>
                    <FormMessage />
                    {field.value?.length > 0 && (
                        <p className="text-xs text-muted-foreground">{field.value.length} clientes seleccionados.</p>
                    )}
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sendTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha y Hora de Envío</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy HH:mm', { locale: es })
                            ) : (
                              <span>Selecciona una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                        />
                        <div className="p-3 border-t">
                            <Input 
                                type="time" 
                                value={field.value ? format(field.value, 'HH:mm') : ''}
                                onChange={(e) => {
                                    const [hours, minutes] = e.target.value.split(':').map(Number);
                                    const newDate = field.value ? new Date(field.value) : new Date();
                                    newDate.setHours(hours, minutes);
                                    field.onChange(newDate);
                                }}
                            />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Programar Campaña
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Columna de Campañas Programadas */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Campañas Programadas</CardTitle>
          <CardDescription>Gestiona tus campañas pendientes y mira el historial.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCampaigns ? <LoadingSpinner /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Plantilla</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Fecha Envío</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.length === 0 && <TableRow><TableCell colSpan={6} className="text-center">No hay campañas.</TableCell></TableRow>}
                {campaigns.map(campaign => {
                  const templateName = templates.find(t => t.$id === campaign.templateId)?.name || 'N/A';
                  const progressInfo = getCampaignProgress(campaign.$id);
                  return (
                    <TableRow key={campaign.$id}>
                      <TableCell>{campaign.name}</TableCell>
                      <TableCell>{templateName}</TableCell>
                      <TableCell>{campaign.clientIds.length}</TableCell>
                      <TableCell>{format(new Date(campaign.sendTime), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell>
                          {progressInfo || <Badge variant={campaign.status === 'pending' ? 'outline' : 'default'}>{campaign.status}</Badge>}
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => handleShowLogs(campaign.$id)}>
                                <Eye className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Logs de Campaña: {campaign.name}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {loadingLogs ? <LoadingSpinner/> : (
                                   <ScrollArea className="h-[400px]">
                                     <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Cliente</TableHead>
                                                <TableHead>Teléfono</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead>Error</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedCampaignLogs?.length === 0 && <TableRow><TableCell colSpan={4}>No hay logs.</TableCell></TableRow>}
                                            {selectedCampaignLogs?.map(log => (
                                                <TableRow key={log.$id}>
                                                    <TableCell>{getClientName(log.clientId)}</TableCell>
                                                    <TableCell>{log.phone}</TableCell>
                                                    <TableCell>
                                                        {log.status === 'sent' ? <CheckCircle className="w-4 h-4 text-green-500"/> : <AlertCircle className="w-4 h-4 text-destructive"/>}
                                                    </TableCell>
                                                    <TableCell className="text-xs truncate max-w-[150px]">{log.error}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                     </Table>
                                   </ScrollArea>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cerrar</AlertDialogCancel>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        {campaign.status === 'pending' && (
                            <Button variant="default" size="icon" onClick={() => handleRunCampaign(campaign)}>
                                <Send className="w-4 h-4" />
                            </Button>
                        )}
                        
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(campaign.$id)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}