"use client";

import { useCallback, useEffect, useState } from "react";
import { Arrow, PageHeading, Status } from "@/components/ui";
import { ApiError, connectedRequest, segment } from "@/lib/connected-api";
import { useAccount } from "@/lib/account";

type Chapter = { id: string; name: string; currency: string };
type ChapterPage = { items: Chapter[]; next_page: string | null };

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return "Your session expired. Sign in again to view chapters.";
  if (error instanceof ApiError && error.status === 403) return "Only an authorized Global HQ administrator can view the chapter directory.";
  if (error instanceof ApiError && error.status === 503) return "Chapter storage is unavailable. No chapter information was returned.";
  return error instanceof Error ? error.message : "Unable to load chapter records.";
}

export default function GlobalChapterAdministrationPage() {
  const { user } = useAccount();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (next?: string | null) => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const suffix = next ? `?cursor=${segment(next)}&limit=30` : "?limit=30";
      const page = await connectedRequest<ChapterPage>(`/v1/hq/chapters${suffix}`, undefined, "GET", user.uid);
      if (!Array.isArray(page.items) || page.items.some(chapter => typeof chapter.id !== "string" || !chapter.id || typeof chapter.name !== "string" || !/^[A-Z]{3}$/.test(chapter.currency)) || (page.next_page !== null && typeof page.next_page !== "string")) throw new Error("The chapter directory response could not be verified.");
      setChapters(current => next ? [...current, ...page.items] : page.items);
      setCursor(page.next_page);
    } catch (cause) {
      setError(errorMessage(cause));
      if (!next) setChapters([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) void load(); }, [load, user]);

  return <main id="main-content" className="workspace-main">
    <PageHeading
      eyebrow="Global HQ / chapter records"
      title="Chapter directory"
      description="Read chapter names and currency settings saved in the current database. This directory does not represent licensing status or affiliation approval."
      action={<button className="button button-outline" type="button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"} <Arrow /></button>}
    />
    <section className="panel">
      <div className="panel-heading"><div><h2>Saved chapters</h2><p>{chapters.length} records loaded. More records may be available on later pages.</p></div><Status>Read only</Status></div>
      {error && <div role="alert"><p className="form-error">{error}</p><button type="button" className="button button-outline" onClick={() => void load()} disabled={loading}>Retry</button></div>}
      {loading && <p role="status">Loading chapter records…</p>}
      {!loading && !error && chapters.length === 0 && <p>No chapter records are available in this database.</p>}
      <div className="connected-stack">
        {chapters.map(chapter => <article className="panel" key={chapter.id}>
          <div className="panel-heading"><div><h3>{chapter.name}</h3><p className="mono">{chapter.id}</p></div></div>
          <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="eyebrow">Currency code</dt><dd className="font-mono">{chapter.currency}</dd></div><div><dt className="eyebrow">Record source</dt><dd>Current chapter document</dd></div></dl>
        </article>)}
      </div>
      {cursor && !loading && !error && <button type="button" className="button button-outline mt-4" onClick={() => void load(cursor)}>Load more chapters</button>}
    </section>
    <p className="fineprint">Director contact details, license periods, seed quotas and chapter status are not present in this record model. No values for those fields are inferred here.</p>
  </main>;
}
