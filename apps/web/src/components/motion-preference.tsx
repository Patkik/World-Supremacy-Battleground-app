"use client";
import {useEffect,useState} from "react";
export const MOTION_PREFERENCE_KEY="wsb-motion-paused";
export function MotionPreference(){
 const [paused,setPaused]=useState(false);const [reduced,setReduced]=useState(false);
 useEffect(()=>{
  const media=matchMedia("(prefers-reduced-motion: reduce)");
  const change=()=>setReduced(media.matches);change();media.addEventListener("change",change);
  try{setPaused(sessionStorage.getItem(MOTION_PREFERENCE_KEY)==="true");}catch{}
  return()=>media.removeEventListener("change",change);
 },[]);
 function toggle(){const next=!paused;setPaused(next);try{sessionStorage.setItem(MOTION_PREFERENCE_KEY,String(next));}catch{}document.dispatchEvent(new CustomEvent("wsb:motion-preference",{detail:{paused:next}}));}
 return <button type="button" className="footer-motion-preference" onClick={toggle} disabled={reduced} aria-pressed={paused||reduced} aria-label={reduced?"Motion reduced by device preference":paused?"Enable page motion":"Disable page motion"}>Motion: {reduced?"reduced":paused?"off":"on"}</button>;
}
