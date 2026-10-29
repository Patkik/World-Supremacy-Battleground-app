import Link from "next/link";
import Image from "next/image";

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true" className="arrow">{diagonal ? "↗" : "→"}</span>;
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label="World Supremacy Battlegrounds home">
    <Image src="/brand/wsb-logo.png" width={64} height={64} alt="" className="brand-mark brand-mark-white" priority />
    {!compact && <span>World Supremacy<br/>Battlegrounds<span className="brand-sub">The worldwide street dance movement</span></span>}
  </Link>;
}
export function Status({children, tone = "neutral"}: {children: React.ReactNode; tone?: "neutral" | "volt" | "amber"}) {
  return <span className={`status status-${tone}`}><span className="status-dot" aria-hidden="true"/>{children}</span>;
}
export function PreviewNotice({short = false}: {short?:boolean}) {
  return <div className="preview-notice"><span className="preview-label">Design preview</span><span>{short ? "Fictional event · sample data" : "Explore the experience. Events, people and scores shown are sample data."}</span><Link href="/preview">Explore screens <Arrow/></Link></div>;
}
export function PageHeading({eyebrow,title,description,action}: {eyebrow?:string;title:string;description?:string;action?:React.ReactNode}) {
  return <div className="page-heading"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description&&<p className="lede">{description}</p>}</div>{action}</div>;
}
export function EmptyState({title,children}: {title:string;children:React.ReactNode}) {
  return <div className="empty-state"><h3>{title}</h3><p>{children}</p></div>;
}
