import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Crear una instancia de QueryClient
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  // Envolver la App con el Provider
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
