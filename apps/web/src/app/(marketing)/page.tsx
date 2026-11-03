import Link from "next/link";
import "@fontsource/anton/latin-400.css";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-600.css";
import "../street-landing.css";
import type { Metadata } from "next";
import { Arrow, Status } from "@/components/ui";
import { MarketingMotion } from "@/components/marketing-motion";
import {HeroHighlights} from "@/components/hero-highlights";
import { EntryWalkthrough } from "@/components/entry-walkthrough";
import {WSB} from "@/lib/public-content";
export const metadata: Metadata = { title: "Find street dance events for your crew", description: "Find a WSB event, prepare your crew entry, and follow published competition updates.", alternates: { canonical: "/" } };
function TornEdge() {
 return <svg className="street-divider" viewBox="0 0 1440 28" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 4 35 12 70 3 110 16 155 7 200 19 245 4 290 13 340 6 390 21 440 8 490 17 540 3 590 14 640 7 690 20 740 6 790 15 840 4 890 18 940 8 990 22 1040 6 1090 14 1140 3 1190 18 1240 7 1290 16 1340 4 1390 13 1440 5V28H0Z"/></svg>;
}
export default function Home() {
 return <MarketingMotion><main id="main-content" className="street-landing" tabIndex={-1}>
  <svg className="street-noise" aria-hidden="true" focusable="false" width="100%" height="100%"><defs><filter id="street-grain"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="2" stitchTiles="stitch"/></filter><pattern id="street-grain-tile" width="160" height="160" patternUnits="userSpaceOnUse"><rect width="160" height="160" filter="url(#street-grain)" opacity=".3"/></pattern></defs><rect width="100%" height="100%" fill="url(#street-grain-tile)"/></svg>
  <section className="hero">
   <div className="hero-topline"><span>From the streets. To the world.</span><span className="mono">EST. 2004 / THE MOVEMENT CONTINUES</span></div>
   <div className="hero-composition"><div className="hero-copy"><p className="eyebrow" data-hero-reveal>World Supremacy Battlegrounds</p><h1 aria-label="Find your street dance event.">{["FIND YOUR","STREET DANCE","EVENT."].map((line,i)=><span className={`hero-line ${i===2?"hero-line-volt":""}`} aria-hidden="true" key={line}><span data-hero-line>{line}</span></span>)}</h1><p className="hero-description" data-hero-reveal>Find street dance events for your crew.<br/>Prepare your entry, track what’s outstanding and follow published results.</p><div className="hero-actions" data-hero-reveal><Link className="button button-volt" href="/events">Find an event <Arrow diagonal/></Link><Link href="/workspaces" className="hero-secondary">Open your workspace <Arrow/></Link></div><p className="landing-reassurance" data-hero-reveal>Browse event details before creating an account.</p></div>
    <HeroHighlights/>
    <div className="hero-stamp" aria-hidden="true"><span>NO BOUNDARIES.</span><span>JUST MOVEMENT.</span></div>
   </div>
   <div className="hero-bottom"><span className="hero-bottom-tag"><span className="small-cross" aria-hidden="true">✳</span> Built by the culture. For the culture.</span><span>See how to take part <span aria-hidden="true">↓</span></span></div>
  </section>

  <div className="street-tape-wrap" aria-hidden="true"><div className="motion-tape"><div className="motion-tape-track">{[0,1].map(n=><span className="motion-tape-group" key={n}><span>CREATE.</span><i>✳</i><span>COMPETE.</span><i>✳</i><span>COLLAB.</span><i>✳</i><span>CELEBRATE.</span><i>✳</i></span>)}</div></div></div>
  <TornEdge/>
  <section className="landing-proof section-wrap" aria-label="From the WSB community">
   <div><p className="eyebrow">A stage with history</p><h2>From Melbourne.<br/>To the world.</h2></div>
   <div><p>WSB’s community history traces Battlegrounds back to July 2004 in Melbourne. See the movement through its own story and performance archive.</p><div className="landing-proof-links"><a className="text-link" href={WSB.community} target="_blank" rel="noreferrer">Read WSB’s story <Arrow diagonal/></a><a className="text-link" href={WSB.channel} target="_blank" rel="noreferrer">Watch the official archive <Arrow diagonal/></a></div></div>
  </section>
  <section className="section-wrap" id="events" data-motion-section><div className="section-heading"><div><p className="eyebrow">Choose an event before preparing an entry</p><h2 data-motion-title>FIND YOUR<br/>EVENT.</h2></div><p>Read the event details, then check<br/>the registration options for that event.</p></div><Link href={WSB.championship.route} className="event-feature" data-motion-row><div className="event-date"><span>APR</span><strong>15</strong></div><div className="event-feature-title"><Status>15–18 April 2027 · Hong Kong</Status><h3>WORLD CHAMPIONSHIP</h3><p>Queen Elizabeth Stadium <span>·</span> The world comes together</p></div><div className="event-feature-side"><span>Event details</span><span className="circle-arrow" aria-hidden="true">↗</span></div></Link><div className="section-tail"><a href={WSB.championship.announcement} target="_blank" rel="noreferrer" className="text-link">Read the official announcement <Arrow diagonal/></a><Link href="/events" className="text-link">Find an event <Arrow/></Link></div></section>
  <TornEdge/>
  <section className="journey-section section-wrap landing-journey" id="how-it-works" aria-labelledby="journey-heading" data-motion-section>
   <div><p className="eyebrow">From first visit to event day</p><h2 id="journey-heading" data-motion-title>HOW IT<br/>WORKS.</h2><p className="landing-intro">The crew manager prepares the entry. Dancers provide their own details. Chapter staff review their assigned part of the process.</p><EntryWalkthrough/></div>
   <ol className="journey-list">
    <li data-motion-row><span>01</span><div><h3>Find your event</h3><p>Check dates, location and available registration options before you create an account.</p></div></li>
    <li data-motion-row><span>02</span><div><h3>Prepare your crew and entry</h3><p>Sign in, get chapter access and invite your dancers. Prepare the performing roster, requested evidence and music.</p><details className="landing-details"><summary>Who does what?</summary><p>The manager creates the crew and sends invitations. Each dancer accepts their own invitation and provides their details. Chapter staff approve access separately.</p></details></div></li>
    <li data-motion-row><span>03</span><div><h3>Submit and follow updates</h3><p>Follow the event’s payment instructions, submit for review and respond to corrections from your chapter team.</p><details className="landing-details"><summary>What happens after submission?</summary><p>Submission and a payment reference are separate from approval. Check your workspace for available entry and event-day updates. Results appear publicly only after authorized publication.</p></details></div></li>
   </ol>
  </section>

  <section className="section-wrap landing-faq" id="questions" aria-labelledby="faq-heading">
   <div className="section-heading"><div><p className="eyebrow">Before you start</p><h2 id="faq-heading">GOOD TO<br/>KNOW.</h2></div><p>Your first steps, explained.</p></div>
   <div className="faq">
    <details><summary>Does an event listing mean registration is open?</summary><p>No. Open the event details and check its registration options. Availability and entry requirements depend on the event.</p></details>
    <details><summary>Do I need an account to explore events?</summary><p>You can browse public event details first. To prepare an entry, create a personal account, verify your email and request the appropriate chapter access.</p></details>
    <details><summary>How much does it cost, and when do I pay?</summary><p>Fees, currency, payment instructions and any refund terms depend on the event. Check the event information and your chapter’s instructions before paying. A payment reference does not confirm entry approval.</p></details>
    <details><summary>Can dancers, guardians and staff use the same workspace?</summary><p>Each person uses their own account. Managers invite dancers; guardians use their own account for relationship requests. Judges and event staff need approved chapter access and assigned duties.</p></details>
    <details><summary>Will private documents or unpublished scores appear publicly?</summary><p>Public results use a separate published view. Identity documents, consent records, payments and unpublished judge scores are outside that public view. <Link href="/policies/privacy">Check policy availability</Link> and contact WSB for applicable privacy terms before providing personal information.</p></details>
    <details><summary>What if I need help with an invitation or entry?</summary><p>Use the invitation sent by your manager to join a crew. For access or entry questions, <Link href="/contact">contact support</Link> with the event and chapter involved. Never include passwords or identity documents in a support message.</p></details>
   </div>
  </section>
  <TornEdge/>
  <section className="final-cta" data-motion-section><p>Your crew’s next stage starts with one event.</p><h2 data-motion-title>YOUR NEXT<br/>STEP STARTS HERE.</h2><div className="landing-final-actions"><Link href="/events" className="button button-dark">Find an event <Arrow diagonal/></Link><Link href="/workspaces" className="landing-final-secondary">Open your workspace <Arrow/></Link></div></section>
 </main></MarketingMotion>;
}
