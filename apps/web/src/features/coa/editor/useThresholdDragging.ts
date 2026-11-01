import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import { cents } from "../thresholds";

// amountSchema allows sixteen integer digits and two decimal places.
export const MAX_THRESHOLD = cents("9999999999999999.99")!;
// All amounts below are in cents. The visible scale never drops under R$ 50.000,00.
const MIN_SCALE = 5000000n;
// The scale keeps 25% of room to the right of the last tick.
const HEADROOM_PERCENT = 125n;
export const scaleFor = (last: bigint) => {
  const room = (last * HEADROOM_PERCENT + 99n) / 100n;
  return room > MIN_SCALE ? room : MIN_SCALE;
};

// Pointer position along the track, as a fraction of its width.
const EDGE_ARM = 0.82; // at or beyond it, holding the pointer grows the scale
const EDGE_ARM_PERCENT = 82n; // the same threshold, for exact bigint comparison
const EDGE_DISARM = 0.78; // back below it, the hold is released (hysteresis against jitter)
const EDGE_ZONE = 0.18; // width of the growth zone: 1 - EDGE_ARM
const MIDPOINT = 0.5; // dragging the last tick left of it starts shrinking the scale
const SHRINK_RELEASE = 0.52; // back right of it, the tick follows the pointer again
const POINTER_MIN = 0.01; // clamp of the pointer position when growing the scale around it
const POINTER_MAX = 0.97;
// Ratios become bigint fractions of RATIO_ONE so amounts stay exact.
const RATIO_ONE = 1000000;
const RATIO_ONE_N = 1000000n;
// While held, the gesture advances every TICK_MS. A strength of FULL_STRENGTH (pointer at the very edge)
// changes the scale by FULL_STRENGTH / STRENGTH_DIVISOR = 2.5% per tick, which is 50% per second.
const TICK_MS = 50;
const FULL_STRENGTH = 1000;
const STRENGTH_DIVISOR = 40000n;
// Arrow keys move a threshold by R$ 1,00; with Shift, by R$ 100,00.
const KEY_STEP = 100n;
const KEY_STEP_LARGE = 10000n;
const clamp = (value: bigint, lower: bigint, upper: bigint) => (value < lower ? lower : value > upper ? upper : value);
type Drag = {
  index: number;
  pointerId: number;
  x: number;
  previousX: number;
  offset: number;
  width: number;
  left: number;
  armed: boolean;
  shrinking: boolean;
  element: HTMLButtonElement;
};

/** A local display scale, never a persisted monetary constraint. */
export function useThresholdDragging(
  initialLast: bigint,
  thresholds: bigint[],
  onMove: (index: number, value: bigint) => void,
  track: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const [axis, setAxis] = useState(() => scaleFor(initialLast));
  const axisRef = useRef(axis);
  // The newest props for event handlers. Synced right after each commit, before any pointer event can run.
  const latest = useRef({ thresholds, onMove, enabled });
  useLayoutEffect(() => {
    latest.current = { thresholds, onMove, enabled };
  });
  const active = useRef<Drag | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  function stop() {
    const drag = active.current;
    active.current = null;
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    if (drag?.element.hasPointerCapture(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId);
  }
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    const resized = () => {
      const drag = active.current,
        bounds = track.current?.getBoundingClientRect();
      if (drag && bounds && (bounds.width !== drag.width || bounds.left !== drag.left)) stop();
    };
    window.addEventListener("blur", stop);
    window.addEventListener("resize", resized);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      stop();
      window.removeEventListener("blur", stop);
      window.removeEventListener("resize", resized);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [track]);
  useEffect(() => {
    if (!enabled) stop();
  }, [enabled]);
  function setScale(value: bigint) {
    axisRef.current = value;
    setAxis(value);
  }
  function fit(value: bigint) {
    if (value * 100n >= axisRef.current * EDGE_ARM_PERCENT)
      setScale(scaleFor(value) > axisRef.current ? scaleFor(value) : axisRef.current);
  }
  function reset(value: bigint) {
    stop();
    setScale(scaleFor(value));
  }
  function move(index: number, requested: bigint, pointerRatio?: number, fixedAxis?: bigint) {
    const current = latest.current;
    if (!current.enabled || current.thresholds[index] === undefined) return;
    const upper = current.thresholds[index + 1] === undefined ? MAX_THRESHOLD : current.thresholds[index + 1] - 1n;
    const lower = index ? current.thresholds[index - 1] + 1n : 1n;
    const value = clamp(requested, lower, upper);
    const previous = current.thresholds[index];
    if (value === previous) return;
    current.thresholds = current.thresholds.map((limit, position) => (position === index ? value : limit));
    current.onMove(index, value);
    if (fixedAxis !== undefined) {
      setScale(fixedAxis);
      return;
    }
    if (pointerRatio !== undefined) {
      // Expand around the pointer instead of remapping its position into a growing axis.
      const ratio = BigInt(Math.round(Math.max(POINTER_MIN, Math.min(POINTER_MAX, pointerRatio)) * RATIO_ONE));
      const needed = (value * RATIO_ONE_N + ratio - 1n) / ratio;
      if (value > previous && pointerRatio >= EDGE_ARM && needed > axisRef.current) setScale(needed);
    } else fit(value);
  }
  function advance(edge: boolean) {
    const drag = active.current,
      bounds = track.current?.getBoundingClientRect();
    if (!drag || !bounds?.width || !latest.current.enabled) return stop();
    const value = latest.current.thresholds[drag.index];
    if (bounds.width !== drag.width || bounds.left !== drag.left) {
      // Layout changes end this gesture; restarting gives it a fresh anchor.
      return stop();
    }
    const ratio = Math.max(0, Math.min(1, (drag.x - drag.offset - bounds.left) / bounds.width));
    if (ratio >= EDGE_ARM) drag.armed = true;
    if (ratio < EDGE_DISARM) drag.armed = false;
    const delta = drag.x - drag.previousX;
    drag.previousX = drag.x;
    const pixels = BigInt(Math.round((delta / bounds.width) * RATIO_ONE));
    const lower = drag.index ? latest.current.thresholds[drag.index - 1] + 1n : 1n;
    if (
      drag.index === latest.current.thresholds.length - 1 &&
      delta < 0 &&
      ratio <= MIDPOINT &&
      value * 2n >= axisRef.current &&
      axisRef.current > MIN_SCALE &&
      lower * 2n <= axisRef.current
    )
      drag.shrinking = true;
    if (drag.shrinking) {
      if (ratio > SHRINK_RELEASE) {
        drag.shrinking = false;
        // Rejoin the pointer without applying the distance accumulated while pinned.
        move(drag.index, (axisRef.current * BigInt(Math.round(ratio * RATIO_ONE))) / RATIO_ONE_N, ratio);
        return;
      }
      const floor = lower * 2n > MIN_SCALE ? lower * 2n : MIN_SCALE;
      let nextScale = axisRef.current;
      if (edge && ratio < MIDPOINT && nextScale > floor) {
        const strength = BigInt(Math.round((MIDPOINT - ratio) * (FULL_STRENGTH / MIDPOINT)));
        const reduction = (nextScale * strength) / STRENGTH_DIVISOR || 1n;
        nextScale = nextScale - reduction > floor ? nextScale - reduction : floor;
      }
      // An even cent scale gives the midpoint an exact, valid monetary value.
      nextScale -= nextScale % 2n;
      move(drag.index, nextScale / 2n, undefined, nextScale);
      return;
    }
    let change = (axisRef.current * pixels) / RATIO_ONE_N;
    if (edge && drag.armed && ratio > EDGE_ARM) {
      const strength = BigInt(Math.round(((ratio - EDGE_ARM) / EDGE_ZONE) * FULL_STRENGTH));
      change += (axisRef.current * strength) / STRENGTH_DIVISOR || 1n;
    }
    if (change) move(drag.index, drag.x <= bounds.left ? 0n : value + change, ratio);
  }
  function pointerDown(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (event.button !== 0 || !latest.current.enabled || !track.current) return;
    stop();
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = track.current.getBoundingClientRect();
    const center =
      (Number((latest.current.thresholds[index] * RATIO_ONE_N) / axisRef.current) / RATIO_ONE) * bounds.width;
    active.current = {
      index,
      pointerId: event.pointerId,
      x: event.clientX,
      previousX: event.clientX,
      offset: event.clientX - bounds.left - center,
      width: bounds.width,
      left: bounds.left,
      armed: false,
      shrinking: false,
      element: event.currentTarget,
    };
    timer.current = setInterval(() => advance(true), TICK_MS);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = active.current;
    if (drag?.pointerId !== event.pointerId) return;
    if (event.clientX < drag.x) drag.armed = false;
    drag.x = event.clientX;
    advance(false);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "Escape") {
      stop();
      return;
    }
    const value = latest.current.thresholds[index],
      step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const next = {
      ArrowLeft: value - step,
      ArrowDown: value - step,
      ArrowRight: value + step,
      ArrowUp: value + step,
      Home: 0n,
      End: (latest.current.thresholds[index + 1] ?? axisRef.current) - 1n,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    move(index, next);
  }
  return { axis, reset, stop, keyboard, pointerDown, pointerMove };
}
