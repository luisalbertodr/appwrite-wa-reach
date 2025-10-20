import React, { Suspense } from 'react'; // Importar Suspense
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import AuthForm from './components/AuthForm';
import { useUser } from './hooks/useAuth';
import LoadingSpinner from './components/LoadingSpinner';
import AppLayout from './components/layout/AppLayout';

// --- Usamos React.lazy para Code Splitting ---
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Clientes = React.lazy(() => import('@/pages/Clientes'));
const Articulos = React.lazy(() => import('@/pages/Articulos'));
const Empleados = React.lazy(() => import('@/pages/Empleados'));
const Marketing = React.lazy(() => import('@/pages/Marketing'));
const Configuracion = React.lazy(() => import('@/pages/Configuracion'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));
const Agenda = React.lazy(() => import('@/pages/Agenda'));
const TPV = React.lazy(() => import('@/pages/TPV'));
const Facturacion = React.lazy(() => import('@/pages/Facturacion'));


// Componente de fallback para Suspense
const PageLoadingFallback = () => (
  <div className="flex justify-center items-center h-[calc(100vh-120px)]">
    <LoadingSpinner />
  </div>
);


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

  // --- ProtectedRoutes con rutas anidadas y Suspense ---
  const ProtectedRoutes = (
    <Suspense fallback={<PageLoadingFallback />}> {/* Fallback para lazy loading */}
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
    </Suspense>
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