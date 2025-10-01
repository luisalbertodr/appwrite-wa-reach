import { useState, useMemo, useEffect } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { Client, Template, Campaign, WahaConfig, WhatsAppFunctionResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Clock, Filter, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CLIENTS_COLLECTION_ID, TEMPLATES_COLLECTION_ID, CAMPAIGNS_COLLECTION_ID, CONFIG_COLLECTION_ID, client } from '@/lib/appwrite';
import { Functions, ID } from 'appwrite';

const functions = new Functions(client);

const WAHA_DEFAULT_URL = 'http://192.168.30.50:3000/api/send';

/**
 * Componente principal para la gestión de campañas y envíos de WhatsApp.
 * Ahora se conecta a la API de Waha (real) y utiliza toasts para notificaciones.
 */
export function CampaignsTab() {
  const { data: clients, loading: loadingClients } = useAppwriteCollection<Client>(CLIENTS_COLLECTION_ID);
  const { data: templates, create: createTemplate, loading: loadingTemplates, reload: reloadTemplates } = useAppwriteCollection<Template>(TEMPLATES_COLLECTION_ID);
  const { data: campaigns, create: createCampaign, loading: loadingCampaigns, reload: reloadCampaigns } = useAppwriteCollection<Campaign>(CAMPAIGNS_COLLECTION_ID);
  const { data: configs } = useAppwriteCollection<WahaConfig>(CONFIG_COLLECTION_ID);
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    nombreApellido: '',
    email: '',
    codcli: '',
    dnicli: '',
    telefono: '',
    sexo: 'all', // 'H', 'M', 'Otro', or 'all' for all
    edadMin: '',
    edadMax: '',
    facturacionMin: '',
    facturacionMax: '',
    intereses: ''
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    message: ''
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Extrae la configuración de Waha del hook de Appwrite
  const wahaConfig = useMemo<WahaConfig>(() => {
    return configs.length > 0
      ? configs[0]
      : { apiUrl: WAHA_DEFAULT_URL, apiKey: '', $id: undefined };
  }, [configs]);


  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const lowerCaseNombreApellidoFilter = filters.nombreApellido.toLowerCase();
      const lowerCaseEmailFilter = filters.email.toLowerCase();
      const lowerCaseDniNieFilter = filters.dnicli.toLowerCase();
      const lowerCaseTelefonoFilter = filters.telefono.toLowerCase();

      // Filter by nombre o apellido
      if (lowerCaseNombreApellidoFilter && 
          !(client.nomcli?.toLowerCase().includes(lowerCaseNombreApellidoFilter) || 
            client.ape1cli?.toLowerCase().includes(lowerCaseNombreApellidoFilter))) {
        return false;
      }

      // Filter by email
      if (lowerCaseEmailFilter && !client.email?.toLowerCase().includes(lowerCaseEmailFilter)) {
        return false;
      }

      // Filter by cod. cliente
      if (filters.codcli && !client.codcli.includes(filters.codcli)) {
        return false;
      }

      // Filter by DNI/NIE
      if (lowerCaseDniNieFilter && !client.dnicli?.toLowerCase().includes(lowerCaseDniNieFilter)) {
        return false;
      }

      // Filter by teléfono (tel2cli for notifications)
      if (lowerCaseTelefonoFilter && !client.tel2cli?.toLowerCase().includes(lowerCaseTelefonoFilter)) {
        return false;
      }

      // Filter by sexo
      if (filters.sexo !== 'all' && client.sexo !== filters.sexo) {
        return false;
      }

      // Existing filters
      const minAge = filters.edadMin ? parseInt(filters.edadMin) : undefined;
      const maxAge = filters.edadMax ? parseInt(filters.edadMax) : undefined;
      const minRevenue = filters.facturacionMin ? parseFloat(filters.facturacionMin) : undefined;
      const maxRevenue = filters.facturacionMax ? parseFloat(filters.facturacionMax) : undefined; // Added maxRevenue filter

      if (minAge !== undefined && (client.edad === undefined || client.edad < minAge)) return false;
      if (maxAge !== undefined && (client.edad === undefined || client.edad > maxAge)) return false;
      if (minRevenue !== undefined && (client.facturacion === undefined || client.facturacion < minRevenue)) return false;
      if (maxRevenue !== undefined && (client.facturacion === undefined || client.facturacion > maxRevenue)) return false; // Apply maxRevenue filter

      if (filters.intereses) {
        const selectedIntereses = filters.intereses.split(',').map(i => i.trim().toLowerCase());
        const clientInterests = client.intereses?.map(i => i.toLowerCase()) || []; // Handle undefined intereses
        
        // Debe tener AL MENOS uno de los intereses seleccionados
        const hasMatchingInterest = selectedIntereses.some(interes => 
          clientInterests.includes(interes)
        );
        if (!hasMatchingInterest) return false;
      }
      return true;
    });
  }, [clients, filters]);

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.message) {
      toast({ title: 'Error', description: 'Complete todos los campos de la plantilla.', variant: 'destructive' });
      return;
    }
    
    try {
      await createTemplate(newTemplate);
      setNewTemplate({ name: '', message: '' });
      reloadTemplates();
      toast({ title: 'Éxito', description: 'Plantilla creada exitosamente.' });
    } catch (error) {
      toast({ title: 'Error al crear plantilla', description: 'No se pudo guardar en Appwrite.', variant: 'destructive' });
    }
  };

  const getTemplateContent = (templateId: string) => {
    const template = templates.find(t => t.$id === templateId);
    return template ? template.message : 'Selecciona una plantilla para previsualizar el mensaje...';
  };
  
  const generateMessage = (client: Client, content: string) => {
    return content
      .replace(/\[NOMBRE\]/g, client.nomcli || '')
      .replace(/\[FACTURACION\]/g, client.facturacion.toFixed(2));
  };


  const sendWhatsApp = async (isScheduled = false) => {
    if (isSending) return;
    if (!selectedTemplate) {
      toast({ title: 'Acción Requerida', description: 'Seleccione una plantilla antes de enviar.', variant: 'destructive' });
      return;
    }
    if (filteredClients.length === 0) {
      toast({ title: 'Atención', description: 'No hay clientes que cumplan con los criterios de segmentación.', variant: 'destructive' });
      return;
    }
    
    setIsSending(true);
    const template = templates.find(t => t.$id === selectedTemplate);
    const templateContent = template?.message || '';
    const sendStatus = isScheduled ? 'scheduled' : 'sent';
    const filtersDesc = `Edad: ${filters.edadMin || 'min'}-${filters.edadMax || 'max'}, Facturación Min: €${filters.facturacionMin || '0'}, Intereses: ${filters.intereses || 'Todos'}`;
    let successfulSends = 0;
    
    // Notificación inicial del proceso
    toast({ 
      title: 'Campaña Iniciada', 
      description: `Comenzando el proceso de ${isScheduled ? 'agendamiento' : 'envío'} a ${filteredClients.length} clientes.`,
      duration: 5000 
    });


    // --- BUCLE DE ENVÍO A TRAVÉS DE APPWRITE FUNCTION ---
    for (const client of filteredClients) {
      const personalizedMessage = generateMessage(client, templateContent);
      
      const functionPayload = {
        recipient: client.tel2cli,
        message: personalizedMessage,
        // imageUrl: 'OPTIONAL_IMAGE_URL_HERE' // Si se implementa el envío de imágenes
      };

      try {
        // Ejecutar la función de Appwrite
        const response = await functions.createExecution(
          'sendWhatsAppFunction', // ID de la función de Appwrite
          JSON.stringify(functionPayload),
          true // Asynchronous execution
        );

        const data: WhatsAppFunctionResponse = JSON.parse(response.response); // La respuesta de la función es un string JSON

        if (response.status === 'completed' && response.statusCode === 200 && data.success) {
          successfulSends++;
        } else {
          toast({
            title: 'Error en Función Appwrite',
            description: `Fallo para ${client.nomcli}. Estado: ${response.statusCode}. Mensaje: ${data.error || 'Error desconocido'}`,
            variant: 'destructive'
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al ejecutar la función de Appwrite.';
        toast({
          title: 'Error de Ejecución de Función',
          description: `No se pudo ejecutar la función de Appwrite para ${client.nomcli}: ${errorMessage}`,
          variant: 'destructive'
        });
      }
    }
    // --- FIN DEL BUCLE DE ENVÍO ---


    // Crear registro de campaña en Appwrite
    try {
      await createCampaign({
        name: isScheduled ? `Agendada: ${template?.name || 'N/A'}` : `Envío: ${template?.name || 'N/A'}`,
        templateId: selectedTemplate,
        filters: {
          edadMin: filters.edadMin ? parseInt(filters.edadMin) : undefined,
          edadMax: filters.edadMax ? parseInt(filters.edadMax) : undefined,
          facturacionMin: filters.facturacionMin ? parseFloat(filters.facturacionMin) : undefined,
          facturacionMax: filters.facturacionMax ? parseFloat(filters.facturacionMax) : undefined,
          intereses: filters.intereses ? filters.intereses.split(',').map(i => i.trim()) : undefined
        },
        scheduledDate: isScheduled ? scheduledDate : new Date().toISOString(),
        status: successfulSends > 0 ? sendStatus : 'failed',
        audienceCount: filteredClients.length,
        createdAt: new Date().toISOString()
      });
      reloadCampaigns();
    } catch (error) {
       toast({ title: 'Error Appwrite', description: 'Error al guardar el registro de la campaña.', variant: 'destructive' });
    }
    
    setIsSending(false);

    // Notificación final de resumen
    if (successfulSends === filteredClients.length) {
      toast({ 
        title: 'Campaña Finalizada con Éxito',
        description: `${filteredClients.length} mensajes ${isScheduled ? 'agendados' : 'enviados'} correctamente.`,
        duration: 8000
      });
    } else if (successfulSends > 0) {
       toast({ 
        title: 'Campaña Finalizada (Parcial)',
        description: `${successfulSends}/${filteredClients.length} mensajes se enviaron. Revisa la consola y el historial para ver fallos.`,
        variant: 'destructive',
        duration: 10000
      });
    } else {
      toast({ 
        title: 'Campaña Fallida',
        description: 'No se pudo enviar ningún mensaje. Revisa tu configuración de Waha y el estado de la API.',
        variant: 'destructive',
        duration: 10000
      });
    }
  };
  // --- FIN sendWhatsApp ---

  if (loadingClients || loadingTemplates || loadingCampaigns) {
    return <div className="p-6">Cargando datos de Appwrite...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Campañas WhatsApp y Envíos</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Segmentación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Segmentación de Audiencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nombreApellido">Nombre o Apellido</Label>
              <Input
                id="nombreApellido"
                value={filters.nombreApellido}
                onChange={(e) => setFilters({ ...filters, nombreApellido: e.target.value })}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={filters.email}
                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                placeholder="Ej: juan.perez@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codcli">Cód. Cliente</Label>
                <Input
                  id="codcli"
                  value={filters.codcli}
                  onChange={(e) => setFilters({ ...filters, codcli: e.target.value })}
                  placeholder="Ej: 123456"
                />
              </div>
              <div>
                <Label htmlFor="dnicli">DNI/NIE</Label>
                <Input
                  id="dnicli"
                  value={filters.dnicli}
                  onChange={(e) => setFilters({ ...filters, dnicli: e.target.value })}
                  placeholder="Ej: 12345678A"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                value={filters.telefono}
                onChange={(e) => setFilters({ ...filters, telefono: e.target.value })}
                placeholder="Ej: +34600123456"
              />
            </div>
            <div>
              <Label htmlFor="sexo">Sexo</Label>
              <Select value={filters.sexo} onValueChange={(value) => setFilters({ ...filters, sexo: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="H">Hombre</SelectItem>
                  <SelectItem value="M">Mujer</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edadMin">Edad Mínima</Label>
                <Input
                  id="edadMin"
                  type="number"
                  value={filters.edadMin}
                  onChange={(e) => setFilters({ ...filters, edadMin: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edadMax">Edad Máxima</Label>
                <Input
                  id="edadMax"
                  type="number"
                  value={filters.edadMax}
                  onChange={(e) => setFilters({ ...filters, edadMax: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="facturacionMin">Facturación Mínima</Label>
                <Input
                  id="facturacionMin"
                  type="number"
                  value={filters.facturacionMin}
                  onChange={(e) => setFilters({ ...filters, facturacionMin: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="facturacionMax">Facturación Máxima</Label>
                {/* No usamos Facturación Max en la lógica actual, pero mantenemos el campo para consistencia de UI */}
                <Input
                  id="facturacionMax"
                  type="number"
                  value={filters.facturacionMax}
                  onChange={(e) => setFilters({ ...filters, facturacionMax: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="intereses">Intereses (separados por coma)</Label>
              <Input
                id="intereses"
                value={filters.intereses}
                onChange={(e) => setFilters({ ...filters, intereses: e.target.value })}
                placeholder="tecnología, deportes"
              />
            </div>
            <div className="text-sm text-muted-foreground pt-2">
              Audiencia segmentada: <strong className="text-primary">{filteredClients.length} clientes</strong>
            </div>
          </CardContent>
        </Card>

        {/* Plantillas */}
        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle>Plantillas de Mensaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className='text-md font-semibold'>Crear Nueva Plantilla</h4>
            <div>
              <Label htmlFor="templateName">Nombre de Plantilla</Label>
              <Input
                id="templateName"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Nombre de la plantilla"
              />
            </div>
            <div>
              <Label htmlFor="templateMessage">Mensaje</Label>
              <Textarea
                id="templateMessage"
                value={newTemplate.message}
                onChange={(e) => setNewTemplate({ ...newTemplate, message: e.target.value })}
                placeholder="Hola [NOMBRE], tu facturación de [FACTURACION] es importante para nosotros..."
                rows={4}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Usa **[NOMBRE]** y **[FACTURACION]** como *placeholders*
              </div>
            </div>
            <Button onClick={handleCreateTemplate} className="w-full">
              Guardar Plantilla
            </Button>
            <hr className="border-t border-gray-100 dark:border-gray-800" />
            <h4 className='text-md font-semibold'>Seleccionar Plantilla</h4>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una plantilla para el envío" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.$id} value={template.$id!}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground mt-2 p-2 border rounded bg-gray-50 dark:bg-gray-800 break-words whitespace-pre-wrap">
              {getTemplateContent(selectedTemplate)}
            </div>
          </CardContent>
        </Card>

        {/* Envío y Agendamiento */}
        <Card>
          <CardHeader>
            <CardTitle>Enviar o Agendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Fecha y Hora de Agendamiento</Label>
              <Input
                id="scheduledDate"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                Si no se agenda, se envía de inmediato.
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Button 
                onClick={() => sendWhatsApp(false)} 
                disabled={filteredClients.length === 0 || !selectedTemplate || isSending}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSending ? 'Enviando...' : 'Enviar WhatsApp Ahora (REAL)'}
              </Button>
              <Button 
                onClick={() => sendWhatsApp(true)} 
                disabled={filteredClients.length === 0 || !selectedTemplate || !scheduledDate || isSending}
                variant="secondary" 
                className="w-full"
              >
                <Clock className="w-4 h-4 mr-2" />
                {isSending ? 'Agendando...' : 'Agendar Envío (APPWRITE)'}
              </Button>
            </div>
            <p className="text-sm text-center text-red-500 mt-4">
              El envío real está configurado para llamar a la API de Waha directamente.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Campañas ({campaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaña</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Audiencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Plantilla</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns
                 .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                 .map((campaign) => (
                <TableRow key={campaign.$id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    {campaign.scheduledDate 
                      ? new Date(campaign.scheduledDate).toLocaleString()
                      : new Date(campaign.createdAt).toLocaleString()
                    }
                  </TableCell>
                  <TableCell>{campaign.audienceCount} clientes</TableCell>
                  <TableCell>
                    <Badge variant={
                      campaign.status === 'sent' ? 'default' : 
                      campaign.status === 'scheduled' ? 'secondary' : 'destructive'
                    }>
                      {campaign.status === 'sent' ? 'Enviado' : 
                       campaign.status === 'scheduled' ? 'Agendado' : 'Fallido'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {templates.find(t => t.$id === campaign.templateId)?.name || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
