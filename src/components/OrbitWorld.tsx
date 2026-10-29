import { useEffect, useRef } from "react";
import type { OrbitNode, OrbitEdge } from "../services/orbit";
import { usePulse } from "../app/context";

interface Controls {
  select: (id: string) => void;
  move: (zoom: number, pan: { x: number; y: number }) => void;
  turn: (amount: number) => void;
  reset: () => void;
}
/** A bounded 3D rendering of the same saved nodes and edges as the accessible map. */
export function OrbitWorld({ nodes, edges, selected, zoom, pan, turn, reset, onSelect, onUnavailable }: {
  nodes: OrbitNode[]; edges: OrbitEdge[]; selected: string; zoom: number;
  pan: { x: number; y: number }; turn: number; reset: number;
  onSelect: (node: OrbitNode) => void; onUnavailable: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const controls = useRef<Controls | null>(null);
  const previousTurn = useRef(0);
  const latestView = useRef({ selected, zoom, pan });
  const selectionCallback = useRef(onSelect);
  const failureCallback = useRef(onUnavailable);
  useEffect(() => { selectionCallback.current = onSelect; failureCallback.current = onUnavailable; }, [onSelect, onUnavailable]);
  const { settings } = usePulse();
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let stopped = false, cleanup = () => {};
    void import("three").then((T) => {
      if (stopped) return;
      let renderer: import("three").WebGLRenderer;
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
      catch { failureCallback.current(); return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = T.SRGBColorSpace;
      element.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.set(0, 0, 18);
      const galaxy = new T.Group(); scene.add(galaxy);
      galaxy.rotation.set(-0.12, -0.18, 0);
      const positions = new Map<string, import("three").Vector3>();
      const targets: (import("three").Mesh | import("three").Sprite)[] = [];
      const bodies = new Map<string, import("three").Mesh>();
      const colors = { person: 0xd5b8ff, company: 0x83dbe7, opportunity: 0xffa4d0 };
      const nodeGeometry = new T.SphereGeometry(0.27, 24, 16);
      const labels: import("three").Texture[] = [];
      for (const node of nodes) {
        let hash = 0; for (const char of node.id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
        const z = ((Math.abs(hash) % 100) / 100 - 0.5) * 2.6;
        const position = new T.Vector3((node.x - 500) / 90, (380 - node.y) / 90, z);
        positions.set(node.id, position);
        const body = new T.Mesh(nodeGeometry, new T.MeshPhysicalMaterial({ color: colors[node.kind], metalness: 0.24, roughness: 0.24, clearcoat: 1, emissive: colors[node.kind], emissiveIntensity: 0.16 }));
        body.position.copy(position); body.userData.nodeId = node.id; galaxy.add(body); targets.push(body); bodies.set(node.id, body);
        const halo = new T.Mesh(new T.TorusGeometry(0.41, 0.012, 6, 48), new T.MeshBasicMaterial({ color: colors[node.kind], transparent: true, opacity: 0.75 }));
        halo.position.copy(position); halo.rotation.set(0.3, 0.5, 0); galaxy.add(halo);
        const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 130;
        const context = canvas.getContext("2d");
        if (context) {
          context.fillStyle = "rgba(25, 25, 47, .94)"; context.beginPath(); context.roundRect(4, 4, 504, 122, 27); context.fill();
          context.strokeStyle = "rgba(226,216,255,.72)"; context.lineWidth = 3; context.stroke();
          context.textAlign = "center"; context.fillStyle = "#ffffff"; context.font = "700 46px system-ui, sans-serif";
          const name = node.label.length > 23 ? `${node.label.slice(0, 22)}…` : node.label;
          context.fillText(name, 256, 58, 470);
          context.font = "26px system-ui, sans-serif"; context.fillStyle = "#e5def3"; context.fillText(node.kind.toUpperCase(), 256, 96);
          const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; labels.push(texture);
          const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
          sprite.scale.set(1.9, 0.48, 1); sprite.position.copy(position).add(new T.Vector3(0, -0.62, 0)); sprite.renderOrder = 2; sprite.userData.nodeId = node.id; galaxy.add(sprite); targets.push(sprite);
        }
      }
      for (const edge of edges) {
        const a = positions.get(edge.from), b = positions.get(edge.to);
        if (!a || !b) continue;
        const middle = a.clone().add(b).multiplyScalar(0.5); middle.z += 0.35;
        const curve = new T.QuadraticBezierCurve3(a, middle, b);
        const line = new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(20)), new T.LineBasicMaterial({ color: 0xd8d2ff, transparent: true, opacity: 0.6 }));
        galaxy.add(line);
      }
      const orbitRing = new T.Mesh(new T.TorusGeometry(5.25, 0.012, 5, 140), new T.MeshBasicMaterial({ color: 0xa89ad5, transparent: true, opacity: 0.24 }));
      orbitRing.rotation.set(0.8, 0.4, 0); galaxy.add(orbitRing);
      const stars: number[] = [];
      for (let i = 0; i < 170; i++) { const a = i * 2.399; const r = 5.8 + (i % 24) * 0.12; stars.push(Math.cos(a) * r, Math.sin(a) * r * 0.65, Math.sin(i) * 2); }
      const dustGeo = new T.BufferGeometry(); dustGeo.setAttribute("position", new T.Float32BufferAttribute(stars, 3));
      galaxy.add(new T.Points(dustGeo, new T.PointsMaterial({ color: 0xeae3ff, size: 0.035, transparent: true, opacity: 0.8 })));
      scene.add(new T.AmbientLight(0xffffff, 2.5));
      const light = new T.PointLight(0xffbbf4, 55); light.position.set(3, 4, 8); scene.add(light);
      const render = () => renderer.render(scene, camera);
      const resize = () => { const { clientWidth: w, clientHeight: h } = element; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render(); };
      const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element); resize();
      const media = matchMedia("(prefers-reduced-motion: reduce)");
      const reduced = () => settings.reducedMotion || media.matches;
      let frame = 0, visible = false;
      const tick = () => { frame = 0; if (stopped || !visible || document.hidden || reduced()) return; orbitRing.rotation.z += 0.0015; render(); schedule(); };
      const schedule = () => { if (!stopped && visible && !document.hidden && !reduced() && !frame) frame = requestAnimationFrame(tick); };
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else { cancelAnimationFrame(frame); frame = 0; } }); observer.observe(element);
      const visibility = () => { if (document.hidden || reduced()) { cancelAnimationFrame(frame); frame = 0; } else schedule(); };
      document.addEventListener("visibilitychange", visibility); media.addEventListener("change", visibility);
      let drag: { x: number; y: number; total: number } | null = null;
      const raycaster = new T.Raycaster(), mouse = new T.Vector2();
      const down = (event: PointerEvent) => { event.stopPropagation(); drag = { x: event.clientX, y: event.clientY, total: 0 }; renderer.domElement.setPointerCapture(event.pointerId); };
      const move = (event: PointerEvent) => { if (!drag) return; event.stopPropagation(); const dx = event.clientX - drag.x, dy = event.clientY - drag.y; drag.total += Math.abs(dx) + Math.abs(dy); galaxy.rotation.y += dx * 0.008; galaxy.rotation.x = Math.max(-1.2, Math.min(1.2, galaxy.rotation.x + dy * 0.008)); drag.x = event.clientX; drag.y = event.clientY; render(); };
      const up = (event: PointerEvent) => { if (!drag) return; event.stopPropagation(); if (drag.total < 7) { const rect = renderer.domElement.getBoundingClientRect(); mouse.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(mouse, camera); const hit = raycaster.intersectObjects(targets)[0]?.object.userData.nodeId; const node = nodes.find((item) => item.id === hit); if (node) selectionCallback.current(node); } drag = null; };
      renderer.domElement.addEventListener("pointerdown", down); renderer.domElement.addEventListener("pointermove", move); renderer.domElement.addEventListener("pointerup", up); renderer.domElement.addEventListener("pointercancel", up);
      controls.current = {
        select: (id) => { bodies.forEach((body, key) => { body.scale.setScalar(key === id ? 1.45 : 1); const material = body.material as import("three").MeshPhysicalMaterial; material.emissiveIntensity = key === id ? 0.7 : 0.16; }); render(); },
        move: (scale, offset) => { camera.position.set(-offset.x * 0.012, offset.y * 0.012, 14 / Math.max(0.35, scale)); render(); },
        turn: (amount) => { galaxy.rotation.y += amount; render(); },
        reset: () => { galaxy.rotation.set(-0.12, -0.18, 0); render(); },
      };
      controls.current.select(latestView.current.selected); controls.current.move(latestView.current.zoom, latestView.current.pan); schedule();
      cleanup = () => {
        controls.current = null; cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect(); document.removeEventListener("visibilitychange", visibility); media.removeEventListener("change", visibility);
        renderer.domElement.removeEventListener("pointerdown", down); renderer.domElement.removeEventListener("pointermove", move); renderer.domElement.removeEventListener("pointerup", up); renderer.domElement.removeEventListener("pointercancel", up);
        scene.traverse((object) => { if (object instanceof T.Mesh || object instanceof T.Points || object instanceof T.Line) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose()); } else if (object instanceof T.Sprite) object.material.dispose(); });
        labels.forEach((texture) => texture.dispose()); renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => { if (!stopped) failureCallback.current(); });
    return () => { stopped = true; cleanup(); };
    // The graph itself is memoized; camera and selection update separately.
  }, [nodes, edges, settings.reducedMotion]);
  useEffect(() => { latestView.current.selected = selected; controls.current?.select(selected); }, [selected]);
  useEffect(() => { latestView.current.zoom = zoom; latestView.current.pan = pan; controls.current?.move(zoom, pan); }, [zoom, pan]);
  useEffect(() => { const delta = turn - previousTurn.current; previousTurn.current = turn; if (delta) controls.current?.turn(delta * 0.35); }, [turn]);
  useEffect(() => { if (reset) controls.current?.reset(); }, [reset]);
  return <div className="orbit-world" ref={host} aria-hidden="true" />;
}
