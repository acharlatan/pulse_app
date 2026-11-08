import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollBehavior } from "../src/services/motion";

describe("in-page scrolling motion", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses an instant scroll when the workspace or system requests reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    expect(scrollBehavior(false)).toBe("instant");
    expect(scrollBehavior(true)).toBe("instant");
  });

  it("allows smooth scrolling only when neither preference requests reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    expect(scrollBehavior(false)).toBe("smooth");
    expect(scrollBehavior(true)).toBe("instant");
  });
});
