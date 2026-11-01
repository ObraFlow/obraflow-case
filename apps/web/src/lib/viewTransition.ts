import { flushSync } from "react-dom";
import { prefersReducedMotion } from "./media";

/**
 * Runs a state update and, where the browser supports view transitions and the person has not asked for less
 * motion, animates the change between the old and new screen. Elsewhere the update simply applies.
 */
export function withViewTransition(update: () => void) {
  if (!document.startViewTransition || prefersReducedMotion()) update();
  else document.startViewTransition(() => flushSync(update));
}
