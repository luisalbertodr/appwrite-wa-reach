import { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import AuthForm from './components/AuthForm';
import { useUser } from './hooks/useAuth';
import LoadingSpinner from './components/LoadingSpinner';
import AppLayout from './components/layout/AppLayout'; // <-- 1. IMPORTAR LAYOUT

// --- Carga diferida (Lazy Loading) para las páginas de Lipoout ---
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Agenda = lazy(() => import('@/pages/Agenda'));
const Clientes = lazy(() => import('@/pages/Clientes'));
const Articulos = lazy(() => import('@/pages/Articulos'));
const Empleados = lazy(() => import('@/pages/Empleados'));
const TPV = lazy(() => import('@/pages/TPV'));
const Facturacion = lazy(() => import('@/pages/Facturacion'));
const Marketing = lazy(() => import('@/pages/Marketing'));
const Configuracion = lazy(() => import('@/pages/Configuracion'));
const NotFound = lazy(() => import('@/pages/NotFound'));

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

  // Define las rutas protegidas, AHORA ENVUELTAS EN AppLayout
  const ProtectedRoutes = (
    <AppLayout> {/* <-- 2. ENVOLVER RUTAS */}
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/articulos" element={<Articulos />} />
          <Route path="/empleados" element={<Empleados />} />
          <Route path="/tpv" element={<TPV />} />
          <Route path="/facturacion" element={<Facturacion />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );

  // Define las rutas públicas
  const PublicRoutes = (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<AuthForm />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Suspense>
  );

  return (
    <Router>
      {isLoggedIn ? ProtectedRoutes : PublicRoutes}
      <Toaster />
    </Router>
  );
}

export default App;