import Link from "next/link";
import type { Metadata } from "next";
import { PageHeading } from "@/components/ui";
export const metadata: Metadata = { title: "Media", description: "Press and media inquiry information for World Supremacy Battlegrounds.", alternates: { canonical: "/media" } };
export default function MediaPage() {
  return <main id="main-content" className="section-wrap"><PageHeading title="Media" description="Press and media inquiries for WSB." /><section className="panel max-w-3xl"><h2>Media information</h2><p>Press releases and media materials are not published in this system yet. Contact the WSB team for media inquiries.</p><Link className="button button-outline" href="/contact">Contact WSB</Link></section></main>;
}
