import { useState, useMemo, useEffect, ChangeEvent, useCallback } from 'react';
import { useGetClientes, useUpdateCliente } from '@/hooks/useClientes';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
// Aseguramos importar todos los tipos necesarios desde index.ts
import { Cliente, Template, Campaign, WahaConfig, LipooutUserInput, MessageLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Filter, Download, Loader2, Search, ImagePlus, Save, Edit, FileText, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  TEMPLATES_COLLECTION_ID,
  CAMPAIGNS_COLLECTION_ID,
  WAHA_CONFIG_COLLECTION_ID,
  client,
  databases,
  DATABASE_ID,
  MESSAGE_LOGS_COLLECTION_ID,
  storage,
  IMPORT_BUCKET_ID,
  CAMPAIGN_PROGRESS_COLLECTION_ID,
  // CLIENTES_COLLECTION_ID ya no se usa directamente aquí
} from '@/lib/appwrite';
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
const CAMPAIGN_TIMEOUT_MS = 3600000;

const statusTranslations: { [key: string]: string } = { /* ... sin cambios ... */ };

// Definimos el tipo para el estado de la plantilla
type TemplateInput = LipooutUserInput<Template>;

const initialTemplateState: TemplateInput = {
   name: '', messages: ['', '', '', ''], imageUrls: ['', '', '', '']
};


const Marketing = () => {
  const [filters, setFilters] = useState({ /* ... sin cambios ... */ });
  const [searchQuery, setSearchQuery] = useState("");
  const { data: clientesData, isLoading: loadingClients, refetch: reloadClients } = useGetClientes(searchQuery);
  const { mutateAsync: updateClientMutation } = useUpdateCliente();
  const clientes: Cliente[] = clientesData || [];
  const total = clientes.length;

  const { data: templates, create: createTemplate, update: updateTemplate, loading: loadingTemplates, reload: reloadTemplates } = useAppwriteCollection<Template>(TEMPLATES_COLLECTION_ID);
  const { data: campaigns, create: createCampaign, update: updateCampaign, loading: loadingCampaigns, reload: reloadCampaigns } = useAppwriteCollection<Campaign>(CAMPAIGNS_COLLECTION_ID);
  const { data: configs } = useAppwriteCollection<WahaConfig>(WAHA_CONFIG_COLLECTION_ID);
  const { toast } = useToast();

  // Usamos el tipo TemplateInput para el estado
  const [newTemplate, setNewTemplate] = useState<TemplateInput>(initialTemplateState);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({ sent: 0, failed: 0, skipped: 0, total: 0 });
  const [selectedClients, setSelectedClients] = useState<Map<string, Cliente>>(new Map());

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [editingClient, setEditingClient] = useState<(Cliente & Models.Document) | null>(null);

  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress | null>(null);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [logContent, setLogContent] = useState<Models.Document[]>([]);

  const wahaConfig = useMemo<WahaConfig | null>(() => (configs.length > 0 ? configs[0] : null), [configs]);

  const translateStatus = (status: string) => statusTranslations[status] || status;

  const estimatedDuration = useMemo(() => { /* ... sin cambios ... */ }, [wahaConfig, selectedClients.size]);
  const handleApplyFilters = useCallback(() => { /* ... sin cambios ... */ }, [filters]);

  useEffect(() => { /* ... sin cambios ... */ }, []);
  useEffect(() => { /* ... sin cambios ... */ }, []);
  useEffect(() => { /* ... sin cambios ... */ }, [reloadTemplates, reloadCampaigns]);
  useEffect(() => { /* ... sin cambios ... */ }, [activeCampaignId, progress.total, toast, reloadCampaigns]);


  const handleSaveTemplate = async () => {
    // El estado 'newTemplate' ya es del tipo correcto (TemplateInput)
    const finalTemplate: TemplateInput = {
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
      setNewTemplate(initialTemplateState); // Reiniciar al estado inicial
      setSelectedTemplateId('');
      reloadTemplates();
    } catch(e) { toast({ title: 'Error al guardar plantilla', variant: 'destructive' }); }
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.$id === templateId);
    if (template) {
      setSelectedTemplateId(template.$id!);
      // Mapeamos los campos del documento al tipo Input para el estado
      setNewTemplate({
        name: template.name,
        messages: [...template.messages, '', '', '', ''].slice(0, 4),
        imageUrls: [...template.imageUrls, '', '', '', ''].slice(0, 4),
      });
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, index: number) => { /* ... sin cambios ... */ };
  const handleSelectClient = (client: Cliente, isSelected: boolean) => { /* ... sin cambios ... */ };
  const handleSelectAll = (isSelected: boolean) => { /* ... sin cambios ... */ };
  const areAllFilteredSelected = clientes.length > 0 && clientes.every(client => selectedClients.has(client.$id!));

  const startCampaign = async () => {
     const selectedTemplate = templates.find(t => t.$id === selectedTemplateId);
     const finalAudience = Array.from(selectedClients.values());

     if (!selectedTemplate || finalAudience.length === 0 || !wahaConfig) {
       toast({ title: 'Error', description: 'Selecciona una plantilla y al menos un cliente.', variant: 'destructive' });
       return;
     }

     setIsSending(true);
     try {
       // El tipo para createCampaign es LipooutUserInput<Campaign>
       const campaignInput: LipooutUserInput<Campaign> = {
          name: `Campaña: ${selectedTemplate.name}`,
          templateId: selectedTemplateId,
          status: scheduledDate && scheduledTime ? 'scheduled' : 'pending',
          audienceCount: finalAudience.length,
          createdAt: new Date().toISOString(), // createdAt no debería ir aquí si Appwrite lo genera
          scheduledDate: scheduledDate || undefined, // Usar undefined si está vacío
          scheduledTime: scheduledTime || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          // filters?: // Añadir si se implementa
       };

       // Quitamos createdAt si lo genera Appwrite automáticamente
       // delete campaignInput.createdAt;

       const campaignDoc = await createCampaign(campaignInput);
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
       setIsSending(false); // Asegurar que se resetea en caso de error
       setActiveCampaignId(null); // Reseteamos ID si falla la creación/ejecución
     }
  };


  const forceFailCampaign = useCallback(async (campaignId: string) => { /* ... sin cambios ... */ }, [updateCampaign, reloadCampaigns, toast]);
  const handleExport = () => { /* ... sin cambios ... */ };
  const handleShowCampaignLog = async (campaignId: string) => { /* ... sin cambios ... */ };


  const handleUpdateClient = async () => {
    if (!editingClient) return;

    // Usamos el tipo UpdateClienteInput (Partial<LipooutUserInput<Cliente>>)
    const clientToUpdate: Partial<LipooutUserInput<Cliente>> = {
      // Mapeamos los campos del estado 'editingClient' al tipo input
      nomcli: editingClient.nomcli,
      ape1cli: editingClient.ape1cli,
      email: editingClient.email,
      dnicli: editingClient.dnicli,
      tel1cli: editingClient.tel1cli,
      tel2cli: editingClient.tel2cli,
      dircli: editingClient.dircli,
      codposcli: editingClient.codposcli,
      pobcli: editingClient.pobcli,
      procli: editingClient.procli,
      fecnac: editingClient.fecnac,
      fecalta: editingClient.fecalta,
      sexo: editingClient.sexo,
      facturacion: editingClient.facturacion,
      intereses: editingClient.intereses,
      // Calculamos nombre_completo y edad aquí si es necesario
      nombre_completo: `${editingClient.nomcli || ''} ${editingClient.ape1cli || ''}`.trim(),
      edad: calculateAge(editingClient.fecnac || ''),
    };

    try {
      await updateClientMutation({ $id: editingClient.$id, data: clientToUpdate });
      toast({ title: 'Cliente actualizado' });
      setEditingClient(null);
      // reloadClients(); // No es necesario, invalidateQueries lo hace
    } catch (error) {
      toast({ title: 'Error al actualizar el cliente', variant: 'destructive' });
    }
  };


  if (loadingTemplates || loadingCampaigns) return <div className="p-6">Cargando...</div>;

  const processedCount = progress.sent + progress.failed + progress.skipped;
  const progressPercentage = progress.total > 0 ? (processedCount / progress.total) * 100 : 0;

  // --- Renderizado JSX ---
  return (
    <div className="space-y-6">
      {/* Encabezado */}
       <div className="mb-6">
         <h1 className="text-3xl font-bold">Marketing (WhatsApp)</h1>
         <p className="text-muted-foreground">Creación y envío de campañas.</p>
       </div>
       {/* Progreso Campaña */}
       {activeCampaignId && ( <Card className="border-primary"> {/* ... */} </Card> )}
       {/* Grid Principal */}
       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
           {/* Columna Izquierda (Filtros) */}
           <div className="space-y-6"> <Card> {/* ... */} </Card> </div>
           {/* Columna Derecha (Tabla Clientes) */}
           <div className="space-y-6"> <Card> {/* ... */} </Card> </div>
       </div>
       {/* Grid Secundario */}
       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Columna Izquierda (Plantillas) */}
            <div className="space-y-6"> <Card> {/* ... */} </Card> </div>
            {/* Columna Derecha (Iniciar Campaña) */}
            <div className="space-y-6"> <Card> {/* ... */} </Card> </div>
       </div>
       {/* Historial Campañas */}
       <Card> {/* ... */} </Card>

      {/* --- Diálogo Editar Cliente (Corregido Typo 'g') --- */}
      {editingClient && (
        <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Editar Cliente: {editingClient.codcli}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {/* ... Inputs ... */}
              <div><Label>Nombre</Label><Input value={editingClient.nomcli || ''} onChange={(e) => setEditingClient({ ...editingClient, nomcli: e.target.value })}/></div>
              <div><Label>Primer Apellido</Label><Input value={editingClient.ape1cli || ''} onChange={(e) => setEditingClient({ ...editingClient, ape1cli: e.target.value })}/></div>
              <div><Label>Email</Label><Input type="email" value={editingClient.email || ''} onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}/></div>
              {/* Corregido el typo aquí */}
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

      {/* --- Diálogo Log Campaña (Corregido Type Casting) --- */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log de la Campaña</DialogTitle>
            <DialogDescription>
              Aquí puedes ver el detalle de los envíos de la campaña.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Hora</TableHead> {/* Simplificado */}
                  <TableHead>Estado</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logContent.map(log => {
                  // Hacemos cast al tipo MessageLog definido en index.ts
                  const messageLog = log as MessageLog;
                  return (
                    <TableRow key={messageLog.$id}>
                      <TableCell>{messageLog.clientId}</TableCell>
                      <TableCell>{messageLog.clientName || 'N/A'}</TableCell>
                      <TableCell>{new Date(messageLog.timestamp).toLocaleTimeString()}</TableCell>
                      <TableCell>{messageLog.status}</TableCell>
                      <TableCell>{messageLog.error}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setShowLogDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Marketing;
