import { useState, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
// --- MODIFICACIÓN ---
// Importamos 'useUser' de 'useAuth'
import { useUser } from '@/hooks/useAuth';
// --- FIN MODIFICACIÓN ---
import { AppLayout } from '@/components/layout/AppLayout';
import AuthForm from '@/components/AuthForm';
import LoadingSpinner from '@/components/LoadingSpinner';

// Lazy loading de las páginas
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Empleados = lazy(() => import('./pages/Empleados'));
const Articulos = lazy(() => import('./pages/Articulos'));
const Facturacion = lazy(() => import('./pages/Facturacion'));
const TPV = lazy(() => import('./pages/TPV'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const Marketing = lazy(() => import('./pages/Marketing'));
const MarketingWaha = lazy(() => import('./pages/MarketingWaha'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  // Obtenemos el usuario y el estado de carga
  const { data: user, isLoading: loading } = useUser();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // 'useNavigate' SÍ funciona aquí porque <App> está dentro de <Router> (en main.tsx)
  const navigate = useNavigate();

  // 1. Pantalla de carga mientras se verifica el usuario
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // 2. Si no hay usuario, mostrar el formulario de login
  if (!user) {
    return <AuthForm />;
  }

  // 3. Si hay usuario, mostrar la aplicación completa
  return (
    <AppLayout 
      isSidebarOpen={isSidebarOpen} 
      setIsSidebarOpen={setIsSidebarOpen} 
      onNavigate={navigate}
      currentUser={user}
    >
      {/* Usamos Suspense para las rutas con lazy loading */}
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Redirigir la ruta raíz / a /dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/facturacion" element={<Facturacion />} />
          <Route path="/agenda" element={<Agenda />} />
          
          {/* Rutas de Marketing anidadas */}
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/marketing/waha" element={<MarketingWaha />} /> 
          
          <Route path="/tpv" element={<TPV />} />
          <Route path="/articulos" element={<Articulos />} />
          <Route path="/empleados" element={<Empleados />} />
          <Route path="/configuracion" element={<Configuracion />} />
          
          {/* Página no encontrada */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

export default App;