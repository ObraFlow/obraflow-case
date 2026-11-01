import { cn } from "@/lib/utils";
import styles from "./Brand.module.css";

/** The icon is a generated placeholder (docs/brand/README.md), shared with the browser metadata. */
export function Brand({ large = false, textClassName }: { large?: boolean; textClassName?: string }) {
  return (
    <span className={cn(styles.brand, large && styles.large)} data-brand>
      <img src="/brand/dokimos-icon.svg" width={large ? 64 : 32} height={large ? 64 : 32} alt="" aria-hidden="true" />
      <span className={cn(styles.text, textClassName)} data-brand-text>
        <span className={styles.name}>Dokimos</span> <span className={styles.attribution}>by ObraFlow</span>
      </span>
    </span>
  );
}
