import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Index from '@/pages/Index';
import Configuracion from '@/pages/Configuracion';
import NotFound from '@/pages/NotFound';
import { Toaster } from '@/components/ui/toaster';
import { account } from '@/lib/appwrite';
import AuthForm from './components/AuthForm';
import { AppwriteException } from 'appwrite';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Estado para controlar la carga inicial

  useEffect(() => {
    const checkSession = async () => {
      try {
        await account.get();
        setIsLoggedIn(true);
      } catch (e) {
        if (e instanceof AppwriteException && e.code !== 401) {
          console.error("Error checking session:", e);
        }
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false); // Finaliza la carga después de verificar
      }
    };
    checkSession();
  }, []);

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