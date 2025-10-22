import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import LoadingSpinner from './components/LoadingSpinner';

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

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <HashRouter>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <LoadingSpinner />
            </div>
          }
        >
          <Routes>
            {/* === RUTAS LIPOUT (CON LAYOUT) === */}
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="empleados" element={<Empleados />} />
              <Route path="articulos" element={<Articulos />} />
              <Route path="facturacion" element={<Facturacion />} />
              <Route path="tpv" element={<TPV />} />
              <Route path="configuracion" element={<Configuracion />} />
              <Route path="marketing" element={<Marketing />} />
              
              {/* MODIFICACIÓN: Ruta "/marketing-waha" movida aquí dentro */}
              <Route path="marketing-waha" element={<MarketingWaha />} />

              {/* Ruta 404 para las páginas dentro del layout */}
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* === RUTA WAHA (SIN LAYOUT) === */}
            {/* MODIFICACIÓN: La ruta de arriba fue movida */}
            
            {/* Rutas 404 fuera del layout (aunque ahora todas están dentro) */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </QueryClientProvider>
  );
};

export default App;