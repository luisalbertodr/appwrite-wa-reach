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
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 px-4 py-3 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-black/10">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                'group relative flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-200',
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
              )}
            >
              <item.icon className="w-6 h-6 transition-transform duration-200 group-hover:scale-110" />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium bg-gray-900/90 dark:bg-gray-100/90 text-white dark:text-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
