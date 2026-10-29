import Link from "next/link";
import { Arrow, Brand } from "./ui";
import {WSB} from "@/lib/public-content";
import {MotionPreference} from "./motion-preference";
export function PublicFooter() {
 return <footer className="public-footer"><div className="footer-top"><Brand/><p>Different cities. Same language.<br/>One worldwide movement.</p><a href={WSB.contact} className="text-link">Get in touch <Arrow diagonal/></a></div><div className="footer-bottom"><span>© {new Date().getUTCFullYear()} World Supremacy Battlegrounds</span><nav aria-label="Footer"><a href={WSB.channel} target="_blank" rel="noreferrer">WSBstreet on YouTube ↗</a><Link href="/help#privacy">Privacy & accessibility</Link><Link href="/help">Help & contact</Link><MotionPreference/></nav><span>Made for the movement.</span></div></footer>;
}
