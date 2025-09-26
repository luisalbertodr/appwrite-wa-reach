import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientsTab } from '@/components/ClientsTab';
import { CampaignsTab } from '@/components/CampaignsTab';
import { ConfigTab } from '@/components/ConfigTab';
import { Users, Send, Settings } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">CRM y Marketing WhatsApp</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona clientes y campañas de WhatsApp con segmentación avanzada
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="clientes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="campanas" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Campañas
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes">
            <ClientsTab />
          </TabsContent>

          <TabsContent value="campanas">
            <CampaignsTab />
          </TabsContent>

          <TabsContent value="config">
            <ConfigTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
