import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientsTab } from '@/components/ClientsTab';
import { CampaignsTab } from '@/components/CampaignsTab';
import { ConfigTab } from '@/components/ConfigTab';
import { Users, Send, Settings, LogOut } from 'lucide-react';
import AuthForm from '@/components/AuthForm';
import { account, client } from '../lib/appwrite';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const Index = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await account.get();
        console.log('Current user after account.get():', user); // Log user object
        setCurrentUser(user);
        // Redirection will now be handled by AuthForm directly after successful login
      } catch (error) {
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser(); // Check user on component mount

    // Removed subscription as AuthForm will handle direct navigation
  }, []); // Empty dependency array to run only once on mount

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      setCurrentUser(null);
      alert('Logged out successfully!');
    } catch (error: any) {
      alert('Error logging out: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!currentUser) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">CRM y Marketing WhatsApp</h1>
            <p className="text-muted-foreground mt-2">
              Gestiona clientes y campañas de WhatsApp con segmentación avanzada
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
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
