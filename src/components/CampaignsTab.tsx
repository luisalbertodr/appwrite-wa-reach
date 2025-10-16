import { useState, useMemo, useEffect, ChangeEvent, useCallback } from 'react';
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
import { Send, Filter, Download, Loader2, Search, ImagePlus, Save, Edit, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CLIENTS_COLLECTION_ID, TEMPLATES_COLLECTION_ID, CAMPAIGNS_COLLECTION_ID, CONFIG_COLLECTION_ID, client, databases, DATABASE_ID, MESSAGE_LOGS_COLLECTION_ID, storage, IMPORT_BUCKET_ID, CAMPAIGN_PROGRESS_COLLECTION_ID } from '@/lib/appwrite';
import { Functions, Query, ID, Models } from 'appwrite';
import Papa from 'papaparse';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { calculateAge } from '@/lib/validators';

const functions = new Functions(client);

interface Progress {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
}

interface CampaignProgress extends Models.Document {
    currentClientName: string;
    currentClientPhone: string;
}

const FILTERS_STORAGE_KEY_CAMPAIGNS = 'campaign-filters';

export function CampaignsTab() {
  const { data: clients, total, loading: loadingClients, applyQueries: applyClientQueries, update: updateClient, reload: reloadClients } = useAppwriteCollection<Client>(CLIENTS_COLLECTION_ID, FILTERS_STORAGE_KEY_CAMPAIGNS, true);
  const { data: templates, create: createTemplate, update: updateTemplate, loading: loadingTemplates, reload: reloadTemplates } = useAppwriteCollection<Template>(TEMPLATES_COLLECTION_ID);
  const { data: campaigns, create: createCampaign, loading: loadingCampaigns, reload: reloadCampaigns } = useAppwriteCollection<Campaign>(CAMPAIGNS_COLLECTION_ID);
  const { data: configs } = useAppwriteCollection<WahaConfig>(CONFIG_COLLECTION_ID);
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    nombreApellido: '', email: '', codcli: '', dnicli: '', telefono: '', sexo: 'all',
    edadMin: '', edadMax: '', facturacionMin: '', facturacionMax: '', intereses: '',
    codposcli: '', pobcli: '', procli: '', codcliMin: '', codcliMax: ''
  });

  const [newTemplate, setNewTemplate] = useState<Omit<Template, '$id'>>({ name: '', messages: ['', '', '', ''], imageUrls: ['', '', '', ''] });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({ sent: 0, failed: 0, skipped: 0, total: 0 });
  const [selectedClients, setSelectedClients] = useState<Map<string, Client>>(new Map());

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [editingClient, setEditingClient] = useState<(Client & Models.Document) | null>(null);
  
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress | null>(null);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [logContent, setLogContent] = useState<Models.Document[]>([]);

  const wahaConfig = useMemo<WahaConfig | null>(() => (configs.length > 0 ? configs[0] : null), [configs]);

  const estimatedDuration = useMemo(() => {
    if (!wahaConfig || selectedClients.size === 0) return 'N/A';
    const avgDelay = ((wahaConfig.minDelayMs || 2000) + (wahaConfig.maxDelayMs || 5000)) / 2;
    const avgBatchSize = ((wahaConfig.batchSizeMin || 15) + (wahaConfig.batchSizeMax || 25)) / 2;
    const avgBatchDelay = ((wahaConfig.batchDelayMsMin || 60000) + (wahaConfig.batchDelayMsMax || 120000)) / 2;
    const totalDuration = selectedClients.size * avgDelay + Math.floor(selectedClients.size / avgBatchSize) * avgBatchDelay;
    const hours = Math.floor(totalDuration / 3600000);
    const minutes = Math.floor((totalDuration % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }, [wahaConfig, selectedClients.size]);

  const handleApplyFilters = useCallback(() => {
    const newQueries: string[] = [];
    if (filters.nombreApellido) {
        const searchWords = filters.nombreApellido.split(' ').filter(word => word.length > 0);
        if (searchWords.length > 0) {
            const searchConditions = searchWords.map(word => Query.search('nombre_completo', word));
            newQueries.push(...searchConditions);
        }
    }
    if (filters.email) newQueries.push(Query.search('email', filters.email));
    if (filters.codcli) newQueries.push(Query.equal('codcli', filters.codcli.padStart(6, '0')));
    if (filters.codcliMin) newQueries.push(Query.greaterThanEqual('codcli', filters.codcliMin.padStart(6, '0')));
    if (filters.codcliMax) newQueries.push(Query.lessThanEqual('codcli', filters.codcliMax.padStart(6, '0')));
    if (filters.dnicli) newQueries.push(Query.search('dnicli', filters.dnicli));
    if (filters.telefono) newQueries.push(Query.search('tel2cli', filters.telefono));
    if (filters.sexo !== 'all') newQueries.push(Query.equal('sexo', filters.sexo));
    if (filters.edadMin) newQueries.push(Query.greaterThanEqual('edad', parseInt(filters.edadMin, 10)));
    if (filters.edadMax) newQueries.push(Query.lessThanEqual('edad', parseInt(filters.edadMax, 10)));
    if (filters.facturacionMin) newQueries.push(Query.greaterThanEqual('facturacion', parseFloat(filters.facturacionMin)));
    if (filters.facturacionMax) newQueries.push(Query.lessThanEqual('facturacion', parseFloat(filters.facturacionMax)));
    if (filters.intereses) {
        const interests = filters.intereses.split(',').map(i => i.trim());
        newQueries.push(Query.search('intereses', interests.join(' ')));
    }
    if(filters.codposcli) newQueries.push(Query.search('codposcli', filters.codposcli));
    if(filters.pobcli) newQueries.push(Query.search('pobcli', filters.pobcli));
    if(filters.procli) newQueries.push(Query.search('procli', filters.procli));

    localStorage.setItem(FILTERS_STORAGE_KEY_CAMPAIGNS + '_values', JSON.stringify(filters));
    applyClientQueries(newQueries);
  }, [filters, applyClientQueries]);

  useEffect(() => {
    const savedFiltersJSON = localStorage.getItem(FILTERS_STORAGE_KEY_CAMPAIGNS + '_values');
    if (savedFiltersJSON) {
        const savedFilters = JSON.parse(savedFiltersJSON);
        setFilters(savedFilters);
    }
    handleApplyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    const checkForActiveCampaigns = async () => {
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          CAMPAIGNS_COLLECTION_ID,
          [Query.equal('status', 'sending'), Query.limit(1)]
        );
        if (response.documents.length > 0) {
          const activeCampaign = response.documents[0] as Campaign & Models.Document;
          setActiveCampaignId(activeCampaign.$id);
          setProgress(prev => ({ ...prev, total: activeCampaign.audienceCount }));
        }
      } catch (error) {
        console.error("Error checking for active campaigns:", error);
      }
    };
    checkForActiveCampaigns();
  }, []);

  useEffect(() => {
    reloadTemplates();
    reloadCampaigns();
  }, [reloadTemplates, reloadCampaigns]);

  useEffect(() => {
    if (!activeCampaignId) return;

    const unsubscribeProgress = client.subscribe(`databases.${DATABASE_ID}.collections.${CAMPAIGN_PROGRESS_COLLECTION_ID}.documents.${activeCampaignId}`, response => {
        setCampaignProgress(response.payload as CampaignProgress);
    });

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
          setCampaignProgress(null);
        }
      } catch (error) { clearInterval(interval); }
    }, 5000);

    return () => {
        clearInterval(interval);
        unsubscribeProgress();
    };
  }, [activeCampaignId, progress.total, toast]);

  const handleSaveTemplate = async () => {
    const finalTemplate = {
      ...newTemplate,
      messages: newTemplate.messages.filter(m => m.trim() !== ''),
      imageUrls: newTemplate.imageUrls.filter(u => u.trim() !== '')
    };

    if (!finalTemplate.name || (finalTemplate.messages.length === 0 && finalTemplate.imageUrls.length === 0)) {
      toast({ title: 'Error', description: 'La plantilla debe tener un nombre y al menos un mensaje o imagen.', variant: 'destructive'});
      return;
    }

    try {
      if (selectedTemplateId) {
        await updateTemplate(selectedTemplateId, finalTemplate);
        toast({ title: 'Plantilla actualizada' });
      } else {
        await createTemplate(finalTemplate);
        toast({ title: 'Plantilla creada' });
      }
      setNewTemplate({ name: '', messages: ['', '', '', ''], imageUrls: ['', '', '', ''] });
      setSelectedTemplateId('');
      reloadTemplates();
    } catch(e) { toast({ title: 'Error al guardar plantilla', variant: 'destructive' }); }
  };
  
  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.$id === templateId);
    if (template) {
      setSelectedTemplateId(template.$id!);
      setNewTemplate({
        name: template.name,
        messages: [...template.messages, '', '', '', ''].slice(0, 4), // Asegura que siempre haya 4 campos
        imageUrls: [...template.imageUrls, '', '', '', ''].slice(0, 4), // Asegura que siempre haya 4 campos
      });
    }
  };
  
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await storage.createFile(IMPORT_BUCKET_ID, ID.unique(), file);
      const url = `${import.meta.env.VITE_APPWRITE_PUBLIC_ENDPOINT}/storage/buckets/${IMPORT_BUCKET_ID}/files/${response.$id}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`;
      const newImageUrls = [...newTemplate.imageUrls];
      newImageUrls[index] = url;
      setNewTemplate({ ...newTemplate, imageUrls: newImageUrls });
      toast({ title: 'Imagen subida' });
    } catch (error) {
      toast({ title: 'Error al subir imagen', variant: 'destructive' });
    }
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
        status: scheduledDate && scheduledTime ? 'scheduled' : 'pending',
        audienceCount: finalAudience.length, createdAt: new Date().toISOString(),
        scheduledDate, scheduledTime, startTime, endTime
      });
      const campaignId = campaignDoc.$id;
      setActiveCampaignId(campaignId);
      setProgress({ sent: 0, failed: 0, skipped: 0, total: finalAudience.length });

      toast({ title: 'Iniciando Campaña...', description: `Enviando a ${finalAudience.length} clientes.` });

      await functions.createExecution(
        'sendWhatsAppFunction',
        JSON.stringify({
          clients: finalAudience, 
          template: selectedTemplate,
          config: wahaConfig, 
          campaignId: campaignId,
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
    
  const handleShowCampaignLog = async (campaignId: string) => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            MESSAGE_LOGS_COLLECTION_ID,
            [Query.equal('campaignId', campaignId), Query.limit(5000)]
        );
        setLogContent(response.documents);
        setShowLogDialog(true);

    } catch (error) {
        toast({ title: 'Error al descargar el log', variant: 'destructive' });
    }
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;

    const clientToUpdate: Partial<Client> = {
        ...editingClient,
        nombre_completo: `${editingClient.nomcli || ''} ${editingClient.ape1cli || ''}`.trim(),
        edad: calculateAge(editingClient.fecnac || ''),
    };

    const { $id, $collectionId, $databaseId, $createdAt, $updatedAt, $permissions, ...rest } = clientToUpdate as any;

    try {
        await updateClient(editingClient.$id, rest);
        toast({ title: 'Cliente actualizado' });
        setEditingClient(null);
        reloadClients();
    } catch (error) {
        toast({ title: 'Error al actualizar el cliente', variant: 'destructive' });
    }
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
              {campaignProgress && (
                <span>Enviando a: {campaignProgress.currentClientName} ({campaignProgress.currentClientPhone})</span>
              )}
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
                <div><Label>Cód. Cliente (Desde)</Label><Input value={filters.codcliMin} onChange={(e) => setFilters({ ...filters, codcliMin: e.target.value })}/></div>
                <div><Label>Cód. Cliente (Hasta)</Label><Input value={filters.codcliMax} onChange={(e) => setFilters({ ...filters, codcliMax: e.target.value })}/></div>
                <div><Label>DNI/NIE</Label><Input value={filters.dnicli} onChange={(e) => setFilters({ ...filters, dnicli: e.target.value })}/></div>
                <div><Label>Teléfono</Label><Input type="tel" value={filters.telefono} onChange={(e) => setFilters({ ...filters, telefono: e.target.value })}/></div>
                <div><Label>Sexo</Label><Select value={filters.sexo} onValueChange={(value) => setFilters({ ...filters, sexo: value })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="H">Hombre</SelectItem><SelectItem value="M">Mujer</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select></div>
                <div><Label>Edad (Mín)</Label><Input type="number" value={filters.edadMin} onChange={(e) => setFilters({ ...filters, edadMin: e.target.value })}/></div>
                <div><Label>Edad (Máx)</Label><Input type="number" value={filters.edadMax} onChange={(e) => setFilters({ ...filters, edadMax: e.target.value })}/></div>
                <div><Label>Facturación (Mín)</Label><Input type="number" value={filters.facturacionMin} onChange={(e) => setFilters({ ...filters, facturacionMin: e.target.value })}/></div>
                <div><Label>Facturación (Máx)</Label><Input type="number" value={filters.facturacionMax} onChange={(e) => setFilters({ ...filters, facturacionMax: e.target.value })}/></div>
                <div><Label>Código Postal</Label><Input value={filters.codposcli} onChange={(e) => setFilters({ ...filters, codposcli: e.target.value })}/></div>
                <div><Label>Población</Label><Input value={filters.pobcli} onChange={(e) => setFilters({ ...filters, pobcli: e.target.value })}/></div>
                <div><Label>Provincia</Label><Input value={filters.procli} onChange={(e) => setFilters({ ...filters, procli: e.target.value })}/></div>
                <div><Label>Intereses</Label><Input value={filters.intereses} onChange={(e) => setFilters({ ...filters, intereses: e.target.value })}/></div>
              </div>
              <Button onClick={handleApplyFilters} className="w-full"><Search className="w-4 h-4 mr-2" />Aplicar Filtros</Button>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Previsualización y Selección ({total} visibles, {selectedClients.size} seleccionados)</CardTitle></CardHeader>
            <CardContent>
               <Button variant="outline" onClick={handleExport} disabled={clients.length === 0} className="w-full mb-4"><Download className="w-4 h-4 mr-2" />Exportar Selección</Button>
               <ScrollArea className="h-72 w-full rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead><Checkbox checked={areAllFilteredSelected} onCheckedChange={(c) => handleSelectAll(Boolean(c))}/></TableHead><TableHead>Cód.</TableHead><TableHead>Nombre Completo</TableHead><TableHead>Teléfono</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {loadingClients ? <TableRow><TableCell colSpan={5} className="text-center">Cargando...</TableCell></TableRow> :
                    clients.length > 0 ? (
                      clients.map((client) => (
                        <TableRow key={client.$id} data-state={selectedClients.has(client.$id!) && 'selected'}>
                          <TableCell><Checkbox checked={selectedClients.has(client.$id!)} onCheckedChange={(c) => handleSelectClient(client, Boolean(c))}/></TableCell>
                          <TableCell>{client.codcli}</TableCell><TableCell>{client.nombre_completo}</TableCell><TableCell>{client.tel2cli}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => setEditingClient(client as Client & Models.Document)}>
                                <Edit className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="text-center">No hay clientes que coincidan. Aplica un filtro.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
        <Card>
            <CardHeader><CardTitle>Plantillas de Mensaje</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Cargar Plantilla Existente</Label>
                <Select onValueChange={handleLoadTemplate}>
                  <SelectTrigger className="w-1/2"><SelectValue /></SelectTrigger>
                  <SelectContent>{templates.map((t) => (<SelectItem key={t.$id} value={t.$id!}>{t.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Nombre de la Plantilla</Label><Input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}/></div>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <Textarea value={newTemplate.messages[i] || ''} onChange={(e) => {
                    const newMessages = [...newTemplate.messages];
                    newMessages[i] = e.target.value;
                    setNewTemplate({ ...newTemplate, messages: newMessages });
                  }} placeholder={`Hola [nombre], este es el mensaje ${i+1}`}/>
                </div>
              ))}
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                <p className="text-sm text-amber-800">
                  ⚠️ <strong>Requisito importante para URLs de imágenes:</strong> Las URLs deben apuntar directamente a archivos JPEG (.jpg o .jpeg).
                  WAHA no convierte automáticamente otros formatos de imagen.
                </p>
              </div>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={newTemplate.imageUrls[i] || ''} onChange={(e) => {
                    const newImageUrls = [...newTemplate.imageUrls];
                    newImageUrls[i] = e.target.value;
                    setNewTemplate({ ...newTemplate, imageUrls: newImageUrls });
                  }} placeholder={`URL de la Imagen ${i+1} (.jpg/.jpeg)`}/>
                  <Label htmlFor={`image-upload-${i}`} className="cursor-pointer"><ImagePlus className="w-6 h-6" /></Label>
                  <Input id={`image-upload-${i}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, i)} />
                </div>
              ))}
              <Button onClick={handleSaveTemplate} className="w-full"><Save className="w-4 h-4 mr-2" />{selectedTemplateId ? 'Actualizar Plantilla' : 'Guardar Nueva Plantilla'}</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Iniciar Campaña</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div><Label>Fecha de inicio</Label><Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></div>
                    <div><Label>Hora de inicio</Label><Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>Horas hábiles (desde)</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
                    <div><Label>Horas hábiles (hasta)</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
                </div>
              <p className="text-sm text-muted-foreground">Se enviará a los <strong className="text-primary">{selectedClients.size}</strong> clientes seleccionados.</p>
              <p className="text-sm text-muted-foreground">Duración estimada: <strong className="text-primary">{estimatedDuration}</strong></p>
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
            <TableHeader><TableRow><TableHead>Campaña</TableHead><TableHead>Fecha</TableHead><TableHead>Audiencia</TableHead><TableHead>Estado</TableHead><TableHead>Log</TableHead></TableRow></TableHeader>
            <TableBody>
              {campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((campaign) => (
                <TableRow key={campaign.$id}>
                  <TableCell>{campaign.name}</TableCell>
                  <TableCell>{new Date(campaign.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{campaign.audienceCount}</TableCell>
                  <TableCell><Badge>{campaign.status}</Badge></TableCell>
                    <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleShowCampaignLog(campaign.$id!)}>
                            <FileText className="w-4 h-4" />
                        </Button>
                    </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {editingClient && (
        <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Editar Cliente: {editingClient.codcli}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <div><Label>Nombre</Label><Input value={editingClient.nomcli || ''} onChange={(e) => setEditingClient({ ...editingClient, nomcli: e.target.value })}/></div>
                    <div><Label>Primer Apellido</Label><Input value={editingClient.ape1cli || ''} onChange={(e) => setEditingClient({ ...editingClient, ape1cli: e.target.value })}/></div>
                    <div><Label>Email</Label><Input type="email" value={editingClient.email || ''} onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}/></div>
                    <div><Label>DNI/NIE</Label><Input value={editingClient.dnicli || ''} onChange={(e) => setEditingClient({ ...editingClient, dnicli: e.target.value })}/></div>
                    <div><Label>Teléfono 1</Label><Input value={editingClient.tel1cli || ''} onChange={(e) => setEditingClient({ ...editingClient, tel1cli: e.target.value })} /></div>
                    <div><Label>Teléfono 2 (Móvil)</Label><Input value={editingClient.tel2cli || ''} onChange={(e) => setEditingClient({ ...editingClient, tel2cli: e.target.value })}/></div>
                    <div><Label>Dirección</Label><Input value={editingClient.dircli || ''} onChange={(e) => setEditingClient({ ...editingClient, dircli: e.target.value })} /></div>
                    <div><Label>Código Postal</Label><Input value={editingClient.codposcli || ''} onChange={(e) => setEditingClient({ ...editingClient, codposcli: e.target.value })} /></div>
                    <div><Label>Población</Label><Input value={editingClient.pobcli || ''} onChange={(e) => setEditingClient({ ...editingClient, pobcli: e.target.value })} /></div>
                    <div><Label>Provincia</Label><Input value={editingClient.procli || ''} onChange={(e) => setEditingClient({ ...editingClient, procli: e.target.value })} /></div>
                    <div><Label>Fecha Nacimiento</Label><Input type="date" value={editingClient.fecnac ? new Date(editingClient.fecnac).toISOString().split('T')[0] : ''} onChange={(e) => setEditingClient({ ...editingClient, fecnac: e.target.value })}/></div>
                    <div><Label>Fecha Alta</Label><Input type="date" value={editingClient.fecalta ? new Date(editingClient.fecalta).toISOString().split('T')[0] : ''} onChange={(e) => setEditingClient({ ...editingClient, fecalta: e.target.value })} /></div>
                    <div><Label>Sexo</Label><Select value={editingClient.sexo || 'Otro'} onValueChange={(v) => setEditingClient({ ...editingClient, sexo: v as 'H'|'M'|'Otro'})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="H">Hombre</SelectItem><SelectItem value="M">Mujer</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select></div>
                    <div><Label>Facturación</Label><Input type="number" step="0.01" value={editingClient.facturacion || 0} onChange={(e) => setEditingClient({ ...editingClient, facturacion: parseFloat(e.target.value) || 0 })}/></div>
                    <div><Label>Intereses (separados por comas)</Label><Input value={editingClient.intereses?.join(', ') || ''} onChange={(e) => setEditingClient({ ...editingClient, intereses: e.target.value.split(',').map(i => i.trim()) })} /></div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                    <Button type="button" onClick={handleUpdateClient}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle>Log de la Campaña</DialogTitle>
                  <DialogDescription>
                    Aquí puedes ver el detalle de los envíos de la campaña.
                  </DialogDescription>
              </DialogHeader>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Cliente ID</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Hora de Envío</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Error</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {logContent.map(log => (
                          <TableRow key={log.$id}>
                              <TableCell>{log.clientId}</TableCell>
                              <TableCell>{log.clientName}</TableCell>
                              <TableCell>{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                              <TableCell>{log.status}</TableCell>
                              <TableCell>{log.error}</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
              <DialogFooter>
                  <Button onClick={() => setShowLogDialog(false)}>Cerrar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

    </div>
  );
}