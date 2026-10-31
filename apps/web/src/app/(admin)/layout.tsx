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

  // Extract chapterId from path if present, defaults to ph
  const chapterMatch = pathname.match(/\/admin\/([^/]+)/);
  const chapterId = chapterMatch ? chapterMatch[1] : "ph";

  const navigation = [
    { label: "Support queue", href: `/admin/${chapterId}/support`, icon: "clipboard-list-linear" as const },
    { label: "Dashboard", href: `/admin/${chapterId}`, icon: "widget-2-linear" as const },
    { label: "Events", href: `/admin/${chapterId}/events`, icon: "clipboard-list-linear" as const },
    { label: "Registration Queue", href: `/admin/${chapterId}/events/manila-session-2027/registrations`, icon: "users-group-rounded-linear" as const },
    { label: "Identity review", href: `/admin/${chapterId}/verification`, icon: "check-circle-linear" as const },
    { label: "Divisions & Rules", href: `/admin/${chapterId}/events/manila-session-2027/divisions`, icon: "clipboard-list-linear" as const },
    { label: "Staff & Officials", href: `/admin/${chapterId}/staff`, icon: "users-group-rounded-linear" as const },
  ];

  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <Brand />
        <div className="workspace-context">
          <span className="eyebrow">Chapter Operations</span>
          <strong>WSB {chapterId.toUpperCase()}</strong>
          <span>Admin & Registrar Console</span>
        </div>

        <nav aria-label="Admin Navigation">
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
          <Link href="/console/demo/judge">
            Judging Console <Arrow diagonal />
          </Link>
          <div className="identity-label">
            <span className="sample-user-dot" aria-hidden="true" />
            <div>
              <strong>Development staff workspace</strong>
              <span>Chapter view: {chapterId.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="workspace-body">
        <div className="workspace-topbar">
          <span>Chapter HQ <span aria-hidden="true">/</span> {chapterId.toUpperCase()} Operations</span>
          <div className="flex gap-4 items-center">
            <Link href={`/admin/ph`} className={chapterId === "ph" ? "text-volt font-bold text-xs" : "text-titanium text-xs"}>
              PH
            </Link>
            <span className="text-muted text-xs">|</span>
            <Link href={`/admin/hk`} className={chapterId === "hk" ? "text-volt font-bold text-xs" : "text-titanium text-xs"}>
              HK
            </Link>
            <span className="text-muted text-xs">|</span>
            <Link href={`/admin/au`} className={chapterId === "au" ? "text-volt font-bold text-xs" : "text-titanium text-xs"}>
              AU
            </Link>
            <span className="text-muted text-xs">|</span>
            <Link href="/">Back to WSB <Arrow diagonal /></Link>
          </div>
        </div>
        <div className="preview-notice"><span className="preview-label">Development</span><span>Sample screens and synthetic services. Live event rollout is still in progress.</span><Link href="/workspaces">Verify account access</Link></div>
        {children}
        <footer className="workspace-footer">
          <span>WSB Official Championship Platform · Chapter Operations</span>
          <Link href="/help">Operations Manual</Link>
        </footer>
      </div>
    </div>
  );
}
