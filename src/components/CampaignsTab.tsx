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
import { Send, Filter, Download, Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CLIENTS_COLLECTION_ID, TEMPLATES_COLLECTION_ID, CAMPAIGNS_COLLECTION_ID, CONFIG_COLLECTION_ID, client, databases, DATABASE_ID, MESSAGE_LOGS_COLLECTION_ID } from '@/lib/appwrite';
import { Functions, Query } from 'appwrite';
import Papa from 'papaparse';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

const functions = new Functions(client);

interface Progress {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
}

const FILTERS_STORAGE_KEY_CAMPAIGNS = 'campaign-filters';

export function CampaignsTab() {
  const { data: clients, loading: loadingClients, applyQueries: applyClientQueries } = useAppwriteCollection<Client>(CLIENTS_COLLECTION_ID, FILTERS_STORAGE_KEY_CAMPAIGNS);
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
  const [selectedClients, setSelectedClients] = useState<Map<string, Client>>(new Map());

  const wahaConfig = useMemo<WahaConfig | null>(() => (configs.length > 0 ? configs[0] : null), [configs]);

  useEffect(() => {
    const savedFiltersJSON = localStorage.getItem(FILTERS_STORAGE_KEY_CAMPAIGNS + '_values');
    if (savedFiltersJSON) {
        const savedFilters = JSON.parse(savedFiltersJSON);
        setFilters(savedFilters);
    }
  }, []);
  
  useEffect(() => {
    reloadTemplates();
    reloadCampaigns();
  }, [reloadTemplates, reloadCampaigns]);

  const handleApplyFilters = () => {
    const newQueries: string[] = [];
    if (filters.nombreApellido) newQueries.push(Query.search('nomcli', filters.nombreApellido));
    if (filters.email) newQueries.push(Query.search('email', filters.email));
    if (filters.codcli) newQueries.push(Query.equal('codcli', filters.codcli));
    if (filters.dnicli) newQueries.push(Query.equal('dnicli', filters.dnicli));
    if (filters.telefono) newQueries.push(Query.search('tel2cli', filters.telefono));
    if (filters.sexo !== 'all') newQueries.push(Query.equal('sexo', filters.sexo));
    if (filters.edadMin) newQueries.push(Query.greaterThanEqual('edad', parseInt(filters.edadMin)));
    if (filters.edadMax) newQueries.push(Query.lessThanEqual('edad', parseInt(filters.edadMax)));
    if (filters.facturacionMin) newQueries.push(Query.greaterThanEqual('facturacion', parseFloat(filters.facturacionMin)));
    if (filters.facturacionMax) newQueries.push(Query.lessThanEqual('facturacion', parseFloat(filters.facturacionMax)));
    if (filters.intereses) {
        const interests = filters.intereses.split(',').map(i => i.trim());
        newQueries.push(Query.equal('intereses', interests));
    }

    if (newQueries.length > 0) {
        localStorage.setItem(FILTERS_STORAGE_KEY_CAMPAIGNS + '_values', JSON.stringify(filters));
        applyClientQueries(newQueries);
    } else {
        toast({title: "Aplica al menos un filtro", variant: "destructive"})
    }
  };
  
  useEffect(() => {
    if (!activeCampaignId) return;
    const interval = setInterval(async () => {
      try {
        const response = await databases.listDocuments(
          DATABASE_ID, MESSAGE_LOGS_COLLECTION_ID,
          [Query.equal('campaignId', activeCampaignId), Query.limit(5000)]
        );
        const sent = response.documents.filter(d => d.status === 'sent').length;
        const failed = response.documents.filter(d => d.status === 'failed').length;
        const skipped = response.documents.filter(d => d.status === 'skipped').length;
        setProgress(prev => ({ ...prev, sent, failed, skipped }));
        if (sent + failed + skipped >= progress.total) {
          toast({ title: 'Campaña Completada' });
          setActiveCampaignId(null);
        }
      } catch (error) { clearInterval(interval); }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeCampaignId, progress.total, toast]);

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.message) return;
    try {
      await createTemplate(newTemplate);
      setNewTemplate({ name: '', message: '' });
      toast({ title: 'Plantilla creada' });
      reloadTemplates();
    } catch(e) { toast({ title: 'Error al crear plantilla', variant: 'destructive' }); }
  };
  
  const getTemplateContent = (templateId: string) => {
    return templates.find(t => t.$id === templateId)?.message || 'Selecciona una plantilla...';
  };
  
  const handleSelectClient = (client: Client, isSelected: boolean) => {
    setSelectedClients(prev => {
      const newMap = new Map(prev);
      if (isSelected) newMap.set(client.$id!, client);
      else newMap.delete(client.$id!);
      return newMap;
    });
  };

  const handleSelectAll = (isSelected: boolean) => {
    const newMap = new Map<string, Client>();
    if (isSelected) {
        clients.forEach(client => newMap.set(client.$id!, client));
    }
    setSelectedClients(newMap);
  };
  
  const areAllFilteredSelected = clients.length > 0 && clients.every(client => selectedClients.has(client.$id!));

  const startCampaign = async () => {
    const selectedTemplate = templates.find(t => t.$id === selectedTemplateId);
    const finalAudience = Array.from(selectedClients.values());

    if (!selectedTemplate || finalAudience.length === 0 || !wahaConfig) {
      toast({ title: 'Error', description: 'Selecciona una plantilla y al menos un cliente.', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const campaignDoc = await createCampaign({
        name: `Campaña: ${selectedTemplate.name}`, templateId: selectedTemplateId,
        status: 'pending', audienceCount: finalAudience.length, createdAt: new Date().toISOString()
      });
      const campaignId = campaignDoc.$id;
      setActiveCampaignId(campaignId);
      setProgress({ sent: 0, failed: 0, skipped: 0, total: finalAudience.length });
      
      toast({ title: 'Iniciando Campaña...', description: `Enviando a ${finalAudience.length} clientes.` });
      
      await functions.createExecution(
        'sendWhatsAppFunction',
        JSON.stringify({
          clients: finalAudience, template: selectedTemplate,
          config: wahaConfig, campaignId: campaignId,
        }),
        true
      );
      
      reloadCampaigns();

    } catch (error) {
      toast({ title: 'Error al Iniciar Campaña', description: (error as Error).message, variant: 'destructive' });
      setIsSending(false);
    }
  };

  const handleExport = () => {
    const audience = Array.from(selectedClients.values());
    if (audience.length === 0) return;
    const csv = Papa.unparse(audience.map(c => ({...c, intereses: c.intereses?.join(',')})));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `seleccion_clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'Exportación completada' });
  };
  
  if (loadingTemplates || loadingCampaigns) return <div className="p-6">Cargando...</div>;

  const processedCount = progress.sent + progress.failed + progress.skipped;
  const progressPercentage = progress.total > 0 ? (processedCount / progress.total) * 100 : 0;
  
  return (
    <div className="space-y-6">
      {activeCampaignId && (
        <Card className="border-primary">
          <CardHeader><CardTitle>Progreso de la Campaña en Curso</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Progress value={progressPercentage} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{`Procesados: ${processedCount} de ${progress.total}`}</span>
              <div className="flex gap-4">
                <span>Éxitos: {progress.sent}</span><span>Fallos: {progress.failed}</span><span>Saltados: {progress.skipped}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5" />Segmentación de Audiencia</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nombre o Apellido</Label><Input value={filters.nombreApellido} onChange={(e) => setFilters({ ...filters, nombreApellido: e.target.value })}/></div>
                <div><Label>Email</Label><Input type="email" value={filters.email} onChange={(e) => setFilters({ ...filters, email: e.target.value })}/></div>
                <div><Label>Cód. Cliente</Label><Input value={filters.codcli} onChange={(e) => setFilters({ ...filters, codcli: e.target.value })}/></div>
                <div><Label>DNI/NIE</Label><Input value={filters.dnicli} onChange={(e) => setFilters({ ...filters, dnicli: e.target.value })}/></div>
                <div><Label>Teléfono</Label><Input type="tel" value={filters.telefono} onChange={(e) => setFilters({ ...filters, telefono: e.target.value })}/></div>
                <div><Label>Sexo</Label><Select value={filters.sexo} onValueChange={(value) => setFilters({ ...filters, sexo: value })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="H">Hombre</SelectItem><SelectItem value="M">Mujer</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select></div>
              </div>
              <Button onClick={handleApplyFilters} className="w-full"><Search className="w-4 h-4 mr-2" />Aplicar Filtros</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Previsualización y Selección ({clients.length} visibles, {selectedClients.size} seleccionados)</CardTitle></CardHeader>
            <CardContent>
               <Button variant="outline" onClick={handleExport} disabled={selectedClients.size === 0} className="w-full mb-4"><Download className="w-4 h-4 mr-2" />Exportar Selección</Button>
               <ScrollArea className="h-72 w-full rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead><Checkbox checked={areAllFilteredSelected} onCheckedChange={(c) => handleSelectAll(Boolean(c))}/></TableHead><TableHead>Cód.</TableHead><TableHead>Nombre</TableHead><TableHead>Teléfono</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {loadingClients ? <TableRow><TableCell colSpan={4} className="text-center">Cargando...</TableCell></TableRow> :
                    clients.length > 0 ? (
                      clients.map((client) => (
                        <TableRow key={client.$id} data-state={selectedClients.has(client.$id!) && 'selected'}>
                          <TableCell><Checkbox checked={selectedClients.has(client.$id!)} onCheckedChange={(c) => handleSelectClient(client, Boolean(c))}/></TableCell>
                          <TableCell>{client.codcli}</TableCell><TableCell>{client.nomcli}</TableCell><TableCell>{client.tel2cli}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={4} className="text-center">No hay clientes que coincidan. Aplica un filtro.</TableCell></TableRow>
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
              <div><Label>Nombre</Label><Input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}/></div>
              <div><Label>Mensaje</Label><Textarea value={newTemplate.message} onChange={(e) => setNewTemplate({ ...newTemplate, message: e.target.value })} placeholder="Hola [nombre]..."/></div>
              <Button onClick={handleCreateTemplate} className="w-full">Guardar Plantilla</Button>
              <hr />
              <Label>Seleccionar Plantilla Existente</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{templates.map((t) => (<SelectItem key={t.$id} value={t.$id!}>{t.name}</SelectItem>))}</SelectContent></Select>
              <div className="text-sm p-2 border rounded bg-muted break-words whitespace-pre-wrap">{getTemplateContent(selectedTemplateId)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Iniciar Campaña</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Se enviará a los <strong className="text-primary">{selectedClients.size}</strong> clientes seleccionados.</p>
              <Button onClick={startCampaign} disabled={isSending || !!activeCampaignId || selectedClients.size === 0} className="w-full">
                {(isSending || activeCampaignId) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {activeCampaignId ? 'En Progreso...' : isSending ? 'Iniciando...' : 'Iniciar Campaña'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Historial de Campañas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Campaña</TableHead><TableHead>Fecha</TableHead><TableHead>Audiencia</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
            <TableBody>
              {campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((campaign) => (
                <TableRow key={campaign.$id}>
                  <TableCell>{campaign.name}</TableCell>
                  <TableCell>{new Date(campaign.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{campaign.audienceCount}</TableCell>
                  <TableCell><Badge>{campaign.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}