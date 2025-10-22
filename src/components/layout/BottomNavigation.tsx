import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, Archive, ShoppingCart, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/articulos', label: 'Artículos', icon: Archive },
  { href: '/tpv', label: 'TPV', icon: ShoppingCart },
  { href: '/facturacion', label: 'Facturas', icon: BarChart3 },
  { href: '/configuracion', label: 'Ajustes', icon: Settings },
];

export const BottomNavigation = () => {
  const location = useLocation();

  return (
    // MODIFICACIÓN: Se eliminó la clase "md:hidden"
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-inner">
      <div className="flex justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-full text-xs font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              )}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};