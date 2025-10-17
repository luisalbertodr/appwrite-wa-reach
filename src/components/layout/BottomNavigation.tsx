import { NavLink } from 'react-router-dom';
import { Home, Calendar, Scan, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Lista de enlaces de navegación
const navLinks = [
  { to: '/dashboard', icon: Home, label: 'Inicio' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/tpv', icon: Scan, label: 'TPV' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/marketing', icon: BarChart3, label: 'Marketing' },
];

const BottomNavigation = () => {
  const activeClass = 'text-primary';
  const inactiveClass = 'text-muted-foreground';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background p-2 md:hidden">
      <div className="grid grid-cols-5 gap-2">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center rounded-md p-2 hover:bg-accent',
                isActive ? activeClass : inactiveClass
              )
            }
          >
            <link.icon className="h-6 w-6" />
            <span className="text-xs mt-1">{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;