// import { Suspense, lazy } from 'react'; // <-- Mantenemos comentado
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import AuthForm from './components/AuthForm';
import { useUser } from './hooks/useAuth';
import LoadingSpinner from './components/LoadingSpinner'; // Verificado
import AppLayout from './components/layout/AppLayout'; // Verificado

// --- Importamos Dashboard directamente ---
import Dashboard from '@/pages/Dashboard'; // Verificado
// Comentamos las otras importaciones lazy por ahora
// import Agenda from '@/pages/Agenda'; // etc.
import Configuracion from '@/pages/Configuracion'; // Mantenemos esta si es necesaria directa
import NotFound from '@/pages/NotFound'; // Mantenemos esta si es necesaria directa


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

  // Define las rutas protegidas (SIN Suspense)
  const ProtectedRoutes = (
    <AppLayout>
      {/* <Suspense fallback={<LoadingSpinner />}> */}
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Comentamos las otras rutas lazy temporalmente */}
          {/* <Route path="/agenda" element={<Agenda />} /> */}
          {/* <Route path="/clientes" element={<Clientes />} /> */}
          {/* ... */}
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      {/* </Suspense> */}
    </AppLayout>
  );

  // Define las rutas públicas (SIN Suspense)
  const PublicRoutes = (
    // <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<AuthForm />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    // </Suspense>
  );

  return (
    <Router>
      {isLoggedIn ? ProtectedRoutes : PublicRoutes}
      <Toaster />
    </Router>
  );
}

export default App;