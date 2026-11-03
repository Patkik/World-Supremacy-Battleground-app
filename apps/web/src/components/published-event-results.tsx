import Link from "next/link";
import { EmptyState, PageHeading } from "./ui";
type Published = { publication_id: string; chapter_id: string; event_id: string; division_id: string; digest: string; published_at: number; results: { entry_id: string; crew_id: string; raw_average: number; total_deductions: number; final_score: number; rank: number }[] };

function isPublished(value: unknown, eventId: string): value is Published {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<Published>;
  if (snapshot.event_id !== eventId || typeof snapshot.chapter_id !== "string" || !snapshot.chapter_id || typeof snapshot.publication_id !== "string" || !snapshot.publication_id || typeof snapshot.division_id !== "string" || !snapshot.division_id || typeof snapshot.digest !== "string" || !/^[a-f0-9]{64}$/i.test(snapshot.digest) || !Number.isSafeInteger(snapshot.published_at) || !Array.isArray(snapshot.results)) return false;
  const entryIds = new Set<string>();
  return snapshot.results.every(result => {
    if (!result || typeof result.entry_id !== "string" || !result.entry_id || entryIds.has(result.entry_id) || typeof result.crew_id !== "string" || !result.crew_id || ![result.raw_average, result.total_deductions, result.final_score].every(Number.isFinite) || result.raw_average < 0 || result.raw_average > 100 || result.total_deductions < 0 || result.final_score < 0 || result.final_score > 100 || !Number.isSafeInteger(result.rank) || result.rank < 1) return false;
    entryIds.add(result.entry_id);
    return true;
  });
}

function isPublishedCollection(value: unknown, eventId: string): value is Published[] {
  if (!Array.isArray(value) || !value.every(item => isPublished(item, eventId))) return false;
  const divisions = new Set<string>();
  const publications = new Set<string>();
  const entries = new Set<string>();
  for (const snapshot of value) {
    if (divisions.has(snapshot.division_id) || publications.has(snapshot.publication_id)) return false;
    divisions.add(snapshot.division_id);
    publications.add(snapshot.publication_id);
    for (const result of snapshot.results) {
      if (entries.has(result.entry_id)) return false;
      entries.add(result.entry_id);
    }
  }
  return true;
}

export async function PublishedEventResults({ eventId, entryId, arena = false }: { eventId: string; entryId?: string; arena?: boolean }) {
  let projections: Published[] = []; let unavailable = false;
  try {
    const response = await fetch(`${process.env.API_URL || process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088"}/v1/events/${encodeURIComponent(eventId)}/published`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Publication service unavailable");
    const payload: unknown = await response.json();
    if (!isPublishedCollection(payload, eventId)) throw new Error("Published results could not be verified");
    projections = payload;
  } catch { unavailable = true; }
  const visible = projections.map(p => ({ ...p, results: entryId ? p.results.filter(r => r.entry_id === entryId) : p.results })).filter(p => p.results.length > 0);
  return <main id="main-content" className={arena ? "published-arena" : "section-wrap"}><PageHeading title="Published results" description="Results appear here after authorized event staff lock and publish the division." />
    {visible.length === 0 ? <EmptyState title={unavailable ? "Results are temporarily unavailable" : "No published results yet"}>{unavailable ? "Please try again when the event service is available." : "Follow the event organizer’s announcements for publication timing."}</EmptyState> : visible.map(publication => <section key={publication.publication_id} className="published-division"><h2>{publication.division_id.replaceAll("-", " ")}</h2><table><caption>Published division standings</caption><thead><tr><th scope="col">Rank</th><th scope="col">Crew</th><th scope="col">Final score</th></tr></thead><tbody>{publication.results.map(result => <tr key={result.crew_id}><td className="mono">{result.rank}</td><th scope="row">{result.crew_id}</th><td className="mono">{result.final_score.toFixed(2)}</td></tr>)}</tbody></table><p className="fineprint">Publication {publication.publication_id}</p></section>)}
    {!arena && <Link className="text-link" href="/results">All results</Link>}
  </main>;
}
