import { Dialog as Primitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { DialogClose, DialogOverlay, DialogPortal } from "./dialog";
import styles from "./Drawer.module.css";

export {
  Dialog as Drawer,
  DialogTrigger as DrawerTrigger,
  DialogTitle as DrawerTitle,
  DialogDescription as DrawerDescription,
} from "./dialog";

export function DrawerContent({
  children,
  className,
  closeLabel = "Fechar detalhes",
  ...props
}: Primitive.Popup.Props & { closeLabel?: string }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <Primitive.Popup {...props} className={cn(styles.drawer, className)}>
        {children}
        <DialogClose
          render={<Button variant="ghost" size="icon-sm" className={styles.close} />}
          aria-label={closeLabel}
        >
          <X aria-hidden="true" />
        </DialogClose>
      </Primitive.Popup>
    </DialogPortal>
  );
}
