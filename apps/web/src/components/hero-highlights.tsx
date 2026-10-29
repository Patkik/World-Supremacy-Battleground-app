"use client";
import Image from "next/image";
import {useEffect,useRef,useState} from "react";
import {WSB_HIGHLIGHTS} from "@/lib/public-content";
import {loadYouTubeAPI,type YouTubePlayer} from "@/lib/youtube-player";

type Connection=EventTarget&{saveData?:boolean;effectiveType?:string};

/** Decorative, always-muted footage: no focus target, controls or click action. */
export function HeroHighlights(){
 const mount=useRef<HTMLDivElement>(null);
 const player=useRef<YouTubePlayer|null>(null);
 const index=useRef(0);const inView=useRef(true);const sitePaused=useRef(false);
 const [active,setActive]=useState(0);const [enabled,setEnabled]=useState(false);
 const [playing,setPlaying]=useState(false);const [unavailable,setUnavailable]=useState(false);
 const clip=WSB_HIGHLIGHTS[active];

 useEffect(()=>{
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const connection=(navigator as Navigator&{connection?:Connection}).connection;
  const preferences=()=>{
   const blocked=reduced.matches||!!connection?.saveData||connection?.effectiveType==="2g"||connection?.effectiveType==="slow-2g";
   setEnabled(!blocked);if(blocked)setPlaying(false);
  };
  preferences();reduced.addEventListener("change",preferences);connection?.addEventListener("change",preferences);
  return()=>{reduced.removeEventListener("change",preferences);connection?.removeEventListener("change",preferences);};
 },[]);

 useEffect(()=>{
  if(!enabled||!mount.current)return;
  let alive=true;let initialized=false;let autoplayBlocked=false;
  const stage=mount.current;const node=document.createElement("div");stage.appendChild(node);
  sitePaused.current=document.querySelector(".marketing-motion")?.getAttribute("data-motion")==="paused";
  setUnavailable(false);
  const attemptPlayback=()=>{
   if(!autoplayBlocked&&inView.current&&!document.hidden&&!sitePaused.current)player.current?.playVideo();
  };
  const deadline=window.setTimeout(()=>{if(alive&&!initialized)setUnavailable(true);},18000);
  loadYouTubeAPI().then(api=>{
   if(!alive)return;
   player.current=new api.Player(node,{
    host:"https://www.youtube-nocookie.com",videoId:WSB_HIGHLIGHTS[index.current].id,
    playerVars:{autoplay:1,mute:1,controls:0,playsinline:1,disablekb:1,fs:0,rel:0,cc_load_policy:0,enablejsapi:1,origin:location.origin,start:WSB_HIGHLIGHTS[index.current].start,end:WSB_HIGHLIGHTS[index.current].end},
    events:{
     onReady:({target})=>{
      if(!alive)return;initialized=true;window.clearTimeout(deadline);
      const frame=stage.querySelector("iframe");frame?.setAttribute("tabindex","-1");frame?.setAttribute("aria-hidden","true");
      target.mute();attemptPlayback();
     },
     onStateChange:({target,data})=>{
      if(!alive)return;
      if(data===1){
       target.mute();
       if(sitePaused.current||document.hidden||!inView.current){target.pauseVideo();setPlaying(false);}
       else{setPlaying(true);setUnavailable(false);}
      }
      if(data===2||data===0)setPlaying(false);
      if(data===0&&!sitePaused.current){
       index.current=(index.current+1)%WSB_HIGHLIGHTS.length;setActive(index.current);
       const next=WSB_HIGHLIGHTS[index.current];target.loadVideoById({videoId:next.id,startSeconds:next.start,endSeconds:next.end});
      }
     },
     onError:()=>{if(alive){setUnavailable(true);setPlaying(false);}},
     onAutoplayBlocked:()=>{autoplayBlocked=true;if(alive){setUnavailable(true);setPlaying(false);}},
    },
   });
  }).catch(()=>{if(alive){setUnavailable(true);setPlaying(false);}});
  const visibility=()=>{if(document.hidden)player.current?.pauseVideo();else attemptPlayback();};
  const motion=(event:Event)=>{
   sitePaused.current=!!(event as CustomEvent<{paused:boolean}>).detail.paused;
   if(sitePaused.current)player.current?.pauseVideo();else attemptPlayback();
  };
  const observer=new IntersectionObserver(([entry])=>{
   inView.current=entry.isIntersecting;if(!entry.isIntersecting)player.current?.pauseVideo();else attemptPlayback();
  },{threshold:.1});
  observer.observe(stage);document.addEventListener("visibilitychange",visibility);document.addEventListener("wsb:motion-change",motion);
  return()=>{
   alive=false;window.clearTimeout(deadline);observer.disconnect();
   document.removeEventListener("visibilitychange",visibility);document.removeEventListener("wsb:motion-change",motion);
   player.current?.destroy();player.current=null;stage.replaceChildren();
  };
 },[enabled]);

 return <div className={`hero-media hero-highlights ${playing?"is-playing":""}`} data-hero-reveal data-active-clip={clip.id} data-playback={unavailable?"unavailable":playing?"playing":"poster"}>
  <Image src={`https://i.ytimg.com/vi/${clip.id}/hqdefault.jpg`} alt={`${clip.title} at ${clip.event}, from the official WSBstreet archive`} fill priority unoptimized draggable={false} sizes="(max-width:767px) 100vw, 70vw" className="hero-photo highlights-poster"/>
  <div ref={mount} className="hero-player" aria-hidden="true"/>
  <div className="hero-cross" aria-hidden="true">+</div>
 </div>;
}
