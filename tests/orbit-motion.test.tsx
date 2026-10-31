import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { OrbitNode, OrbitEdge } from "../src/services/orbit";
import { OrbitWorld } from "../src/components/OrbitWorld";

vi.mock("../src/app/context", () => ({ usePulse: () => ({ settings: { reducedMotion: true } }) }));
vi.mock("../src/i18n/useInterfaceText", () => ({ useInterfaceText: () => (value: string) => value }));
vi.mock("../src/i18n/useTranslation", () => ({ useTranslation: () => (value: string) => value }));
vi.mock("../src/components/ui", () => ({ Avatar: ({ name }: { name: string }) => <span className="avatar">{name}</span> }));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return { ...actual, WebGLRenderer: class {
    domElement = document.createElement("canvas");
    outputColorSpace = "";
    constructor() { this.domElement.setPointerCapture = () => {}; }
    setPixelRatio() {}
    setClearColor() {}
    setSize() {}
    render() {}
    dispose() {}
  } };
});

const originalWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
const originalHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
function flushFrame() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(16));
}
beforeEach(() => {
  frames = new Map(); nextFrame = 0;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1000 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 700 });
  vi.stubGlobal("ResizeObserver", class { constructor(private cb: ResizeObserverCallback) {} observe() { this.cb([], this as unknown as ResizeObserver); } disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { const id = ++nextFrame; frames.set(id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => { frames.delete(id); });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (originalWidth) Object.defineProperty(HTMLElement.prototype, "clientWidth", originalWidth); else delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  if (originalHeight) Object.defineProperty(HTMLElement.prototype, "clientHeight", originalHeight); else delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
});

// Both ids have the same deterministic depth and therefore the same 3D point.
const nodes: OrbitNode[] = [
  { id: "person:3", recordId: "3", kind: "person", label: "Ari", mediaId: "", x: 500, y: 380 },
  { id: "person:30", recordId: "30", kind: "person", label: "Bea", mediaId: "", x: 500, y: 380 },
];
const edges: OrbitEdge[] = [];
const onSelect = vi.fn();
const onUnavailable = vi.fn();
const onCenter = vi.fn();
function coords(transform: string) {
  const match = /translate3d\(([-.\d]+)px, ([-.\d]+)px/.exec(transform);
  if (!match) throw new Error(`Missing projected transform: ${transform}`);
  return [Number(match[1]), Number(match[2])];
}

describe("Orbit portrait movement", () => {
  it("keeps overlapping portraits together as the map rotates", async () => {
    const view = render(<OrbitWorld nodes={nodes} edges={edges} selected="" zoom={1} pan={{x:0,y:0}} turn={0} reset={0} center={0} onCenter={onCenter} onSelect={onSelect} onUnavailable={onUnavailable}/>);
    const markers = view.container.querySelectorAll<HTMLButtonElement>(".orbit-3d-node");
    await waitFor(() => expect(markers[0].style.transform).toContain("translate3d"));
    expect(onUnavailable).not.toHaveBeenCalled();
    expect(markers[0].style.transform).toBe(markers[1].style.transform);
    const canvas = view.container.querySelector("canvas")!;
    let last = coords(markers[0].style.transform);
    const start = [...last];
    fireEvent(canvas, new MouseEvent("pointerdown", { bubbles:true, clientX:200, clientY:200 }));
    fireEvent(canvas, new MouseEvent("pointermove", { bubbles:true, clientX:202, clientY:200 }));
    fireEvent(canvas, new MouseEvent("pointermove", { bubbles:true, clientX:205, clientY:200 }));
    expect(frames.size).toBe(1);
    expect(coords(markers[0].style.transform)).toEqual(start);
    flushFrame();
    for (let x = 210; x <= 250; x += 5) {
      fireEvent(canvas, new MouseEvent("pointermove", { bubbles:true, clientX:x, clientY:200 }));
      flushFrame();
      expect(markers[0].style.transform).toBe(markers[1].style.transform);
      const next = coords(markers[0].style.transform);
      expect(Math.hypot(next[0] - last[0], next[1] - last[1])).toBeLessThan(5);
      last = next;
    }
    expect(Math.hypot(last[0] - start[0], last[1] - start[1])).toBeGreaterThan(0.1);
    fireEvent(canvas, new MouseEvent("pointerup", { bubbles:true, clientX:250, clientY:200 }));
  });
});
