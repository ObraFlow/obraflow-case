/** From this viewport width the sidebar layout is used; below it, the mobile bar and drawer. Matches the CSS. */
export const DESKTOP_QUERY = "(min-width: 900px)";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const prefersReducedMotion = () => matchMedia(REDUCED_MOTION_QUERY).matches;
