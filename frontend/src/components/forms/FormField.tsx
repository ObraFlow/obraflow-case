'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  required,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  const errorId = React.useId();
  const hintId = React.useId();

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
        <span className="mb-1.5 block">
          {label}
          {required && <span className="text-danger-500 ml-1" aria-hidden="true">*</span>}
        </span>
        <div aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`}>
          {children}
        </div>
      </label>
      {error && (
        <p id={errorId} className="text-sm text-danger-600 dark:text-danger-400" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-sm text-neutral-500 dark:text-neutral-400">
          {hint}
        </p>
      )}
    </div>
  );
}