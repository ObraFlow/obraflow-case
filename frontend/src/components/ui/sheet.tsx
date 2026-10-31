import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef } from "react";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

export const SheetContent = forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content> & {
    hideClose?: boolean;
  }
>(({ className, children, hideClose, ...props }, ref) => (
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
    <Dialog.Content
      ref={ref}
      className={cn(
        // mobile: bottom sheet
        "fixed inset-x-0 bottom-0 top-9 z-50 flex flex-col overflow-hidden rounded-t-sheet border-t bg-card shadow-overlay outline-none data-[state=open]:animate-sheet-up",
        // desktop: side drawer
        "sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:w-drawer sm:max-w-full sm:rounded-none sm:border-l sm:border-t-0 sm:data-[state=open]:animate-sheet-in",
        className,
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <Dialog.Close className="absolute right-4 top-3.5 grid size-7 place-items-center rounded-md text-subtle-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:shadow-focus">
          <X className="size-4" />
          <span className="sr-only">Fechar</span>
        </Dialog.Close>
      )}
    </Dialog.Content>
  </Dialog.Portal>
));
SheetContent.displayName = "SheetContent";

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shrink-0 border-b px-5 py-3.5 pr-12", className)}
      {...props}
    />
  );
}
export function SheetBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}
export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shrink-0 space-y-2.5 border-t px-5 pb-4 pt-3", className)}
      {...props}
    />
  );
}
