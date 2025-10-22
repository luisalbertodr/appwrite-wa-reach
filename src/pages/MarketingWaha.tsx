import { useState, useEffect } from 'react';
import { CampaignsTab } from '@/components/CampaignsTab';
import { Settings, LogOut } from 'lucide-react';
import AuthForm from '@/components/AuthForm';
import { account } from '../lib/appwrite';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const MarketingWaha = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user);
      } catch (error) {
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      setCurrentUser(null);
      alert('Sesión cerrada correctamente');
    } catch (error: any) {
      alert('Error al cerrar sesión: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  if (!currentUser) {
    return <AuthForm onLoginSuccess={setCurrentUser} />;
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
          <div className="flex items-center gap-4">
            <Link to="/configuracion">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuración y Clientes
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <CampaignsTab />
      </div>
    </div>
  );
};

export default MarketingWaha;
