"use client";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {MOTION_PREFERENCE_KEY} from "./motion-preference";
gsap.registerPlugin(useGSAP, ScrollTrigger);
export function MarketingMotion({children}:{children:React.ReactNode}) {
 const root=useRef<HTMLDivElement>(null);
 const [paused,setPaused]=useState(false);
 useEffect(()=>{
  try{setPaused(sessionStorage.getItem(MOTION_PREFERENCE_KEY)==="true");}catch{}
  const preference=(event:Event)=>setPaused(!!(event as CustomEvent<{paused:boolean}>).detail.paused);
  document.addEventListener("wsb:motion-preference",preference);
  return()=>document.removeEventListener("wsb:motion-preference",preference);
 },[]);
 useEffect(()=>{document.dispatchEvent(new CustomEvent("wsb:motion-change",{detail:{paused}}));},[paused]);
 useGSAP(()=>{
  if(paused)return;
  const media=gsap.matchMedia();
  media.add("(prefers-reduced-motion: no-preference)",()=>{
   const intro=gsap.timeline({defaults:{ease:"power3.out"}});
   intro.from("[data-hero-line]",{yPercent:108,rotate:2,duration:1.05,stagger:.12,clearProps:"all"},0)
    .from("[data-hero-reveal]",{y:24,opacity:.25,duration:.9,stagger:.1,clearProps:"all"},.15);
   const stamp=gsap.to(".hero-stamp",{y:-9,rotation:3,duration:2.7,repeat:-1,yoyo:true,ease:"sine.inOut",paused:true});
   ScrollTrigger.create({trigger:".hero",start:"top bottom",end:"bottom top",onToggle:self=>self.isActive?stamp.play():stamp.pause()});
   const sections=root.current?.querySelectorAll<HTMLElement>("[data-motion-section]")||[];
   const tape=root.current?.querySelector<HTMLElement>(".motion-tape-track");
   const tapeObserver=new IntersectionObserver(([entry])=>{if(tape)tape.style.animationPlayState=entry.isIntersecting?"running":"paused";});
   if(tape)tapeObserver.observe(tape);
   sections.forEach(section=>{
    const title=section.querySelector("[data-motion-title]");
    if(title)gsap.from(title,{y:44,opacity:.25,duration:.9,clearProps:"all",scrollTrigger:{trigger:section,start:"top 87%",once:true}});
    const rows=section.querySelectorAll("[data-motion-row]");
    if(rows.length)gsap.from(rows,{x:24,opacity:.2,stagger:.09,duration:.75,clearProps:"all",scrollTrigger:{trigger:rows[0],start:"top 91%",once:true}});
   });
   gsap.fromTo(".movement-number",{xPercent:-6,rotation:-12},{xPercent:5,rotation:-5,ease:"none",scrollTrigger:{trigger:".movement-section",start:"top bottom",end:"bottom top",scrub:.7}});
   const pointer=window.matchMedia("(pointer:fine) and (min-width:1024px)");
   if(!pointer.matches)return ()=>tapeObserver.disconnect();
   const lenis=new Lenis({duration:.9,smoothWheel:true,anchors:true});
   lenis.on("scroll",ScrollTrigger.update);
   const tick=(time:number)=>lenis.raf(time*1000);
   gsap.ticker.add(tick);
   gsap.ticker.lagSmoothing(0);
   return ()=>{tapeObserver.disconnect();gsap.ticker.remove(tick);lenis.destroy();};
  });
  return ()=>media.revert();
 },{scope:root,dependencies:[paused],revertOnUpdate:true});
 return <div ref={root} className="marketing-motion" data-motion={paused?"paused":"active"}>{children}</div>;
}
