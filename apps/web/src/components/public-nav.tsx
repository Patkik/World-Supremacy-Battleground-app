"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Arrow, Brand } from "./ui";
import {WSB} from "@/lib/public-content";
const links = [["Events", "/events"], ["Chapters", "/chapters"], ["The movement", "/#movement"], ["Results", "/results"]];
export function PublicNav() {
  const [open,setOpen]=useState(false);
  const path=usePathname(); const button=useRef<HTMLButtonElement>(null);
  useEffect(()=>{setOpen(false);},[path]);
  return <header className="public-header"><Brand/><nav className="desktop-nav" aria-label="Main navigation">{links.map(([name,url])=><Link key={url} href={url} aria-current={path===url?"page":undefined}>{name}</Link>)}</nav>
    <div className="header-actions"><a href={WSB.rules} className="header-signin">Official rules <Arrow diagonal/></a><a href={WSB.registration} className="button button-volt header-cta">Register your crew <Arrow/></a><button ref={button} className="menu-button" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open?"Close navigation":"Open navigation"}>{open?"Close":"Menu"}<span aria-hidden="true">{open?"−":"+"}</span></button></div>
    {open&&<nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation" onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);button.current?.focus();}}}>{links.map(([name,url])=><Link key={url} href={url} onClick={()=>setOpen(false)}>{name}<Arrow/></Link>)}<a href={WSB.registration}>Register your crew<Arrow/></a></nav>}
  </header>;
}
