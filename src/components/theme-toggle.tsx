import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Button
          variant={theme === 'light' ? 'default' : 'outline'}
          size="lg"
          className="flex-1"
          onClick={() => setTheme('light')}
        >
          <Sun className="w-5 h-5 mr-2" />
          Claro
        </Button>
        <Button
          variant={theme === 'dark' ? 'default' : 'outline'}
          size="lg"
          className="flex-1"
          onClick={() => setTheme('dark')}
        >
          <Moon className="w-5 h-5 mr-2" />
          Oscuro
        </Button>
        <Button
          variant={theme === 'system' ? 'default' : 'outline'}
          size="lg"
          className="flex-1"
          onClick={() => setTheme('system')}
        >
          <Monitor className="w-5 h-5 mr-2" />
          Sistema
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Selecciona el tema de tu preferencia. El modo "Sistema" se adapta automáticamente a las preferencias de tu dispositivo.
      </p>
    </div>
  );
}
