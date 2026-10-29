import { useInterfaceText } from "../i18n/useInterfaceText";
import { useEffect, useRef, useState } from "react";
import { usePulse } from "../app/context";

/** A decorative, local-only scene. Saved relationships remain in the semantic map above it. */
export function ConstellationScene({ variant }: { variant: "home" | "orbit" }) {
  const __pulseText = useInterfaceText();
  const host = useRef<HTMLDivElement>(null);
  const steer = useRef<(direction: number) => void>(() => {});
  const [ready, setReady] = useState(false);
  const { settings } = usePulse();

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let destroyed = false;
    let dispose = () => {};
    void import("three").then((T) => {
      if (destroyed) return;
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      } catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = T.SRGBColorSpace;
      element.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.z = variant === "home" ? 9 : 12;
      const world = new T.Group();
      scene.add(world);
      const sculpture = new T.Group();
      world.add(sculpture);
      sculpture.position.x = variant === "home" ? 0 : 1.5;
      sculpture.scale.setScalar(variant === "home" ? 1 : 0.9);
      const body = new T.Mesh(
        new T.TorusKnotGeometry(0.83, 0.25, 180, 24, 2, 3),
        new T.MeshPhysicalMaterial({ color: 0xc4a5ff, metalness: 0.5, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12, iridescence: 0.7 }),
      );
      sculpture.add(body);
      const core = new T.Mesh(
        new T.IcosahedronGeometry(0.43, 2),
        new T.MeshPhysicalMaterial({ color: 0xe7ffb1, metalness: 0.3, roughness: 0.2, clearcoat: 1 }),
      );
      sculpture.add(core);
      const shell = new T.Mesh(
        new T.IcosahedronGeometry(1.42, 1),
        new T.MeshBasicMaterial({ color: 0xffd3fa, wireframe: true, transparent: true, opacity: 0.13 }),
      );
      sculpture.add(shell);
      const rings: import("three").Mesh[] = [];
      [0xe8d6ff, 0xffa5d8, 0xd5ff92, 0x9cdffc].forEach((color, i) => {
        const ring = new T.Mesh(
          new T.TorusGeometry(1.75 + i * 0.17, i === 0 ? 0.018 : 0.01, 8, 128),
          new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
        );
        ring.rotation.set(0.75 + i * 0.42, 0.35 + i * 0.7, i * 0.35);
        sculpture.add(ring);
        rings.push(ring);
      });
      const satelliteColors = [0xf7a8d8, 0xd7ff8f, 0x8ddcf3, 0xf3c2ff];
      const satellites: import("three").Mesh[] = [];
      satelliteColors.forEach((color, i) => {
        const orb = new T.Mesh(new T.SphereGeometry(0.12 + i * 0.018, 24, 16), new T.MeshPhysicalMaterial({ color, metalness: 0.2, roughness: 0.23, clearcoat: 1 }));
        const angle = i * Math.PI * 0.5 + 0.6;
        orb.position.set(Math.cos(angle) * (2.05 + i * 0.11), Math.sin(angle) * (1.45 + i * 0.12), (i % 2 ? 1 : -1) * 0.6);
        sculpture.add(orb);
        satellites.push(orb);
      });
      const positions: number[] = [];
      for (let i = 0; i < (variant === "orbit" ? 230 : 125); i++) {
        const angle = i * 2.399963;
        const radius = 2.7 + (i % 31) * 0.09;
        positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.63, Math.sin(i * 3.7) * 1.6);
      }
      const dustGeometry = new T.BufferGeometry();
      dustGeometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
      const dust = new T.Points(dustGeometry, new T.PointsMaterial({ color: 0xece2ff, size: 0.035, transparent: true, opacity: 0.85 }));
      world.add(dust);
      scene.add(new T.AmbientLight(0xffffff, 1.8));
      const pinkLight = new T.PointLight(0xffa8dc, 38);
      pinkLight.position.set(-3, 3, 5); scene.add(pinkLight);
      const blueLight = new T.PointLight(0x9edaff, 40);
      blueLight.position.set(4, -2, 4); scene.add(blueLight);
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      const reduced = () => settings.reducedMotion || media.matches;
      const render = () => renderer.render(scene, camera);
      const resize = () => {
        const { clientWidth, clientHeight } = element;
        if (!clientWidth || !clientHeight) return;
        renderer.setSize(clientWidth, clientHeight, false);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
        render();
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(element);
      resize();
      let frame = 0, visible = false, targetX = 0, targetY = 0;
      const schedule = () => {
        if (!destroyed && visible && !document.hidden && !reduced() && !frame) frame = requestAnimationFrame(tick);
      };
      const intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) schedule();
        else { cancelAnimationFrame(frame); frame = 0; }
      });
      intersection.observe(element);
      let drag: { x: number; y: number } | null = null;
      const down = (event: PointerEvent) => {
        if (variant !== "home" || (event.target as Element).closest("button, a")) return;
        drag = { x: event.clientX, y: event.clientY };
        pointerHost?.setPointerCapture(event.pointerId);
      };
      const up = () => { drag = null; };
      const pointer = (event: PointerEvent) => {
        if (drag) {
          sculpture.rotation.y += (event.clientX - drag.x) * 0.012;
          targetY = Math.max(-0.7, Math.min(0.7, targetY + (event.clientY - drag.y) * 0.008));
          drag = { x: event.clientX, y: event.clientY };
          render();
          return;
        }
        const bounds = element.getBoundingClientRect();
        targetX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 0.25;
        targetY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 0.18;
      };
      const pointerHost = element.parentElement;
      pointerHost?.addEventListener("pointermove", pointer);
      pointerHost?.addEventListener("pointerdown", down);
      pointerHost?.addEventListener("pointerup", up);
      pointerHost?.addEventListener("pointercancel", up);
      steer.current = (direction) => { sculpture.rotation.y += direction * 0.5; render(); };
      setReady(true);
      const tick = () => {
        frame = 0;
        if (destroyed || !visible || document.hidden || reduced()) return;
        sculpture.rotation.y += 0.0025;
        sculpture.rotation.x += (targetY - sculpture.rotation.x) * 0.025;
        world.rotation.y += (targetX - world.rotation.y) * 0.02;
        rings.forEach((ring, i) => { ring.rotation.z += 0.001 * (i + 1); });
        satellites.forEach((orb, i) => { orb.rotation.y += 0.003 + i * 0.001; });
        dust.rotation.z -= 0.0003;
        render();
        schedule();
      };
      const onVisibility = () => {
        if (document.hidden || reduced()) { cancelAnimationFrame(frame); frame = 0; }
        else schedule();
      };
      document.addEventListener("visibilitychange", onVisibility);
      media.addEventListener("change", onVisibility);
      schedule();
      dispose = () => {
        cancelAnimationFrame(frame);
        document.removeEventListener("visibilitychange", onVisibility);
        media.removeEventListener("change", onVisibility);
        intersection.disconnect(); resizeObserver.disconnect();
        pointerHost?.removeEventListener("pointermove", pointer);
        pointerHost?.removeEventListener("pointerdown", down);
        pointerHost?.removeEventListener("pointerup", up);
        pointerHost?.removeEventListener("pointercancel", up);
        steer.current = () => {};
        scene.traverse((object) => {
          if (object instanceof T.Mesh || object instanceof T.Points) {
            object.geometry.dispose();
            (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose());
          }
        });
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => { /* CSS artwork remains when WebGL cannot initialize. */ });
    return () => { destroyed = true; dispose(); };
  }, [settings.reducedMotion, variant]);
  return <><div className={`constellation-scene constellation-scene-${variant}`} ref={host} aria-hidden="true" />{variant === "home" && ready && <div className="home-scene-controls" aria-label={__pulseText("Rotate the 3D artwork")}><span>{__pulseText("DRAG TO EXPLORE")}</span><button aria-label={__pulseText("Rotate artwork left")} onClick={() => steer.current(-1)}>↶</button><button aria-label={__pulseText("Rotate artwork right")} onClick={() => steer.current(1)}>↷</button></div>}</>;
}
