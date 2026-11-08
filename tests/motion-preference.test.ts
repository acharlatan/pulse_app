import { afterEach, expect, it, vi } from "vitest";
import { motionAwareScroll } from "../src/services/motion-preference";

afterEach(() => vi.unstubAllGlobals());
it("uses immediate scrolling for either saved or device reduced-motion preferences", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false })),
  );
  expect(motionAwareScroll(false)).toBe("smooth");
  expect(motionAwareScroll(true)).toBe("instant");
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  );
  expect(motionAwareScroll(false)).toBe("instant");
});
it("works without matchMedia", () => {
  vi.stubGlobal("matchMedia", undefined);
  expect(motionAwareScroll(false)).toBe("smooth");
  expect(motionAwareScroll(true)).toBe("instant");
});
