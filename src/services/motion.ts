/** Respect both the workspace preference and the operating system preference. */
export function scrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ||
    (typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ? "instant"
    : "smooth";
}
