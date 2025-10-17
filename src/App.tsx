import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Index from '@/pages/Index';
import Configuracion from '@/pages/Configuracion';
import NotFound from '@/pages/NotFound';
import { Toaster } from '@/components/ui/toaster';
import AuthForm from './components/AuthForm';
import { useUser } from './hooks/useAuth'; // <-- MODIFICADO

function App() {
  // Obtenemos el usuario y el estado de carga desde TanStack Query
  const { data: user, isLoading } = useUser();

  // Derivamos el estado de isLoggedIn basado en si tenemos 'user'
  const isLoggedIn = !!user;

  // Muestra un mensaje de carga mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div>Cargando...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <AuthForm />} />
        <Route path="/" element={isLoggedIn ? <Index /> : <Navigate to="/login" />} />
        <Route path="/configuracion" element={isLoggedIn ? <Configuracion /> : <Navigate to="/login" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;