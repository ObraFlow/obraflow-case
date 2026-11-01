import { REDUCED_MOTION_QUERY, prefersReducedMotion } from "@/lib/media";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";

type NameSwap = { from: number; to: number | null; pointerId: number | null; point?: { x: number; y: number } };

/**
 * Swapping two approvers of the ladder by moving their name handles, with the pointer or the keyboard.
 * The hook owns the gesture, its announcements and the animation of the two names trading places; the
 * caller owns the ladder and applies the swap in `onSwap`. Names are found in `nameRow` by their
 * `data-person-section` / `data-person-identity` attributes.
 */
export function useNameSwap({
  approvers,
  nameRow,
  nameOf,
  onSwap,
}: {
  approvers: string[];
  nameRow: RefObject<HTMLDivElement | null>;
  nameOf: (id: string) => string;
  onSwap: (from: number, to: number) => void;
}) {
  const swapRef = useRef<NameSwap | null>(null);
  const positions = useRef<Map<string, DOMRect> | null>(null);
  const animations = useRef<Animation[]>([]);
  const [swap, setSwap] = useState<NameSwap | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // After a swap renders, animate each moved name from where it was to where it is now.
  useLayoutEffect(() => {
    const previous = positions.current;
    positions.current = null;
    if (!previous || prefersReducedMotion()) return;
    const started: Animation[] = [];
    nameRow.current?.querySelectorAll<HTMLElement>("[data-person-identity]").forEach((element) => {
      const from = previous.get(element.dataset.personIdentity!);
      if (!from) return;
      const to = element.getBoundingClientRect();
      const x = from.left - to.left,
        y = from.top - to.top;
      if (Math.abs(x) < 1 && Math.abs(y) < 1) return;
      element.style.zIndex = "2";
      element.style.willChange = "transform";
      const animation = element.animate(
        [
          { transform: `translate(${x}px, ${y}px)` },
          { transform: `translate(${x / 2}px, ${y / 2 + (x < 0 ? -8 : 8)}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: 320, easing: "cubic-bezier(.2,.65,.3,1)" },
      );
      const cleanup = () => {
        if (element.getAnimations().some((other) => other !== animation && other.playState === "running")) return;
        element.style.removeProperty("z-index");
        element.style.removeProperty("will-change");
      };
      animation.onfinish = cleanup;
      animation.oncancel = cleanup;
      started.push(animation);
    });
    animations.current = started;
  }, [approvers, nameRow]);
  useEffect(() => {
    const reduced = matchMedia(REDUCED_MOTION_QUERY);
    const stop = () => {
      if (reduced.matches) animations.current.forEach((animation) => animation.cancel());
    };
    reduced.addEventListener("change", stop);
    return () => {
      reduced.removeEventListener("change", stop);
      animations.current.forEach((animation) => animation.cancel());
    };
  }, []);
  function update(value: NameSwap | null) {
    swapRef.current = value;
    setSwap(value);
  }
  function targetName(event: PointerEvent<HTMLButtonElement>) {
    const current = swapRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-person-section]");
    const to = target && nameRow.current?.contains(target) ? Number(target.dataset.personSection) : null;
    update({ ...current, to, point: { x: event.clientX, y: event.clientY } });
  }
  function drop() {
    const current = swapRef.current;
    if (current?.to != null && current.from !== current.to) {
      const { from, to } = current;
      const before = new Map<string, DOMRect>();
      if (!prefersReducedMotion()) {
        nameRow.current?.querySelectorAll<HTMLElement>("[data-person-identity]").forEach((element) => {
          const person = element.dataset.personIdentity!;
          if (person === approvers[from] || person === approvers[to])
            before.set(person, element.getBoundingClientRect());
        });
      }
      animations.current.forEach((animation) => animation.cancel());
      positions.current = before;
      onSwap(from, to);
      setAnnouncement(`${nameOf(approvers[from])} e ${nameOf(approvers[to])} trocaram de lugar.`);
    } else setAnnouncement("Troca cancelada.");
    update(null);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "Escape") {
      event.preventDefault();
      update(null);
      setAnnouncement("Troca cancelada.");
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (swapRef.current) drop();
      else {
        update({ from: index, to: index, pointerId: null });
        setAnnouncement("Use as setas para escolher com quem trocar. Enter confirma; Escape cancela.");
      }
      return;
    }
    const current = swapRef.current;
    if (!current || current.pointerId !== null || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
      return;
    event.preventDefault();
    const target = current.to ?? current.from;
    const to =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? approvers.length - 1
          : Math.max(0, Math.min(approvers.length - 1, target + (event.key === "ArrowRight" ? 1 : -1)));
    update({ ...current, to });
  }
  return {
    /** The gesture in progress: which name is held, over which it hovers, and where the pointer is. */
    swap,
    /** What the swap would do, while a target is chosen. */
    swapText:
      swap?.to != null && swap.from !== swap.to
        ? `Trocar ${nameOf(approvers[swap.from])} por ${nameOf(approvers[swap.to])}`
        : "",
    /** Last spoken update, for the live region. */
    announcement,
    announce: setAnnouncement,
    /** Abandon the gesture, for example when the ladder changes under it. */
    reset: () => update(null),
    cancelAnimations: () => animations.current.forEach((animation) => animation.cancel()),
    /** Event handlers for the grip button of the name at `index`. */
    grip: (index: number) => ({
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => keyboard(event, index),
      onBlur: () => {
        if (swapRef.current?.pointerId === null) update(null);
      },
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        update({ from: index, to: null, pointerId: event.pointerId, point: { x: event.clientX, y: event.clientY } });
      },
      onPointerMove: targetName,
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
        if (swapRef.current?.pointerId !== event.pointerId) return;
        targetName(event);
        drop();
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      },
      onPointerCancel: () => {
        update(null);
        setAnnouncement("Troca cancelada.");
      },
      onLostPointerCapture: () => {
        if (swapRef.current?.pointerId != null) update(null);
      },
    }),
  };
}
