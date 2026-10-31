import { Button } from '@/components/ui/button';
import { useTheme } from '@/providers/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema" title="Alternar tema">
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
