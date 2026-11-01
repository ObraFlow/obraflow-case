import { prefersReducedMotion } from "@/lib/media";
import { useEffect, useRef, type RefObject } from "react";

/**
 * Fades out the row of a member whose removal was just confirmed. Skipped under reduced motion. The row keeps
 * its final opacity until React removes it, and the animation is cancelled if the page goes away first.
 */
export function useRemovalAnimation(list: RefObject<HTMLElement | null>) {
  const animation = useRef<Animation | null>(null);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      animation.current?.cancel();
    };
  }, []);
  return async function fadeOut(userId: string) {
    const row = list.current?.querySelector<HTMLElement>(`[data-member-id="${userId}"]`);
    if (!row || prefersReducedMotion()) return;
    const fade = row.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-out", fill: "forwards" });
    animation.current = fade;
    await fade.finished.catch(() => undefined);
    if (live.current && row.isConnected) row.style.opacity = "0";
    fade.cancel();
    animation.current = null;
  };
}
