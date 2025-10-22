import React, { Suspense, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import AuthForm from './components/AuthForm';
import { useUser } from './hooks/useAuth';
import LoadingSpinner from './components/LoadingSpinner';
import AppLayout from './components/layout/AppLayout';

// Lazy loading para optimización
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
const MarketingWaha = React.lazy(() => import('@/pages/MarketingWaha'));

function App() {
  const { data: user, isLoading } = useUser();
  const [, setCurrentUser] = useState<any>(null);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <>
        <AuthForm onLoginSuccess={setCurrentUser} />
        <Toaster />
      </>
    );
  }

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Rutas con AppLayout (nuevas funcionalidades Lipoout) */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/articulos" element={<Articulos />} />
            <Route path="/empleados" element={<Empleados />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/tpv" element={<TPV />} />
            <Route path="/facturacion" element={<Facturacion />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Route>
          
          {/* Ruta sin AppLayout - Funcionalidad original de main (Marketing WhatsApp) */}
          <Route path="/marketing-waha" element={<MarketingWaha />} />
          
          {/* Ruta 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster />
    </Router>
  );
}

export default App;
