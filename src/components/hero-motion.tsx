"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** A photographic plate and a hinged model share one fixed composition. */
export default function HeroMotion() {
  const host = useRef<HTMLDivElement>(null);
  useGSAP((_, contextSafe) => {
    const element = host.current;
    const hero = element?.closest<HTMLElement>(".hero");
    if (!element || !hero || !contextSafe) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const initialize = contextSafe(async () => {
      // A failed image or unavailable WebGL leaves the original readable hero intact.
      const plate = new Image();
      plate.src = "/images/hero-clean.png";
      try {
        const [THREE, { RoundedBoxGeometry }] = await Promise.all([
          import("three"), import("three/examples/jsm/geometries/RoundedBoxGeometry.js"), plate.decode(),
        ]);
        if (disposed) return;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x000000, 0);
        element.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
        camera.position.set(3.1, 3.0, -7.1);
        camera.lookAt(0, 1.0, 0);
        const ambient = new THREE.HemisphereLight(0xfff3db, 0x806347, 3.1);
        scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffddb1, 4.2);
        sun.position.set(-3, 7, -4);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
        sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
        sun.shadow.normalBias = .025;
        sun.shadow.radius = 5;
        scene.add(sun);
        const fill = new THREE.DirectionalLight(0xffffff, 1.5);
        fill.position.set(5, 4, 3); scene.add(fill);
        const metal = new THREE.MeshStandardMaterial({ color: 0xbdb5a7, metalness: .48, roughness: .36 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x242420, roughness: .65 });
        const glass = new THREE.MeshStandardMaterial({ color: 0x111817, metalness: .2, roughness: .17 });
        const laptop = new THREE.Group();
        scene.add(laptop);
        function box(w: number, h: number, d: number, material: import("three").Material, x=0,y=0,z=0) {
          const mesh = new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(.065,h/3,d/3)), material);
          mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true;
          return mesh;
        }
        laptop.add(box(4.2,.14,2.65,metal,0,.15,0));
        laptop.add(box(3.7,.015,1.22,dark,0,.228,-.35));
        for(let row=0;row<5;row++) for(let col=0;col<13;col++) {
          laptop.add(box(.237,.02,.185,dark,(col-6)*.276,.245,-.84+row*.24));
        }
        laptop.add(box(1.45,.012,.67,metal,0,.23,.8));
        const hinge = new THREE.Group();
        hinge.position.set(0,.245,-1.24);
        const lid=box(4.2,2.62,.09,metal,0,1.31,0);
        hinge.add(lid);
        hinge.add(box(3.98,2.39,.015,dark,0,1.33,.052));
        hinge.add(box(3.78,2.18,.008,glass,0,1.34,.064));
        laptop.add(hinge);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(16,12), new THREE.ShadowMaterial({ opacity:.22 }));
        floor.rotation.x=-Math.PI/2; floor.position.y=.058; floor.receiveShadow=true;scene.add(floor);
        const render=()=>renderer.render(scene,camera);
        const resize=()=>{const {width,height}=element.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render();};
        const observer=new ResizeObserver(resize);observer.observe(element);
        const media=gsap.matchMedia();
        // This synchronous context also owns the timeline created after module loading.
        media.add({motion:"(prefers-reduced-motion: no-preference)",reduced:"(prefers-reduced-motion: reduce)"}, ctx=>{
          hero.dataset.motion="ready";
          if(ctx.conditions?.reduced){hinge.rotation.x=-.12;resize();return;}
          hinge.rotation.x=Math.PI/2;
          const targets=hero.querySelectorAll(".hero-reveal, .hero-header, .hero-tag");
          const timeline=gsap.timeline({defaults:{ease:"none"},scrollTrigger:{
            trigger:hero,start:"top top",end:()=>`+=${Math.round(innerHeight*1.35)}`,
            pin:true,scrub:.45,invalidateOnRefresh:true,
          }});
          timeline.to(hinge.rotation,{x:-.12,duration:1,onUpdate:render},0)
            .fromTo(targets,{autoAlpha:0,y:26},{autoAlpha:1,y:0,stagger:.065,duration:.32},.2)
            .to(hero.querySelector(".hero-motion-hint"),{autoAlpha:0,duration:.12},.05)
            .to({}, {duration:.2});
          resize();
          return ()=>{delete hero.dataset.motion;};
        },hero);
        const lost=(event:Event)=>{event.preventDefault();media.revert();hero.dataset.motion="fallback";};
        renderer.domElement.addEventListener("webglcontextlost",lost);
        cleanup=()=>{observer.disconnect();media.revert();renderer.domElement.removeEventListener("webglcontextlost",lost);scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();delete hero.dataset.motion;};
      } catch { if(!disposed) hero.dataset.motion="fallback"; }
    });
    void initialize();
    return ()=>{disposed=true;cleanup?.();};
  },{scope:host});
  return <><div className="hero-motion-scene" aria-hidden="true"><div className="hero-clean-plate"/><div className="laptop-render" ref={host}/></div><noscript><style>{`.hero .hero-header,.hero .hero-reveal,.hero .hero-tag{visibility:visible!important}.hero .hero-motion-scene,.hero .hero-motion-hint{display:none}.hero .hero-photo{opacity:1!important}`}</style></noscript></>;
}
