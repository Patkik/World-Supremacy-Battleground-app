"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Arrow, Brand } from "./ui";
const links = [["Events", "/events"], ["How it works", "/#how-it-works"], ["Chapters", "/chapters"], ["Results", "/results"]];
export function PublicNav() {
  const [open,setOpen]=useState(false);
  const path=usePathname(); const landing=path==="/"; const button=useRef<HTMLButtonElement>(null);
  useEffect(()=>{setOpen(false);},[path]);
  return <header className="public-header"><Brand/><nav className="desktop-nav" aria-label="Main navigation">{(landing ? [["How it works", "/#how-it-works"], ["Questions", "/#questions"]] : links).map(([name,url])=><Link key={url} href={url} aria-current={path===url?"page":undefined}>{name}</Link>)}</nav>
    <div className="header-actions"><Link href="/sign-in" className="header-signin">Sign in <Arrow/></Link><Link href="/events" className="button button-volt header-cta">Find an event <Arrow/></Link><button ref={button} className="menu-button" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open?"Close navigation":"Open navigation"}>{open?"Close":"Menu"}<span aria-hidden="true">{open?"−":"+"}</span></button></div>
    {open&&<nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation" onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);button.current?.focus();}}}>{links.map(([name,url])=><Link key={url} href={url} onClick={()=>setOpen(false)}>{name}<Arrow/></Link>)}<Link href="/sign-in">Sign in<Arrow/></Link><Link href="/workspaces">Open your workspace<Arrow/></Link></nav>}
  </header>;
}
