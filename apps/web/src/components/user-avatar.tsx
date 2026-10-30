import { cn } from '@/lib/utils';

const TONES = {
  /** Persona selecionada em "Visualizando como". */
  viewer: 'bg-primary text-primary-foreground border-transparent',
  neutral: 'bg-muted text-muted-foreground border-border',
} as const;

const SIZES = {
  sm: 'size-[22px] text-[9px]',
  md: 'size-7 text-[11px]',
} as const;

interface UserAvatarProps {
  initials: string;
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Círculo com as iniciais do usuário ("JR"). */
export function UserAvatar({
  initials,
  tone = 'neutral',
  size = 'sm',
  className,
}: UserAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-full border font-bold',
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
