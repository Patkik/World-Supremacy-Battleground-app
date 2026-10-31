import Link from "next/link";
import { EmptyState, PageHeading } from "./ui";
type Published = { publication_id: string; division_id: string; digest: string; published_at: number; results: { entry_id: string; crew_id: string; raw_average: number; total_deductions: number; final_score: number; rank: number }[] };

export async function PublishedEventResults({ eventId, entryId, arena = false }: { eventId: string; entryId?: string; arena?: boolean }) {
  let projections: Published[] = []; let unavailable = false;
  try {
    const response = await fetch(`${process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088"}/v1/events/${encodeURIComponent(eventId)}/published`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Publication service unavailable");
    projections = await response.json();
  } catch { unavailable = true; }
  const visible = projections.map(p => ({ ...p, results: entryId ? p.results.filter(r => r.entry_id === entryId) : p.results })).filter(p => p.results.length > 0);
  return <main id="main-content" className={arena ? "published-arena" : "section-wrap"}><PageHeading title="Published results" description="Results appear here after authorized event staff lock and publish the division." />
    {visible.length === 0 ? <EmptyState title={unavailable ? "Results are temporarily unavailable" : "No published results yet"}>{unavailable ? "Please try again when the event service is available." : "Follow the event organizer’s announcements for publication timing."}</EmptyState> : visible.map(publication => <section key={publication.publication_id} className="published-division"><h2>{publication.division_id.replaceAll("-", " ")}</h2><table><caption>Published division standings</caption><thead><tr><th scope="col">Rank</th><th scope="col">Crew</th><th scope="col">Final score</th></tr></thead><tbody>{publication.results.map(result => <tr key={result.crew_id}><td className="mono">{result.rank}</td><th scope="row">{result.crew_id}</th><td className="mono">{result.final_score.toFixed(2)}</td></tr>)}</tbody></table><p className="fineprint">Publication {publication.publication_id}</p></section>)}
    {!arena && <Link className="text-link" href="/results">All results</Link>}
  </main>;
}
