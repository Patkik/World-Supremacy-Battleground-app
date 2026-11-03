import Link from "next/link";
import { PageHeading } from "@/components/ui";
export default function StoriesPage() {
  return <main id="main-content" className="section-wrap"><PageHeading title="Stories" description="News and stories from the WSB community." /><section className="panel max-w-3xl"><h2>No stories published here yet</h2><p>Editorial stories will appear when they are available.</p><Link className="text-link" href="/contact">Contact WSB</Link></section></main>;
}
