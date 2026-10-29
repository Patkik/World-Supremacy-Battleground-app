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
export function Status({children, tone = "neutral"}: {children: React.ReactNode; tone?: "neutral" | "volt" | "amber" | "crimson"}) {
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
export function Button({
  children,
  variant = "primary",
  className = "",
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const variantClass =
    variant === "primary"
      ? "button button-volt"
      : variant === "secondary"
      ? "button button-secondary"
      : variant === "danger"
      ? "button bg-crimson hover:bg-crimson/80 text-white font-bold"
      : "button button-ghost";

  return (
    <button className={`${variantClass} ${className}`} style={style} {...props}>
      {children}
    </button>
  );
}
export function StatCard({
  label,
  value,
  meta,
  tone = "neutral",
}: {
  label: string;
  value: string;
  meta?: string;
  tone?: "neutral" | "volt" | "amber" | "crimson";
}) {
  return (
    <div className="stat-card panel p-4 bg-carbon border border-subtle rounded-xl flex flex-col justify-between">
      <span className="mono text-xs text-titanium">{label}</span>
      <strong className={`mono text-2xl font-bold my-1 ${
        tone === "volt"
          ? "text-volt"
          : tone === "amber"
          ? "text-amber"
          : tone === "crimson"
          ? "text-crimson"
          : "text-white"
      }`}>
        {value}
      </strong>
      {meta && <span className="text-xs text-titanium">{meta}</span>}
    </div>
  );
}
export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...props} />;
}
export function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`input ${className}`} {...props} />;
}
export function Textarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input ${className}`} {...props} />;
}
