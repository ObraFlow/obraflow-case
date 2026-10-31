import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

const inputClass =
  'flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground placeholder:text-subtle-foreground transition-[border-color,box-shadow] hover:border-border-strong focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-focus disabled:cursor-not-allowed disabled:bg-muted disabled:text-subtle-foreground aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-focus-danger';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputClass, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export { inputClass };
