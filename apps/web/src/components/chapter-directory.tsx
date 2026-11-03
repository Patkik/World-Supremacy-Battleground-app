import Link from "next/link";
import {PageHeading,Arrow} from "./ui";
import {WSB} from "@/lib/public-content";
export function ChapterDirectory(){return <main id="main-content" className="section-wrap">
  <PageHeading eyebrow="World Supremacy Battlegrounds" title="Find your WSB chapter" description="Use WSB’s official country directory for current listings. This site does not yet maintain a verified chapter directory."/>
  <div className="chapter-list">
    <div className="chapter-directory-row"><span className="mono" aria-hidden="true">↗</span><div><h2>Official country directory</h2><p>Open the organization’s current chapter and country reference.</p></div><a href={WSB.countries} className="text-link" rel="noreferrer">Visit WSB directory <Arrow diagonal/></a></div>
    <div className="chapter-directory-row"><span className="mono" aria-hidden="true">WSB</span><div><h2>Propose a chapter partnership</h2><p>Send a private proposal through the WSB-owned intake form.</p></div><Link href="/community/apply?type=chapter" className="text-link">Start a proposal <Arrow/></Link></div>
  </div>
</main>}
