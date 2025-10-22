import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Calendar, 
  Megaphone, 
  // --- MODIFICACIÓN ---
  // Icono para WhatsApp
  MessageSquare 
  // --- FIN MODIFICACIÓN ---
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- MODIFICACIÓN ---
// Definimos los links aquí, incluyendo el nuevo de WhatsApp
const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/facturacion', icon: DollarSign, label: 'Facturas' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/marketing', icon: Megaphone, label: 'Marketing' },
  { to: '/marketing/waha', icon: MessageSquare, label: 'WhatsApp' },
];
// --- FIN MODIFICACIÓN ---


const NavLinkItem = ({ to, icon: Icon, label }: typeof links[0]) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));

  return (
    <NavLink
      to={to}
      className={cn(
        "flex flex-col items-center justify-center h-12 w-16 rounded-lg text-muted-foreground transition-colors",
        isActive ? "text-primary bg-primary/10" : "hover:bg-accent"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium mt-1">{label}</span>
    </NavLink>
  );
};

export const BottomNavigation = () => {
  return (
    // --- MODIFICACIÓN DE ESTILO ---
    // Aplicamos el estilo flotante, centrado, con blur y transparencia (estilo macOS)
    <nav className={cn(
      "fixed bottom-4 inset-x-0 max-w-[95%] sm:max-w-md mx-auto", // Posición flotante y centrada
      "bg-background/80 backdrop-blur-lg", // Transparencia y blur
      "border rounded-full shadow-lg", // Estilo macOS (bordes redondeados, sombra)
      "p-2 md:hidden z-50" // Oculto en escritorio, padding
    )}>
      <div className="flex justify-around items-center">
        {links.map((link) => (
          <NavLinkItem 
            key={link.to} 
            to={link.to} 
            icon={link.icon} 
            label={link.label} 
          />
        ))}
      </div>
    </nav>
    // --- FIN MODIFICACIÓN DE ESTILO ---
  );
};