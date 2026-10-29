"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Arrow,Brand,PreviewNotice} from "./ui";
import {Icon} from "./icon";
export function WorkspaceShell({children}:{children:React.ReactNode}){
 const path=usePathname();
 const navigation=[["Overview","/app","widget-2-linear"],["Crew & roster","/app/crews","users-group-rounded-linear"],["Registration","/app/register/demo","clipboard-list-linear"],["Event details","/events/manila-session","arrow-right-up-linear"]] as const;
 return <div className="workspace"><aside className="workspace-sidebar"><Brand/><div className="workspace-context"><span className="eyebrow">Crew workspace</span><strong>Afterhours Collective</strong><span>Philippines chapter</span></div><nav aria-label="Workspace">{navigation.map(([label,href,icon])=><Link key={href} href={href} className={path===href?"active":""}><span className="nav-icon"><Icon name={icon}/></span>{label}{path===href&&<span className="nav-current" aria-hidden="true"/>}</Link>)}</nav><div className="workspace-bottom"><Link href="/preview">Explore preview screens <Arrow diagonal/></Link><Link href="/help">Help & information <Arrow diagonal/></Link><div className="identity-label"><span className="sample-user-dot" aria-hidden="true"/><div><strong>Sample crew manager</strong><span>Browser-local preview</span></div></div></div></aside><div className="workspace-body"><div className="workspace-topbar"><span>Philippines <span aria-hidden="true">/</span> Manila Session</span><Link href="/">Back to WSB <Arrow diagonal/></Link></div><PreviewNotice short/>{children}<footer className="workspace-footer"><span>Everything your crew needs. One place.</span><Link href="/help">Need help?</Link></footer></div></div>;
}
