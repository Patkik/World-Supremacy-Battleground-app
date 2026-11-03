"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Arrow, Brand } from "@/components/ui";
import { Icon } from "@/components/icon";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isGlobalHq = pathname === "/hq" || pathname.startsWith("/hq/");

  // Extract chapterId from path if present, defaults to ph
  const chapterMatch = pathname.match(/\/admin\/([^/]+)/);
  const chapterId = chapterMatch ? chapterMatch[1] : "ph";

  const chapterNavigation = [
    { label: "Support queue", href: `/admin/${chapterId}/support`, icon: "clipboard-list-linear" as const },
    { label: "Dashboard", href: `/admin/${chapterId}`, icon: "widget-2-linear" as const },
    { label: "Events", href: `/admin/${chapterId}/events`, icon: "clipboard-list-linear" as const },
    { label: "Event-duty consoles", href: "/console", icon: "users-group-rounded-linear" as const },
    { label: "Identity review", href: `/admin/${chapterId}/verification`, icon: "check-circle-linear" as const },
    { label: "Finance transactions", href: `/admin/${chapterId}/finance/transactions`, icon: "clipboard-list-linear" as const },
    { label: "Audit history", href: `/admin/${chapterId}/audit`, icon: "clipboard-list-linear" as const },
    { label: "Staff & Officials", href: `/admin/${chapterId}/staff`, icon: "users-group-rounded-linear" as const },
  ];
  const hqNavigation = [
    { label: "Global overview", href: "/hq", icon: "widget-2-linear" as const },
    { label: "Chapter administration", href: "/hq/chapters", icon: "users-group-rounded-linear" as const },
    { label: "Global rules", href: "/hq/rules", icon: "clipboard-list-linear" as const },
    { label: "Access governance", href: "/hq/access", icon: "check-circle-linear" as const },
    { label: "Global content", href: "/hq/content", icon: "music-note-linear" as const },
    { label: "Integrations", href: "/hq/integrations", icon: "widget-2-linear" as const },
    { label: "Operations", href: "/hq/operations", icon: "widget-2-linear" as const },
  ];
  const navigation = isGlobalHq ? hqNavigation : chapterNavigation;

  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <Brand />
        <div className="workspace-context">
          <span className="eyebrow">{isGlobalHq ? "Platform Governance" : "Chapter Operations"}</span>
          <strong>{isGlobalHq ? "Global HQ" : `WSB ${chapterId.toUpperCase()}`}</strong>
          <span>{isGlobalHq ? "Global authority workspace" : "Admin & Registrar Console"}</span>
        </div>

        <nav aria-label={isGlobalHq ? "Global HQ navigation" : "Admin Navigation"}>
          {navigation.map(({ label, href, icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={isActive ? "active" : ""}
              >
                <span className="nav-icon">
                  <Icon name={icon} />
                </span>
                {label}
                {isActive && <span className="nav-current" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        <div className="workspace-bottom">
          <Link href="/app">
            Switch to Dancer/Crew Portal <Arrow diagonal />
          </Link>
          <Link href="/console">
            Event-duty consoles <Arrow diagonal />
          </Link>
          <div className="identity-label">
            <span className="sample-user-dot" aria-hidden="true" />
            <div>
              <strong>{isGlobalHq ? "Global HQ workspace" : "Development staff workspace"}</strong>
              <span>{isGlobalHq ? "Platform scope" : `Chapter view: ${chapterId.toUpperCase()}`}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="workspace-body">
        <div className="workspace-topbar">
          <span>{isGlobalHq ? "Global HQ / Governance" : `Chapter HQ / ${chapterId.toUpperCase()} Operations`}</span>
          <div className="flex gap-4 items-center">
            {!isGlobalHq && <Link href="/workspaces">Choose chapter</Link>}
            <span className="text-muted text-xs">|</span>
            <Link href="/">Back to WSB <Arrow diagonal /></Link>
          </div>
        </div>
        <div className="preview-notice"><span className="preview-label">{isGlobalHq ? "Global HQ" : "Demo environment"}</span><span>{isGlobalHq ? "The API verifies current Global HQ membership. Each workspace identifies its connected, read-only, or preview capabilities." : "Connected workspaces use server-checked access; unported areas remain previews. Production readiness is closed."}</span>{!isGlobalHq && <Link href="/workspaces">Verify account access</Link>}</div>
        {children}
        <footer className="workspace-footer">
          <span>{isGlobalHq ? "WSB Official Championship Platform · Global HQ" : "WSB Official Championship Platform · Chapter Operations"}</span>
          <Link href="/help">Operations Manual</Link>
        </footer>
      </div>
    </div>
  );
}
