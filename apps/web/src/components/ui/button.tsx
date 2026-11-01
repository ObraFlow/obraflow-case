import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "ui-button group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors motion-reduce:transition-none select-none disabled:pointer-events-none aria-invalid:border-error [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground focus-visible:outline-current enabled:hover:bg-[var(--primary-hover)] enabled:active:bg-[var(--primary-pressed)]",
        save: "bg-action-save text-accent-foreground focus-visible:outline-current enabled:hover:bg-[var(--action-save-hover)] enabled:active:bg-[var(--action-save-pressed)]",
        approve:
          "bg-approve-action text-[var(--approve-action-foreground)] focus-visible:outline-current enabled:hover:bg-[var(--approve-action-hover)] enabled:active:bg-[var(--approve-action-pressed)]",
        outline:
          "border-input bg-card text-foreground enabled:hover:bg-muted enabled:active:bg-secondary aria-expanded:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground enabled:hover:bg-muted enabled:active:bg-background aria-expanded:bg-secondary",
        ghost: "text-foreground enabled:hover:bg-muted enabled:active:bg-secondary aria-expanded:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground focus-visible:outline-current enabled:hover:bg-[var(--destructive-hover)] enabled:active:bg-[var(--destructive-pressed)]",
        link: "text-link underline-offset-4 enabled:hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
