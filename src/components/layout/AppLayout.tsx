import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNavigation from './BottomNavigation';

const AppLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      {/* Cabecera principal (Desktop) */}
      <Header />

      {/* Contenido principal de la página */}
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
        {/* Outlet renderiza el componente de la ruta activa (Dashboard, Agenda, etc.) */}
        <Outlet />
      </main>

      {/* Navegación inferior (Móvil) */}
      <BottomNavigation />
    </div>
  );
};

export default AppLayout;