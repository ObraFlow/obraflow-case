import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[88px] w-full resize-y rounded-md border border-input bg-card px-2.5 py-2 text-sm text-foreground placeholder:text-subtle-foreground transition-[border-color,box-shadow] hover:border-border-strong focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-focus disabled:cursor-not-allowed disabled:bg-muted aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-focus-danger',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
