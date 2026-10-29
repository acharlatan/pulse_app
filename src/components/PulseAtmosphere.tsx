import { useEffect, useRef } from "react";
import { usePulse } from "../app/context";

/** Decorative canvas only; content and controls remain available without WebGL. */
export function PulseAtmosphere() {
  const host = useRef<HTMLDivElement>(null);
  const { settings } = usePulse();
  useEffect(() => {
    const container = host.current;
    if (!container || settings.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stopped = false, cleanup = () => {};
    void import("three").then((T) => {
      if (stopped) return;
      let renderer: import("three").WebGLRenderer;
      try { renderer = new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"}); }
      catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
      const scene = new T.Scene(), camera = new T.PerspectiveCamera(36, 1, .1, 100);
      camera.position.z = 8;
      const group = new T.Group(); scene.add(group);
      const body = new T.Mesh(new T.IcosahedronGeometry(1.04, 5), new T.MeshStandardMaterial({color:0xbba4ff,metalness:.4,roughness:.27})); group.add(body);
      const halo = new T.Mesh(new T.IcosahedronGeometry(1.17, 3), new T.MeshBasicMaterial({color:0xe3a8ff,wireframe:true,transparent:true,opacity:.16}));group.add(halo);
      const rings: import("three").Mesh[] = [];
      for(let i=0;i<3;i++) { const ring=new T.Mesh(new T.TorusGeometry(1.65+i*.16,.008,8,144),new T.MeshBasicMaterial({color:[0xd4c3ff,0xffaeda,0xc9ee8b][i],transparent:true,opacity:.8})); ring.rotation.set(.8+i*.34,.4+i*.68,0);group.add(ring);rings.push(ring); }
      const starGeometry=new T.BufferGeometry(); const points=[]; for(let i=0;i<75;i++){const a=i*2.399,rad=2.3+(i%9)*.14;points.push(Math.cos(a)*rad,Math.sin(a)*rad*.72,Math.sin(i)*.8);}starGeometry.setAttribute("position",new T.Float32BufferAttribute(points,3));const stars=new T.Points(starGeometry,new T.PointsMaterial({color:0xe9ddff,size:.035,transparent:true,opacity:.8}));scene.add(stars);
      scene.add(new T.AmbientLight(0xffffff,2));const light=new T.PointLight(0xffb9eb,35);light.position.set(3,3,5);scene.add(light);
      const resize=()=>{const {clientWidth:w,clientHeight:h}=container;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
      const ro=new ResizeObserver(resize);ro.observe(container);resize();
      let frame=0, visible=true; const observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;});observer.observe(container);
      const tick=()=>{if(stopped)return;frame=requestAnimationFrame(tick);if(!visible||document.hidden)return;group.rotation.y+=.002;group.rotation.z+=.0008;rings.forEach((ring,i)=>ring.rotation.z+=.001*(i+1));stars.rotation.z-=.00025;renderer.render(scene,camera);};tick();
      cleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();ro.disconnect();scene.traverse((obj)=>{if(obj instanceof T.Mesh || obj instanceof T.Points){obj.geometry.dispose();const materials=Array.isArray(obj.material)?obj.material:[obj.material];materials.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
    }).catch(()=>{});
    return ()=>{stopped=true;cleanup();};
  },[settings.reducedMotion]);
  return <div ref={host} className="pulse-atmosphere" aria-hidden="true" />;
}
