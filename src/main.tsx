import React from 'react'
import ReactDOM from 'react-dom/client'
// --- MODIFICACIÓN ---
// 1. Importar el Router (BrowserRouter)
import { BrowserRouter as Router } from 'react-router-dom';
// --- FIN MODIFICACIÓN ---
import App from './App.tsx'
import './index.css'
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* --- MODIFICACIÓN --- */}
      {/* 2. Envolver App con el Router */}
      <Router>
        <App />
        <Toaster richColors />
      </Router>
      {/* --- FIN MODIFICACIÓN --- */}
    </QueryClientProvider>
  </React.StrictMode>,
)