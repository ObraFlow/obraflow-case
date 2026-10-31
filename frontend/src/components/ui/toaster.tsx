import { useTheme } from '@/providers/ThemeProvider';
import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'rounded-lg border border-border bg-card text-foreground shadow-overlay text-sm',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
        },
      }}
    />
  );
}
