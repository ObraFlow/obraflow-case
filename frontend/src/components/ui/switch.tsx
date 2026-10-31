import { cn } from '@/lib/utils';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { forwardRef } from 'react';

export const Switch = forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-4 w-[26px] shrink-0 cursor-pointer items-center rounded-full bg-border-strong transition-colors focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary sm:h-5 sm:w-[34px]',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-3 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-3 sm:size-4 sm:data-[state=checked]:translate-x-4" />
  </SwitchPrimitive.Root>
));
Switch.displayName = 'Switch';
