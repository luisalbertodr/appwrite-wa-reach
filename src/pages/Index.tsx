import { CampaignsTab } from '@/components/CampaignsTab';
import { Settings, LogOut } from 'lucide-react';
// AuthForm ya no es necesario aquí
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLogout } from '@/hooks/useAuth'; // <-- MODIFICADO

const Index = () => {
  // Ya no necesitamos currentUser, loading o useEffect.
  // App.tsx garantiza que esta página solo se renderiza si el usuario está logueado.

  // Usamos el hook de mutación para el logout
  const { mutate: logoutUser, isPending: isLoggingOut } = useLogout();

  const handleLogout = () => {
    logoutUser();
  };

  // El estado de carga (loading) y el chequeo de currentUser
  // han sido eliminados porque App.tsx ya los maneja.

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
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={isLoggingOut} // Deshabilitar mientras cierra sesión
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? "Cerrando..." : "Cerrar Sesión"}
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

export default Index;