import React from 'react'; // Asegurarse de que React esté importado
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import AuthForm from './components/AuthForm';
import { useUser } from './hooks/useAuth';
import LoadingSpinner from './components/LoadingSpinner';
import AppLayout from './components/layout/AppLayout';

// --- Mantenemos importación directa por ahora ---
import Dashboard from '@/pages/Dashboard';
import Clientes from '@/pages/Clientes'; // Importamos más para probar
import Articulos from '@/pages/Articulos';
import Empleados from '@/pages/Empleados';
import Marketing from '@/pages/Marketing';
import Configuracion from '@/pages/Configuracion';
import NotFound from '@/pages/NotFound';
import Agenda from '@/pages/Agenda'; // Placeholder
import TPV from '@/pages/TPV';       // Placeholder
import Facturacion from '@/pages/Facturacion'; // Placeholder


function App() {
  const { data: user, isLoading } = useUser();
  const isLoggedIn = !!user;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // --- ProtectedRoutes con rutas anidadas (Outlet pattern) ---
  const ProtectedRoutes = (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/articulos" element={<Articulos />} />
        <Route path="/empleados" element={<Empleados />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/tpv" element={<TPV />} />
        <Route path="/facturacion" element={<Facturacion />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );

  const PublicRoutes = (
      <Routes>
        <Route path="/login" element={<AuthForm />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
  );

  return (
    <Router>
      {isLoggedIn ? ProtectedRoutes : PublicRoutes}
      <Toaster />
    </Router>
  );
}

export default App;
