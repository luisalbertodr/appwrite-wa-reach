import { useState, useMemo, useEffect } from 'react';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { Client, Template, Campaign, WahaConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Clock, Filter, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CLIENTS_COLLECTION_ID, TEMPLATES_COLLECTION_ID, CAMPAIGNS_COLLECTION_ID, CONFIG_COLLECTION_ID, client, databases, DATABASE_ID } from '@/lib/appwrite';
import { Functions, ID, Query } from 'appwrite';
import Papa from 'papaparse';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';


const functions = new Functions(client);
const MESSAGE_LOGS_COLLECTION_ID = 'message_logs'; 

interface Progress {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
}

// Función para normalizar texto (quitar acentos)
const normalizeText = (text: string) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

export function CampaignsTab() {
  const { data: clients, loading: loadingClients } = useAppwriteCollection<Client>(CLIENTS_COLLECTION_ID);
  const { data: templates, create: createTemplate, loading: loadingTemplates, reload: reloadTemplates } = useAppwriteCollection<Template>(TEMPLATES_COLLECTION_ID);
  const { data: campaigns, create: createCampaign, loading: loadingCampaigns, reload: reloadCampaigns } = useAppwriteCollection<Campaign>(CAMPAIGNS_COLLECTION_ID);
  const { data: configs } = useAppwriteCollection<WahaConfig>(CONFIG_COLLECTION_ID);
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    nombreApellido: '', email: '', codcli: '', dnicli: '', telefono: '', sexo: 'all',
    edadMin: '', edadMax: '', facturacionMin: '', facturacionMax: '', intereses: ''
  });

  const [newTemplate, setNewTemplate] = useState({ name: '', message: '' });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({ sent: 0, failed: 0, skipped: 0, total: 0 });

  const wahaConfig = useMemo<WahaConfig | null>(() => (configs.length > 0 ? configs[0] : null), [configs]);

  useEffect(() => {
    if (!activeCampaignId) return;

    const interval = setInterval(async () => {
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          MESSAGE_LOGS_COLLECTION_ID,
          [Query.equal('campaignId', activeCampaignId), Query.limit(5000)]
        );
        
        const sent = response.documents.filter(d => d.status === 'sent').length;
        const failed = response.documents.filter(d => d.status === 'failed').length;
        const skipped = response.documents.filter(d => d.status === 'skipped').length;
        
        setProgress(prev => ({ ...prev, sent, failed, skipped }));

        if (sent + failed + skipped >= progress.total) {
          toast({ title: 'Campaña Completada', description: `Enviados: ${sent}, Fallidos: ${failed}, Saltados: ${skipped}` });
          setActiveCampaignId(null);
        }
      } catch (error) {
        console.error("Error al obtener progreso:", error);
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeCampaignId, progress.total]);


  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const normalizedNombreApellidoFilter = normalizeText(filters.nombreApellido);
      const searchTerms = normalizedNombreApellidoFilter.split(' ').filter(term => term);

      // Lógica de búsqueda combinada y sin acentos
      if (searchTerms.length > 0) {
        const clientFullName = normalizeText(`${client.nomcli || ''} ${client.ape1cli || ''}`);
        const matchesAllTerms = searchTerms.every(term => clientFullName.includes(term));
        if (!matchesAllTerms) {
          return false;
        }
      }

      const lowerCaseEmailFilter = filters.email.toLowerCase();
      if (lowerCaseEmailFilter && !(client.email || '').toLowerCase().includes(lowerCaseEmailFilter)) return false;

      if (filters.codcli && !client.codcli.includes(filters.codcli)) return false;
      if (filters.dnicli && !(client.dnicli || '').toLowerCase().includes(filters.dnicli.toLowerCase())) return false;
      if (filters.telefono && !(client.tel2cli || '').includes(filters.telefono)) return false;
      if (filters.sexo !== 'all' && client.sexo !== filters.sexo) return false;

      const minAge = filters.edadMin ? parseInt(filters.edadMin) : undefined;
      const maxAge = filters.edadMax ? parseInt(filters.edadMax) : undefined;
      const minRevenue = filters.facturacionMin ? parseFloat(filters.facturacionMin) : undefined;
      const maxRevenue = filters.facturacionMax ? parseFloat(filters.facturacionMax) : undefined;

      if (minAge !== undefined && (client.edad === undefined || client.edad < minAge)) return false;
      if (maxAge !== undefined && (client.edad === undefined || client.edad > maxAge)) return false;
      if (minRevenue !== undefined && (client.facturacion === undefined || client.facturacion < minRevenue)) return false;
      if (maxRevenue !== undefined && (client.facturacion === undefined || client.facturacion > maxRevenue)) return false;

      if (filters.intereses) {
        const selectedIntereses = filters.intereses.split(',').map(i => normalizeText(i.trim()));
        const clientInterests = client.intereses?.map(i => normalizeText(i)) || [];
        const hasMatchingInterest = selectedIntereses.some(interes => clientInterests.includes(interes));
        if (!hasMatchingInterest) return false;
      }
      return true;
    });
  }, [clients, filters]);

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.message) return;
    await createTemplate(newTemplate);
    setNewTemplate({ name: '', message: '' });
    toast({ title: 'Plantilla creada' });
    reloadTemplates();
  };
  
  const getTemplateContent = (templateId: string) => templates.find(t => t.$id === templateId)?.message || 'Selecciona una plantilla...';

  const startCampaign = async () => {
    const selectedTemplate = templates.find(t => t.$id === selectedTemplateId);
    if (!selectedTemplate || filteredClients.length === 0 || !wahaConfig) {
      toast({ title: 'Error', description: 'Selecciona una plantilla, configura el sistema y asegúrate de que la segmentación tenga clientes.', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    
    try {
      const campaignDoc = await createCampaign({
        name: `Campaña: ${selectedTemplate.name}`,
        templateId: selectedTemplateId,
        filters: {},
        status: 'pending',
        audienceCount: filteredClients.length,
        createdAt: new Date().toISOString()
      });
      const campaignId = campaignDoc.$id;
      setActiveCampaignId(campaignId);
      setProgress({ sent: 0, failed: 0, skipped: 0, total: filteredClients.length });
      
      toast({ 
        title: 'Iniciando Campaña...', 
        description: `El envío a ${filteredClients.length} clientes ha comenzado.`,
      });

      await functions.createExecution(
        'sendWhatsAppFunction',
        JSON.stringify({
          clients: filteredClients,
          template: selectedTemplate,
          config: wahaConfig,
          campaignId: campaignId,
        }),
        false
      );
      
      reloadCampaigns();

    } catch (error) {
      toast({ title: 'Error al Iniciar Campaña', description: (error as Error).message, variant: 'destructive' });
      setIsSending(false);
    }
  };

  const handleExport = () => {
    if (filteredClients.length === 0) {
      toast({ title: 'No hay clientes para exportar', variant: 'destructive' });
      return;
    }
    const dataToExport = filteredClients.map(client => ({ ...client, intereses: client.intereses?.join(', ') || '' }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `segmentacion_campana_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };

  if (loadingClients || loadingTemplates || loadingCampaigns) return <div className="p-6">Cargando...</div>;

  const processedCount = progress.sent + progress.failed + progress.skipped;
  const progressPercentage = progress.total > 0 ? (processedCount / progress.total) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Campañas WhatsApp</h2>

      {activeCampaignId && (
        <Card className="border-primary">
          <CardHeader><CardTitle>Progreso de la Campaña en Curso</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Progress value={progressPercentage} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{`Procesados: ${processedCount} de ${progress.total}`}</span>
              <div className="flex gap-4">
                <span className="text-green-500">Éxitos: {progress.sent}</span>
                <span className="text-red-500">Fallos: {progress.failed}</span>
                <span className="text-yellow-500">Saltados: {progress.skipped}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5" />Segmentación de Audiencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="nombreApellido">Nombre o Apellido</Label><Input id="nombreApellido" value={filters.nombreApellido} onChange={(e) => setFilters({ ...filters, nombreApellido: e.target.value })} placeholder="Ej: Juan Pérez"/></div>
              <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={filters.email} onChange={(e) => setFilters({ ...filters, email: e.target.value })} placeholder="Ej: juan.perez@example.com"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="codcli">Cód. Cliente</Label><Input id="codcli" value={filters.codcli} onChange={(e) => setFilters({ ...filters, codcli: e.target.value })} placeholder="Ej: 123456"/></div>
                <div><Label htmlFor="dnicli">DNI/NIE</Label><Input id="dnicli" value={filters.dnicli} onChange={(e) => setFilters({ ...filters, dnicli: e.target.value })} placeholder="Ej: 12345678A"/></div>
              </div>
              <div><Label htmlFor="telefono">Teléfono</Label><Input id="telefono" type="tel" value={filters.telefono} onChange={(e) => setFilters({ ...filters, telefono: e.target.value })} placeholder="Ej: 600123456"/></div>
              <div><Label htmlFor="sexo">Sexo</Label><Select value={filters.sexo} onValueChange={(value) => setFilters({ ...filters, sexo: value })}><SelectTrigger><SelectValue placeholder="Selecciona sexo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="H">Hombre</SelectItem><SelectItem value="M">Mujer</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="edadMin">Edad Mínima</Label><Input id="edadMin" type="number" value={filters.edadMin} onChange={(e) => setFilters({ ...filters, edadMin: e.target.value })}/></div>
                <div><Label htmlFor="edadMax">Edad Máxima</Label><Input id="edadMax" type="number" value={filters.edadMax} onChange={(e) => setFilters({ ...filters, edadMax: e.target.value })}/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="facturacionMin">Facturación Mínima</Label><Input id="facturacionMin" type="number" value={filters.facturacionMin} onChange={(e) => setFilters({ ...filters, facturacionMin: e.target.value })}/></div>
                <div><Label htmlFor="facturacionMax">Facturación Máxima</Label><Input id="facturacionMax" type="number" value={filters.facturacionMax} onChange={(e) => setFilters({ ...filters, facturacionMax: e.target.value })}/></div>
              </div>
              <div><Label htmlFor="intereses">Intereses (separados por coma)</Label><Input id="intereses" value={filters.intereses} onChange={(e) => setFilters({ ...filters, intereses: e.target.value })} placeholder="tecnología, deportes"/></div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Previsualización de Audiencia ({filteredClients.length})</CardTitle>
            </CardHeader>
            <CardContent>
               <Button variant="outline" onClick={handleExport} disabled={filteredClients.length === 0} className="w-full mb-4"><Download className="w-4 h-4 mr-2" />Exportar a CSV</Button>
               <ScrollArea className="h-72 w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cód.</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Apellidos</TableHead>
                      <TableHead>Teléfono</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.length > 0 ? (
                      filteredClients.map((client) => (
                        <TableRow key={client.$id}>
                          <TableCell>{client.codcli}</TableCell>
                          <TableCell>{client.nomcli}</TableCell>
                          <TableCell>{client.ape1cli}</TableCell>
                          <TableCell>{client.tel2cli}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">No hay clientes que coincidan.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Plantillas de Mensaje</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <h4 className='text-md font-semibold'>Crear Nueva Plantilla</h4>
              <div><Label htmlFor="templateName">Nombre</Label><Input id="templateName" value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}/></div>
              <div><Label htmlFor="templateMessage">Mensaje</Label><Textarea id="templateMessage" value={newTemplate.message} onChange={(e) => setNewTemplate({ ...newTemplate, message: e.target.value })} placeholder="Hola [nombre] [apellido],..."/><div className="text-xs text-muted-foreground mt-1">Usa **[nombre]** y **[apellido]**.</div></div>
              <Button onClick={handleCreateTemplate} className="w-full">Guardar Plantilla</Button>
              <hr />
              <h4 className='text-md font-semibold'>Seleccionar Plantilla</h4>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}><SelectTrigger><SelectValue placeholder="Selecciona una plantilla" /></SelectTrigger><SelectContent>{templates.map((t) => (<SelectItem key={t.$id} value={t.$id!}>{t.name}</SelectItem>))}</SelectContent></Select>
              <div className="text-sm text-muted-foreground mt-2 p-2 border rounded bg-gray-50 dark:bg-gray-800 break-words whitespace-pre-wrap">{getTemplateContent(selectedTemplateId)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Iniciar Campaña</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">La campaña se enviará a los <strong className="text-primary">{filteredClients.length}</strong> clientes.</p>
              <Button onClick={startCampaign} disabled={isSending || activeCampaignId !== null} className="w-full">
                {(isSending || activeCampaignId) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {activeCampaignId ? 'Campaña en Progreso...' : isSending ? 'Iniciando...' : 'Iniciar Campaña'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Historial de Campañas ({campaigns.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Campaña</TableHead><TableHead>Fecha</TableHead><TableHead>Audiencia</TableHead><TableHead>Estado</TableHead><TableHead>Plantilla</TableHead></TableRow></TableHeader>
            <TableBody>
              {campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((campaign) => (
                <TableRow key={campaign.$id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{new Date(campaign.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{campaign.audienceCount} clientes</TableCell>
                  <TableCell><Badge variant={campaign.status === 'sent' ? 'default' : campaign.status === 'pending' ? 'secondary' : 'destructive'}>{campaign.status}</Badge></TableCell>
                  <TableCell>{templates.find(t => t.$id === campaign.templateId)?.name || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}