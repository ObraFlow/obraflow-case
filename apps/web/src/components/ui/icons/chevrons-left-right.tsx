"use client";

import { type Transition, motion, useAnimation, useReducedMotion } from "motion/react";
import { type HTMLAttributes, forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface ChevronsLeftRightIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ChevronsLeftRightIconProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
}

const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 250,
  damping: 25,
};

const ChevronsLeftRightIcon = forwardRef<ChevronsLeftRightIconHandle, ChevronsLeftRightIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const reducedMotion = useReducedMotion();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => {
          if (!reducedMotion) void controls.start("animate");
        },
        stopAnimation: () => {
          if (!reducedMotion) void controls.start("normal");
        },
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else if (!reducedMotion) {
          void controls.start("animate");
        }
      },
      [controls, onMouseEnter, reducedMotion],
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else if (!reducedMotion) {
          void controls.start("normal");
        }
      },
      [controls, onMouseLeave, reducedMotion],
    );

    return (
      <span className={cn(className)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            animate={controls}
            d="m9 7-5 5 5 5"
            initial="normal"
            transition={DEFAULT_TRANSITION}
            variants={{
              normal: { translateX: "0%" },
              animate: { translateX: "-2px" },
            }}
          />
          <motion.path
            animate={controls}
            d="m15 7 5 5-5 5"
            initial="normal"
            transition={DEFAULT_TRANSITION}
            variants={{
              normal: { translateX: "0%" },
              animate: { translateX: "2px" },
            }}
          />
        </svg>
      </span>
    );
  },
);

ChevronsLeftRightIcon.displayName = "ChevronsLeftRightIcon";

export { ChevronsLeftRightIcon };
