"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Arrow,Brand,PreviewNotice} from "./ui";
import {Icon} from "./icon";
import {useWorkspaceSession} from "@/lib/account";
export function WorkspaceShell({children}:{children:React.ReactNode}){
 const path=usePathname();
 const {session, loading}=useWorkspaceSession();
 const sample=path==="/app/register/demo";
 const navigation=sample
  ? [["Overview","/app","widget-2-linear"],["Support","/app/support","clipboard-list-linear"],["Crew & roster","/app/crews","users-group-rounded-linear"],["Identity evidence","/app/verification","check-circle-linear"],["Registration","/app/register/demo","clipboard-list-linear"],["Event details","/events/manila-session","arrow-right-up-linear"]] as const
  : [["Overview","/app","widget-2-linear"],["Support","/app/support","clipboard-list-linear"],["Crew & roster","/app/crews","users-group-rounded-linear"],["Notifications","/app/notifications","clipboard-list-linear"],["Identity evidence","/app/verification","check-circle-linear"]] as const;
 return <div className="workspace"><aside className="workspace-sidebar"><Brand/><div className="workspace-context"><span className="eyebrow">Crew workspace</span><strong>{sample?"Afterhours Collective":"Your crew workspace"}</strong><span>{sample?"Philippines chapter":session?`Chapter: ${session.chapter_id}`:loading?"Checking chapter access…":"Choose a chapter in Account access"}</span></div><nav aria-label="Workspace">{navigation.map(([label,href,icon])=><Link key={href} href={href} className={(path===href || (href!=="/app" && path.startsWith(href+"/")))?"active":""} aria-current={path===href?"page":undefined}><span className="nav-icon"><Icon name={icon}/></span>{label}{(path===href || (href!=="/app" && path.startsWith(href+"/")))&&<span className="nav-current" aria-hidden="true"/>}</Link>)}</nav><div className="workspace-bottom"><Link href="/help">Help & information <Arrow diagonal/></Link><div className="identity-label"><span className="sample-user-dot" aria-hidden="true"/><div><strong>{sample?"Sample crew manager":"Your personal account"}</strong><span>{sample?"Browser-local preview":session?"Chapter access verified":"Open Account access to continue"}</span></div></div></div></aside><div className="workspace-body"><div className="workspace-topbar"><span>{sample?"Philippines / Manila Session":"WSB / Crew workspace"}</span><Link href="/">Back to WSB <Arrow diagonal/></Link></div>{sample?<PreviewNotice short/>:<div className="preview-notice"><span className="preview-label">Development</span><span>Demo environment · use synthetic information only</span><Link href="/workspaces">Account access <Arrow/></Link></div>}{children}<footer className="workspace-footer"><span>Everything your crew needs. One place.</span><Link href="/help">Need help?</Link></footer></div></div>;
}
