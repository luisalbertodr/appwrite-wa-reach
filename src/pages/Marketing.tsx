import { useState, useEffect } from 'react';
import { useGetClientes, useUpdateCliente } from '@/hooks/useClientes';
import { useAppwriteCollection } from '@/hooks/useAppwrite';
// Aseguramos importar todos los tipos necesarios desde index.ts
import { Cliente, Template, Campaign, WahaConfig, LipooutUserInput, MessageLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  TEMPLATES_COLLECTION_ID,
  CAMPAIGNS_COLLECTION_ID,
  WAHA_CONFIG_COLLECTION_ID,
  // CLIENTES_COLLECTION_ID ya no se usa directamente aquí
} from '@/lib/appwrite';
import { Models } from 'appwrite';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { calculateAge } from '@/lib/validators'; // Asumimos que calculateAge está en validators


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



// Definimos el tipo para el estado de la plantilla
type TemplateInput = LipooutUserInput<Template>;

const initialTemplateState: TemplateInput = {
   name: '', messages: ['', '', '', ''], imageUrls: ['', '', '', '']
};


const Marketing = () => {
  const [_filters, _setFilters] = useState({ edadMin: '', edadMax: '', facturacionMin: '', facturacionMax: '', intereses: '', sexo: '' });
  const [searchQuery, setSearchQuery] = useState("");
  const { data: clientesData } = useGetClientes(searchQuery);
  const { mutateAsync: updateClientMutation } = useUpdateCliente();

  const { loading: loadingTemplates, reload: reloadTemplates } = useAppwriteCollection<Template>(TEMPLATES_COLLECTION_ID);
  const { loading: loadingCampaigns, reload: reloadCampaigns } = useAppwriteCollection<Campaign>(CAMPAIGNS_COLLECTION_ID);
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




  useEffect(() => { /* ... Lógica existente ... */ }, []);
  useEffect(() => { /* ... Lógica existente ... */ }, []);
  useEffect(() => { /* ... Lógica existente ... */ }, [reloadTemplates, reloadCampaigns]);
  useEffect(() => { /* ... Lógica existente ... */ }, [activeCampaignId, progress.total, toast, reloadCampaigns]);









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


  // --- Renderizado JSX ---
  return (
    <div className="space-y-6">
      {/* Encabezado */}
       <div className="mb-6">
         <h1 className="text-3xl font-bold">Marketing (WhatsApp)</h1>
         <p className="text-muted-foreground">Creación y envío de campañas.</p>
       </div>
       {/* Progreso Campaña */}
       {activeCampaignId && ( <Card className="border-primary"> {/* ... Renderizado progreso ... */} </Card> )}
       {/* Grid Principal */}
       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
           {/* Columna Izquierda (Filtros) */}
           <div className="space-y-6"> <Card> {/* ... Renderizado filtros ... */} </Card> </div>
           {/* Columna Derecha (Tabla Clientes) */}
           <div className="space-y-6"> <Card> {/* ... Renderizado tabla clientes ... */} </Card> </div>
       </div>
       {/* Grid Secundario */}
       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Columna Izquierda (Plantillas) */}
            <div className="space-y-6"> <Card> {/* ... Renderizado plantillas ... */} </Card> </div>
            {/* Columna Derecha (Iniciar Campaña) */}
            <div className="space-y-6"> <Card> {/* ... Renderizado iniciar campaña ... */} </Card> </div>
       </div>
       {/* Historial Campañas */}
       <Card> {/* ... Renderizado historial ... */} </Card>

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
              {/* --- CORRECCIÓN --- */}
              <div><Label>DNI/NIE</Label><Input value={editingClient.dnicli || ''} onChange={(e) => setEditingClient({ ...editingClient, dnicli: e.target.value })}/></div>
              {/* ------------------ */}
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
                  const messageLog = log as unknown as MessageLog;
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
