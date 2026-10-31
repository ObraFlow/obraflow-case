import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export function Label({
  className,
  required,
  optional,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean; optional?: boolean }) {
  return (
    <label className={cn('text-[12.5px] font-medium text-foreground', className)} {...props}>
      {children}
      {required && <span className="text-danger"> *</span>}
      {optional && <span className="font-normal text-subtle-foreground"> (opcional)</span>}
    </label>
  );
}

/** Mensagem de erro de campo (role=alert, com ícone). */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
      <AlertCircle className="size-3.5 shrink-0" />
      {message}
    </p>
  );
}
