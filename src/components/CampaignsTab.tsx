import { useState, useMemo } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { Client, Template, Campaign } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Clock, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CLIENTS_COLLECTION_ID, TEMPLATES_COLLECTION_ID, CAMPAIGNS_COLLECTION_ID } from '@/lib/appwrite';

export function CampaignsTab() {
  const { data: clients } = useAppwriteCollection<Client>(CLIENTS_COLLECTION_ID);
  const { data: templates, create: createTemplate } = useAppwriteCollection<Template>(TEMPLATES_COLLECTION_ID);
  const { data: campaigns, create: createCampaign } = useAppwriteCollection<Campaign>(CAMPAIGNS_COLLECTION_ID);
  const { toast } = useToast();

  const [filters, setFilters] = useState({
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

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      if (filters.edadMin && client.edad < parseInt(filters.edadMin)) return false;
      if (filters.edadMax && client.edad > parseInt(filters.edadMax)) return false;
      if (filters.facturacionMin && client.facturacion < parseFloat(filters.facturacionMin)) return false;
      if (filters.facturacionMax && client.facturacion > parseFloat(filters.facturacionMax)) return false;
      if (filters.intereses) {
        const selectedIntereses = filters.intereses.split(',').map(i => i.trim().toLowerCase());
        const hasMatchingInterest = selectedIntereses.some(interes => 
          client.intereses.some(clientInteres => 
            clientInteres.toLowerCase().includes(interes)
          )
        );
        if (!hasMatchingInterest) return false;
      }
      return true;
    });
  }, [clients, filters]);

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.message) {
      toast({ title: 'Complete todos los campos de la plantilla', variant: 'destructive' });
      return;
    }
    
    try {
      await createTemplate(newTemplate);
      setNewTemplate({ name: '', message: '' });
      toast({ title: 'Plantilla creada exitosamente' });
    } catch (error) {
      toast({ title: 'Error al crear plantilla', variant: 'destructive' });
    }
  };

  const sendWhatsApp = async (isScheduled = false) => {
    if (!selectedTemplate) {
      toast({ title: 'Seleccione una plantilla', variant: 'destructive' });
      return;
    }

    if (isScheduled && !scheduledDate) {
      toast({ title: 'Seleccione fecha y hora para agendar', variant: 'destructive' });
      return;
    }

    const template = templates.find(t => t.$id === selectedTemplate);
    if (!template) return;

    // Logging para la API de Waha
    console.log('=== ENVÍO WHATSAPP ===');
    console.log(`Clientes segmentados: ${filteredClients.length}`);
    console.log('URL API Waha: http://192.168.30.50:3000/api/send');
    console.log('Header Authorization: Bearer [API_KEY_FRAGMENT]');
    
    filteredClients.forEach((client, index) => {
      const personalizedMessage = template.message
        .replace(/\[NOMBRE\]/g, client.nombre)
        .replace(/\[FACTURACION\]/g, client.facturacion.toString());
      
      const payload = {
        chatId: `${client.telefono}@c.us`,
        message: personalizedMessage
      };
      
      console.log(`Payload ${index + 1}:`, JSON.stringify(payload, null, 2));
    });

    // Crear campaña
    try {
      await createCampaign({
        name: `Campaña ${new Date().toLocaleDateString()}`,
        templateId: selectedTemplate,
        filters: {
          edadMin: filters.edadMin ? parseInt(filters.edadMin) : undefined,
          edadMax: filters.edadMax ? parseInt(filters.edadMax) : undefined,
          facturacionMin: filters.facturacionMin ? parseFloat(filters.facturacionMin) : undefined,
          facturacionMax: filters.facturacionMax ? parseFloat(filters.facturacionMax) : undefined,
          intereses: filters.intereses ? filters.intereses.split(',').map(i => i.trim()) : undefined
        },
        scheduledDate: isScheduled ? scheduledDate : undefined,
        status: isScheduled ? 'scheduled' : 'sent',
        audienceCount: filteredClients.length,
        createdAt: new Date().toISOString()
      });

      toast({ 
        title: isScheduled ? 'Campaña agendada exitosamente' : 'Campaña enviada exitosamente',
        description: `${filteredClients.length} mensajes ${isScheduled ? 'agendados' : 'enviados'}`
      });
    } catch (error) {
      toast({ title: 'Error al crear campaña', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Campañas WhatsApp y Envíos</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Segmentación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Segmentación de Audiencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="text-sm text-muted-foreground">
              Audiencia segmentada: <strong>{filteredClients.length} clientes</strong>
            </div>
          </CardContent>
        </Card>

        {/* Plantillas */}
        <Card>
          <CardHeader>
            <CardTitle>Plantillas de Mensaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                Usa [NOMBRE] y [FACTURACION] como placeholders
              </div>
            </div>
            <Button onClick={handleCreateTemplate} className="w-full">
              Guardar Plantilla
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Envío y Agendamiento */}
      <Card>
        <CardHeader>
          <CardTitle>Envío y Agendamiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="selectTemplate">Seleccionar Plantilla</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.$id} value={template.$id!}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="scheduledDate">Fecha y Hora de Agendamiento</Label>
              <Input
                id="scheduledDate"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => sendWhatsApp(false)} className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              Enviar WhatsApp Ahora
            </Button>
            <Button onClick={() => sendWhatsApp(true)} variant="outline" className="flex-1">
              <Clock className="w-4 h-4 mr-2" />
              Agendar Envío
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Campañas</CardTitle>
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
              {campaigns.map((campaign) => (
                <TableRow key={campaign.$id}>
                  <TableCell>{campaign.name}</TableCell>
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
                      campaign.status === 'scheduled' ? 'secondary' : 'outline'
                    }>
                      {campaign.status === 'sent' ? 'Enviado' : 
                       campaign.status === 'scheduled' ? 'Agendado' : 'Pendiente'}
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