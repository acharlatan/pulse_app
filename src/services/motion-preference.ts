// Read the device setting at the time of the interaction, so changes made
// while PULSE is open take effect without changing the user's saved setting.
export function motionAwareScroll(reducedMotion: boolean): ScrollBehavior {
  const devicePrefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reducedMotion || devicePrefersReducedMotion ? "instant" : "smooth";
}
