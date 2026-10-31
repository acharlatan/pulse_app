import { useInterfaceText } from "../i18n/useInterfaceText";
import { useEffect, useRef } from "react";
import type { OrbitNode, OrbitEdge } from "../services/orbit";
import { usePulse } from "../app/context";
import { Avatar } from "./ui";
import { useTranslation } from "../i18n/useTranslation";

interface Controls {
  select: (id: string) => void;
  move: (zoom: number, pan: { x: number; y: number }) => void;
  turn: (amount: number) => void;
  reset: () => void;
  center: (id: string) => { x: number; y: number } | undefined;
}
/** A bounded 3D rendering of the same saved nodes and edges as the accessible map. */
export function OrbitWorld({ nodes, edges, selected, zoom, pan, turn, reset, center, onCenter, onSelect, onUnavailable }: {
  nodes: OrbitNode[]; edges: OrbitEdge[]; selected: string; zoom: number;
  pan: { x: number; y: number }; turn: number; reset: number; center: number;
  onCenter: (pan: { x: number; y: number }) => void;
  onSelect: (node: OrbitNode) => void; onUnavailable: () => void;
}) {
  const __pulseText = useInterfaceText();
  const t = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const markerRefs = useRef(new Map<string, HTMLButtonElement>());
  const leaderRefs = useRef(new Map<string, SVGLineElement>());
  const controls = useRef<Controls | null>(null);
  const previousTurn = useRef(0);
  const previousCenter = useRef(0);
  const orientation = useRef({ x: -0.12, y: -0.18, z: 0 });
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
      renderer.domElement.setAttribute("aria-hidden", "true");
      element.prepend(renderer.domElement);
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.set(0, 0, 18);
      const galaxy = new T.Group(); scene.add(galaxy);
      galaxy.rotation.set(orientation.current.x, orientation.current.y, orientation.current.z);
      const positions = new Map<string, import("three").Vector3>();
      const targets: import("three").Mesh[] = [];
      const bodies = new Map<string, import("three").Mesh>();
      const colors = { person: 0xd5b8ff, company: 0x83dbe7, opportunity: 0xffa4d0 };
      const nodeGeometry = new T.SphereGeometry(0.27, 24, 16);
      for (const node of nodes) {
        let hash = 0; for (const char of node.id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
        const z = ((Math.abs(hash) % 100) / 100 - 0.5) * 5.2;
        const position = new T.Vector3((node.x - 500) / 90, (380 - node.y) / 90, z);
        positions.set(node.id, position);
        const body = new T.Mesh(nodeGeometry, new T.MeshPhysicalMaterial({ color: colors[node.kind], metalness: 0.24, roughness: 0.24, clearcoat: 1, emissive: colors[node.kind], emissiveIntensity: 0.16 }));
        body.position.copy(position); body.userData.nodeId = node.id; galaxy.add(body); targets.push(body); bodies.set(node.id, body);
        const halo = new T.Mesh(new T.TorusGeometry(0.41, 0.012, 6, 48), new T.MeshBasicMaterial({ color: colors[node.kind], transparent: true, opacity: 0.75 }));
        halo.position.copy(position); halo.rotation.set(0.3, 0.5, 0); galaxy.add(halo);
      }
      const lines: { edge: OrbitEdge; line: import("three").Line }[] = [];
      for (const edge of edges) {
        const a = positions.get(edge.from), b = positions.get(edge.to);
        if (!a || !b) continue;
        const middle = a.clone().add(b).multiplyScalar(0.5); middle.z += 0.35;
        const curve = new T.QuadraticBezierCurve3(a, middle, b);
        const line = new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(20)), new T.LineBasicMaterial({ color: 0xd8d2ff, transparent: true, opacity: 0.6 }));
        galaxy.add(line); lines.push({ edge, line });
      }
      const orbitRings = [
        { radius: 5.25, color: 0xa89ad5, rotation: [0.8, 0.4, 0] },
        { radius: 4.7, color: 0x9cdae0, rotation: [1.12, -0.45, 0.55] },
        { radius: 5.7, color: 0xe5b5df, rotation: [0.55, 0.95, -0.25] },
      ].map(({ radius, color, rotation }) => {
        const ring = new T.Mesh(new T.TorusGeometry(radius, 0.012, 5, 140), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 }));
        ring.rotation.set(rotation[0], rotation[1], rotation[2]); galaxy.add(ring); return ring;
      });
      const stars: number[] = [];
      for (let i = 0; i < 170; i++) { const a = i * 2.399; const r = 5.8 + (i % 24) * 0.12; stars.push(Math.cos(a) * r, Math.sin(a) * r * 0.65, Math.sin(i) * 2); }
      const dustGeo = new T.BufferGeometry(); dustGeo.setAttribute("position", new T.Float32BufferAttribute(stars, 3));
      galaxy.add(new T.Points(dustGeo, new T.PointsMaterial({ color: 0xeae3ff, size: 0.035, transparent: true, opacity: 0.8 })));
      scene.add(new T.AmbientLight(0xffffff, 2.5));
      const light = new T.PointLight(0xffbbf4, 55); light.position.set(3, 4, 8); scene.add(light);
      const projected = new T.Vector3();
      let lastProjection = "";
      const render = () => {
        renderer.render(scene, camera);
        galaxy.updateMatrixWorld(true);
        camera.updateMatrixWorld();
        const width = element.clientWidth, height = element.clientHeight;
        const signature = [width, height, galaxy.rotation.x, galaxy.rotation.y, galaxy.rotation.z, camera.position.x, camera.position.y, camera.position.z].join("|");
        if (signature === lastProjection) return;
        lastProjection = signature;
        const cardWidth = width <= 600 ? 108 : 120, cardHeight = 90;
        const markers = nodes.flatMap((node) => {
          const marker = markerRefs.current.get(node.id), position = positions.get(node.id);
          if (!marker || !position) return [];
          projected.copy(position).applyMatrix4(galaxy.matrixWorld).project(camera);
          const originX = (projected.x + 1) * width / 2, originY = (1 - projected.y) * height / 2;
          const inView = projected.z > -1 && projected.z < 1 && originX > -20 && originX < width + 20 && originY > -20 && originY < height + 20;
          marker.style.visibility = inView ? "visible" : "hidden";
          const leader = leaderRefs.current.get(node.id);
          if (!inView) { if (leader) leader.style.display = "none"; return []; }
          return [{ marker, leader, originX, originY, x: Math.max(cardWidth / 2, Math.min(width - cardWidth / 2, originX)), y: Math.max(cardHeight / 2, Math.min(height - cardHeight / 2, originY)), z: projected.z }];
        });
        // Fixed, bounded passes separate visible controls without changing saved graph data.
        for (let pass = 0; pass < 20; pass++) {
          for (let i = 0; i < markers.length; i++) for (let j = i + 1; j < markers.length; j++) {
            const a = markers[i], b = markers[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const overlapX = cardWidth - Math.abs(dx), overlapY = cardHeight - Math.abs(dy);
            if (overlapX <= 0 || overlapY <= 0) continue;
            if (overlapX < overlapY) { const shift = (overlapX / 2 + 1) * (dx < 0 ? -1 : 1); a.x -= shift; b.x += shift; }
            else { const shift = (overlapY / 2 + 1) * (dy < 0 ? -1 : 1); a.y -= shift; b.y += shift; }
            for (const item of [a, b]) { item.x = Math.max(cardWidth / 2, Math.min(width - cardWidth / 2, item.x)); item.y = Math.max(cardHeight / 2, Math.min(height - cardHeight / 2, item.y)); }
          }
        }
        for (const item of markers) {
          item.marker.style.transform = `translate(${item.x}px, ${item.y}px) translate(-50%, -50%)`;
          item.marker.style.zIndex = String(Math.round((1 - item.z) * 1000));
          if (item.leader) {
            const shifted = Math.hypot(item.x - item.originX, item.y - item.originY) > 8;
            item.leader.style.display = shifted ? "" : "none";
            item.leader.setAttribute("x1", String(item.originX)); item.leader.setAttribute("y1", String(item.originY));
            item.leader.setAttribute("x2", String(item.x)); item.leader.setAttribute("y2", String(item.y - 13));
          }
        }
      };
      const resize = () => { const { clientWidth: w, clientHeight: h } = element; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render(); };
      const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element); resize();
      const media = matchMedia("(prefers-reduced-motion: reduce)");
      const reduced = () => settings.reducedMotion || media.matches;
      let frame = 0, visible = false;
      const tick = () => { frame = 0; if (stopped || !visible || document.hidden || reduced()) return; orbitRings.forEach((ring, i) => { ring.rotation.z += (i % 2 ? -1 : 1) * 0.0006; }); render(); schedule(); };
      const schedule = () => { if (!stopped && visible && !document.hidden && !reduced() && !frame) frame = requestAnimationFrame(tick); };
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else { cancelAnimationFrame(frame); frame = 0; } }); observer.observe(element);
      const visibility = () => { if (document.hidden || reduced()) { cancelAnimationFrame(frame); frame = 0; } else schedule(); };
      document.addEventListener("visibilitychange", visibility); media.addEventListener("change", visibility);
      let drag: { x: number; y: number; total: number } | null = null;
      const raycaster = new T.Raycaster(), mouse = new T.Vector2();
      const down = (event: PointerEvent) => { event.stopPropagation(); drag = { x: event.clientX, y: event.clientY, total: 0 }; renderer.domElement.setPointerCapture(event.pointerId); };
      const move = (event: PointerEvent) => { if (!drag) return; event.stopPropagation(); const dx = event.clientX - drag.x, dy = event.clientY - drag.y; drag.total += Math.abs(dx) + Math.abs(dy); galaxy.rotation.y += dx * 0.008; galaxy.rotation.x = Math.max(-1.2, Math.min(1.2, galaxy.rotation.x + dy * 0.008)); orientation.current = { x: galaxy.rotation.x, y: galaxy.rotation.y, z: galaxy.rotation.z }; drag.x = event.clientX; drag.y = event.clientY; render(); };
      const up = (event: PointerEvent) => { if (!drag) return; event.stopPropagation(); if (drag.total < 7) { const rect = renderer.domElement.getBoundingClientRect(); mouse.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(mouse, camera); const hit = raycaster.intersectObjects(targets)[0]?.object.userData.nodeId; const node = nodes.find((item) => item.id === hit); if (node) selectionCallback.current(node); } drag = null; };
      renderer.domElement.addEventListener("pointerdown", down); renderer.domElement.addEventListener("pointermove", move); renderer.domElement.addEventListener("pointerup", up); renderer.domElement.addEventListener("pointercancel", up);
      controls.current = {
        select: (id) => { const visibleId = positions.has(id) ? id : ""; bodies.forEach((body, key) => { body.scale.setScalar(key === visibleId ? 1.45 : 1); const material = body.material as import("three").MeshPhysicalMaterial; material.emissiveIntensity = key === visibleId ? 0.7 : 0.16; }); lines.forEach(({edge,line}) => { const material = line.material as import("three").LineBasicMaterial; const active = !!visibleId && (edge.from === visibleId || edge.to === visibleId); material.color.setHex(active ? 0xd9f28e : 0xd8d2ff); material.opacity = visibleId ? (active ? 1 : 0.18) : 0.6; }); render(); },
        move: (scale, offset) => { camera.position.set(-offset.x * 0.012, offset.y * 0.012, 14 / Math.max(0.35, scale)); render(); },
        turn: (amount) => { galaxy.rotation.y += amount; orientation.current = { x: galaxy.rotation.x, y: galaxy.rotation.y, z: galaxy.rotation.z }; render(); },
        reset: () => { galaxy.rotation.set(-0.12, -0.18, 0); orientation.current = { x: -0.12, y: -0.18, z: 0 }; render(); },
        center: (id) => {
          const point = positions.get(id);
          if (!point) return undefined;
          galaxy.updateMatrixWorld(true);
          const worldPoint = point.clone().applyMatrix4(galaxy.matrixWorld);
          return { x: -worldPoint.x / 0.012, y: worldPoint.y / 0.012 };
        },
      };
      controls.current.select(latestView.current.selected); controls.current.move(latestView.current.zoom, latestView.current.pan); schedule();
      cleanup = () => {
        controls.current = null; cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect(); document.removeEventListener("visibilitychange", visibility); media.removeEventListener("change", visibility);
        renderer.domElement.removeEventListener("pointerdown", down); renderer.domElement.removeEventListener("pointermove", move); renderer.domElement.removeEventListener("pointerup", up); renderer.domElement.removeEventListener("pointercancel", up);
        scene.traverse((object) => { if (object instanceof T.Mesh || object instanceof T.Points || object instanceof T.Line) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose()); } });
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => { if (!stopped) failureCallback.current(); });
    return () => { stopped = true; cleanup(); };
    // The graph itself is memoized; camera and selection update separately.
  }, [nodes, edges, settings.reducedMotion]);
  useEffect(() => { latestView.current.selected = selected; controls.current?.select(selected); }, [selected]);
  useEffect(() => { latestView.current.zoom = zoom; latestView.current.pan = pan; controls.current?.move(zoom, pan); }, [zoom, pan]);
  useEffect(() => { const delta = turn - previousTurn.current; previousTurn.current = turn; if (delta) controls.current?.turn(delta * 0.35); }, [turn]);
  useEffect(() => { if (reset) controls.current?.reset(); }, [reset]);
  useEffect(() => {
    if (center === previousCenter.current) return;
    previousCenter.current = center;
    const offset = controls.current?.center(selected);
    if (offset) onCenter(offset);
  }, [center, selected, onCenter]);
  const selectedOnMap = nodes.some((node) => node.id === selected);
  const connected = new Set(edges.flatMap((edge) => edge.from === selected ? [edge.to] : edge.to === selected ? [edge.from] : []));
  return <div className="orbit-world" ref={host}>
    <svg className="orbit-marker-leaders" aria-hidden="true">{nodes.map((node) => <line key={node.id} ref={(element) => { if (element) leaderRefs.current.set(node.id, element); else leaderRefs.current.delete(node.id); }} />)}</svg>
    <div className="orbit-dom-nodes" role="group" aria-label={__pulseText("3D relationship nodes")}>
      {nodes.map((node) => <button key={node.id} ref={(element) => { if (element) markerRefs.current.set(node.id, element); else markerRefs.current.delete(node.id); }} className={`orbit-3d-node ${node.kind}${node.id === selected ? " selected" : ""}${connected.has(node.id) ? " connected" : ""}${selectedOnMap && node.id !== selected && !connected.has(node.id) ? " unrelated" : ""}`} aria-pressed={node.id === selected} title={node.label} onClick={() => onSelect(node)}>
        <Avatar name={node.label} mediaId={node.mediaId} company={node.kind === "company"} ariaHidden={false} />{" "}
        <span className="orbit-3d-label">{node.label}</span><span className="sr-only"> {node.kind === "person" ? t("person") : node.kind === "company" ? t("company") : t("opportunity")}</span>
      </button>)}
    </div>
  </div>;
}
