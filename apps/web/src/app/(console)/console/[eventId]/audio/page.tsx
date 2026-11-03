"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWorkspaceSession } from "@/lib/account";
import { ApiError, apiBase, segment } from "@/lib/connected-api";
import { apiToken } from "@/lib/firebase/api-session";
import { firebaseClient } from "@/lib/firebase/client";
import { Arrow, PageHeading, Status } from "@/components/ui";

type SaveFileWindow = Window & {
  showSaveFilePicker?: (options: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<{ createWritable: () => Promise<WritableStream> }>;
};

function downloadError(status: number) {
  if (status === 401) return "Your session expired. Sign in again, then retry the export.";
  if (status === 403) return "This account is not assigned to this event's audio operations.";
  if (status === 404) return "The event or its current lineup records could not be found.";
  if (status === 409) return "The event or lineup changed. Refresh the page and create a new export.";
  if (status === 503) return "The private media service is unavailable. No export was completed; retry when it is available.";
  if (status === 501) return "DJ export is not enabled for this environment.";
  return "The export could not be completed. Retry after checking event access and media availability.";
}

export default function DjAudioDeskPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const { session, loading: sessionLoading, error: sessionError } = useWorkspaceSession();
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const activeDownload = useRef<AbortController | null>(null);
  const chapterId = session?.chapter_id ?? "";
  const uid = session?.uid ?? "";
  useEffect(() => {
    setDownloading(false); setError(""); setMessage("");
    return () => { activeDownload.current?.abort(); activeDownload.current = null; };
  }, [uid, chapterId, eventId]);
  const authorized = !!session && ["audio_operator", "chapter_director"].includes(session.role);
  const download = async () => {
    if (!session || downloading || typeof navigator !== "undefined" && !navigator.onLine) {
      if (typeof navigator !== "undefined" && !navigator.onLine) setError("Connect to the event service before creating an export.");
      return;
    }
    setDownloading(true);
    const controller = new AbortController();
    activeDownload.current = controller;
    setError("");
    setMessage("");
    try {
      const user = firebaseClient().auth.currentUser;
      if (!user || user.uid !== session.uid) throw new ApiError(401, "Sign in again to continue.");
      const response = await fetch(`${apiBase}/v1/chapters/${segment(chapterId)}/events/${segment(eventId)}/dj-export`, {
        method: "GET", cache: "no-store", signal: controller.signal, headers: { Authorization: `Bearer ${await apiToken(user)}` },
      });
      if (!response.ok) throw new ApiError(response.status, downloadError(response.status));
      if (!response.body) throw new Error("The browser did not provide an export stream. Try a current browser or save from a desktop device.");
      const filename = response.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/i)?.[1] ?? `wsb-${eventId}.zip`;
      const picker = (window as SaveFileWindow).showSaveFilePicker;
      if (picker) {
        const handle = await picker({ suggestedName: filename, types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }] });
        if (controller.signal.aborted) return;
        const destination = await handle.createWritable();
        try { await response.body.pipeTo(destination, { signal: controller.signal }); }
        catch { throw new Error("The download was interrupted or a track failed its safety check. The ZIP was not completed; create a new export and retry."); }
      } else {
        const size = Number(response.headers.get("X-WSB-Export-Bytes") ?? 0);
        if (size > 128 * 1024 * 1024) {
          await response.body.cancel();
          throw new Error("This export is too large for this browser's download method. Use a browser with streaming file save support.");
        }
        let blob: Blob;
        try { blob = await new Response(response.body).blob(); }
        catch { throw new Error("The download was interrupted or a track failed its safety check. The ZIP was not completed; create a new export and retry."); }
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
      if (!controller.signal.aborted) setMessage(`Event export saved. It contains ${response.headers.get("X-WSB-Export-Track-Count") ?? "the listed"} reviewed track(s) across current event lineups, plus a manifest of lineup revisions and omissions.`);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : "The export could not be completed.");
    } finally {
      if (activeDownload.current === controller) { activeDownload.current = null; setDownloading(false); }
    }
  };

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow={`Event operations / audio / ${eventId}`}
      title="DJ export desk"
      description="Download the reviewed tracks from every current event stage lineup in one package, with division, order, revision, and omission details in its manifest."
      action={<Link href={`/console/${segment(eventId)}/marshal`} className="button button-outline">Marshal desk <Arrow diagonal /></Link>}
    />
    {sessionLoading ? <p role="status">Checking chapter access…</p>
      : !session ? <p role="alert" className="form-error">{sessionError || "Sign in with your chapter account to continue."}</p>
        : !authorized ? <p role="alert" className="form-error">This workspace is available to an assigned audio operator or the chapter director.</p>
          : <div className="connected-stack dj-export-workspace">
            <section className="panel" aria-labelledby="export-heading">
              <div className="panel-heading"><div><h2 id="export-heading">Create the show package</h2><p>Event {eventId} · Chapter {chapterId}</p></div><Status tone="amber">Manual review only</Status></div>
              <p>“Reviewed” records a human review decision. It does not establish competition compliance, audio readiness, or approval under an official rulebook.</p>
              <div className="dj-export-controls">
                <button className="button button-volt" type="button" onClick={() => void download()} disabled={downloading || (typeof navigator === "undefined" || !navigator.onLine)}>
                  {downloading ? "Preparing streamed ZIP…" : "Download full show package"}<Arrow diagonal />
                </button>
              </div>
              <p className="fineprint">The package includes all current event stage lineups. Tracks remain grouped by stage and in that stage’s saved order. The manifest records each entry’s division, lineup revision, and omissions. If any lineup changes, create a fresh package.</p>
              {error && <p role="alert" className="form-error">{error}</p>}
              {message && <p role="status" className="dj-export-success">{message}</p>}
            </section>
            <section aria-labelledby="package-contents">
              <h2 id="package-contents">Package contents</h2>
              <ul className="connected-list">
                <li><strong>manifest.csv</strong><span className="block">Stage, lineup revision and order, division, entry and crew, review or omission state, file format, duration and SHA-256.</span></li>
                <li><strong>Reviewed media</strong><span className="block">Only reviewed, scanner-clean files matching their stored inspection receipt are included.</span></li>
                <li><strong>Omission record</strong><span className="block">Missing, unreviewed, correction-requested, or changed media stays out of the ZIP and is listed in the manifest.</span></li>
              </ul>
              <p className="fineprint">This package is available in the local demo environment. Production private-media export is not enabled.</p>
            </section>
          </div>}
  </main>;
}
