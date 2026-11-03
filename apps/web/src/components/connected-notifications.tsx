"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceSession, type WorkspaceSession } from "@/lib/account";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { PageHeading } from "./ui";

type NotificationRecord = {
  id: string;
  chapter_id: string;
  recipient_uid: string;
  kind: string;
  title: string;
  message: string;
  href: string;
  created_at: number;
  read_at: number | null;
  revision: number;
};
type NotificationPage = { items: NotificationRecord[]; next_page: string | null; unread_count: number };
type NotificationReadResult = { notification: NotificationRecord; unread_count: number };

function safeNotificationHref(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const destination = new URL(value, window.location.origin);
    return destination.origin === window.location.origin && destination.pathname.startsWith("/");
  } catch { return false; }
}

function validNotification(value: unknown, chapterId: string, uid: string): value is NotificationRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<NotificationRecord>;
  return typeof item.id === "string" && item.id.length > 0 && item.id.length <= 160 &&
    item.chapter_id === chapterId && item.recipient_uid === uid &&
    typeof item.kind === "string" && item.kind.length > 0 && item.kind.length <= 80 &&
    typeof item.title === "string" && item.title.length > 0 && item.title.length <= 240 &&
    typeof item.message === "string" && item.message.length <= 2000 && safeNotificationHref(item.href) &&
    Number.isSafeInteger(item.created_at) && (item.created_at as number) > 0 &&
    (item.read_at === null || (Number.isSafeInteger(item.read_at) && (item.read_at as number) > 0)) &&
    Number.isSafeInteger(item.revision) && (item.revision as number) > 0;
}

function validNotificationPage(value: unknown, chapterId: string, uid: string): value is NotificationPage {
  if (!value || typeof value !== "object") return false;
  const page = value as Partial<NotificationPage>;
  if (!Array.isArray(page.items) || page.items.length > 100 || !page.items.every(item => validNotification(item, chapterId, uid))) return false;
  if (!(page.next_page === null || (typeof page.next_page === "string" && page.next_page.length > 0 && page.next_page.length <= 4096))) return false;
  if (!Number.isSafeInteger(page.unread_count) || (page.unread_count as number) < 0) return false;
  const ids = new Set(page.items.map(item => item.id));
  return ids.size === page.items.length;
}

export function ConnectedNotifications() {
  const { session, user, loading, error: sessionError } = useWorkspaceSession();
  if (loading || (user && !sessionError && (!session || session.uid !== user.uid))) return <main id="main-content" className="workspace-main"><PageHeading title="Notifications" description="Private updates for your selected chapter workspace" /><p role="status">Checking chapter access…</p></main>;
  if (!session || !user || session.uid !== user.uid) return <main id="main-content" className="workspace-main"><PageHeading title="Notifications" description="Private updates for your selected chapter workspace" /><p className="form-error" role="alert">{sessionError || "Sign in to view your notifications."} <Link href="/sign-in">Sign in</Link></p></main>;
  return <NotificationInbox key={JSON.stringify([session.uid, session.chapter_id])} session={session} />;
}

function NotificationInbox({ session }: { session: WorkspaceSession }) {
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const generation = useRef(0);

  const load = useCallback(async (next?: string | null) => {
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const path = `/v1/chapters/${segment(session.chapter_id)}/notifications`;
      const response = await connectedRequest<unknown>(`${path}${next ? `?cursor=${segment(next)}` : ""}`, undefined, "GET", session.uid);
      if (!validNotificationPage(response, session.chapter_id, session.uid)) throw new Error("Notification response could not be verified.");
      if (current === generation.current) {
        setItems(previous => {
          if (!next) return response.items;
          const seen = new Set(previous.map(item => item.id));
          return [...previous, ...response.items.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          })];
        });
        setCursor(response.next_page);
        setUnreadCount(response.unread_count);
      }
    } catch (reason) {
      if (current === generation.current) {
        if (reason instanceof ApiError && [401, 403].includes(reason.status)) { setItems([]); setCursor(null); setUnreadCount(0); }
        setError(reason instanceof Error ? reason.message : "Unable to load notifications.");
      }
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }, [session]);

  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);

  async function markRead(notification: NotificationRecord) {
    if (notification.read_at) return;
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const updated = await connectedRequest<NotificationReadResult>(
        `/v1/chapters/${segment(session.chapter_id)}/notifications/${segment(notification.id)}/read`,
        {},
        "PUT",
        session.uid,
      );
      if (!updated || !validNotification(updated.notification, session.chapter_id, session.uid) || updated.notification.id !== notification.id ||
        updated.notification.read_at === null || updated.notification.revision < notification.revision ||
        !Number.isSafeInteger(updated.unread_count) || updated.unread_count < 0) throw new Error("Notification acknowledgement could not be verified.");
      if (current === generation.current) { setItems(previous => previous.map(item => item.id === updated.notification.id ? updated.notification : item)); setUnreadCount(updated.unread_count); }
    } catch (reason) {
      if (current === generation.current) {
        if (reason instanceof ApiError && [401, 403].includes(reason.status)) { setItems([]); setCursor(null); setUnreadCount(0); }
        setError(reason instanceof Error ? reason.message : "Unable to update this notification.");
      }
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }

  async function markLoadedRead() {
    const pending = items.filter(item => item.read_at === null).slice(0, 30);
    if (!pending.length || busy) return;
    const current = ++generation.current;
    setBusy(true); setBatchRunning(true); setError("");
    try {
      for (const notification of pending) {
        const updated = await connectedRequest<NotificationReadResult>(
          `/v1/chapters/${segment(session.chapter_id)}/notifications/${segment(notification.id)}/read`, {}, "PUT", session.uid,
        );
        if (!updated || !validNotification(updated.notification, session.chapter_id, session.uid) || updated.notification.id !== notification.id ||
          updated.notification.read_at === null || updated.notification.revision < notification.revision ||
          !Number.isSafeInteger(updated.unread_count) || updated.unread_count < 0) throw new Error("Notification acknowledgement could not be verified. Refresh to check the remaining notices.");
        if (current !== generation.current) return;
        setItems(previous => previous.map(item => item.id === updated.notification.id ? updated.notification : item));
        setUnreadCount(updated.unread_count);
      }
    } catch (reason) {
      if (current === generation.current) {
        if (reason instanceof ApiError && [401, 403].includes(reason.status)) { setItems([]); setCursor(null); setUnreadCount(0); }
        setError(reason instanceof Error ? reason.message : "Unable to update all selected notifications. Retry the remaining notices.");
      }
    } finally { if (current === generation.current) { setBusy(false); setBatchRunning(false); } }
  }

  return <main id="main-content" className="workspace-main">
    <PageHeading title="Notifications" description={`Private updates for your selected chapter workspace · ${unreadCount} unread`} />
    <div className="connected-stack">
      <>
        {busy && <p role="status">{items.length ? "Updating or loading notifications…" : "Loading notifications…"}</p>}
        {items.length === 0 && !busy && !error && <section className="panel"><h2>{unreadCount === 0 ? "You’re up to date" : "No notifications loaded"}</h2><p>{unreadCount === 0 ? "No chapter notifications have been recorded for this account." : "Unread updates are recorded, but no notification is available on this page. Refresh or contact support."}</p></section>}
        {items.map(item => <article className="panel" key={item.id}>
          <div className="panel-heading">
            <div><h2>{item.title}</h2><p>{new Date(item.created_at * 1000).toLocaleString()}</p></div>
            {item.read_at ? <span className="muted">Read</span> : <span className="status status-amber"><span className="status-dot" aria-hidden="true"/>New</span>}
          </div>
          <p>{item.message}</p>
          <div className="form-actions">
            <Link className="text-link" href={item.href}>Open workspace <span aria-hidden="true">→</span></Link>
            {!item.read_at && <button className="button button-outline" disabled={busy} onClick={() => void markRead(item)}>Mark as read</button>}
          </div>
        </article>)}
        {cursor && <button className="button button-outline" disabled={busy} onClick={() => void load(cursor)}>{busy ? "Loading…" : "Load more"}</button>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-outline" disabled={busy || !items.some(item => item.read_at === null)} onClick={() => void markLoadedRead()}>Mark up to 30 loaded notices as read</button>
        {batchRunning && <button type="button" className="button button-outline" onClick={() => { generation.current++; setBatchRunning(false); setBusy(false); setError("Stopped. An in-flight update may still finish; refresh to see the current unread count before retrying."); }}>Stop marking read</button>}
        <p className="fineprint">Only loaded notices are updated. If the action stops, refresh and retry the remaining unread notices.</p>
        <button className="button button-outline" disabled={busy} onClick={() => void load()}>Refresh</button>
      </>
    </div>
  </main>;
}
