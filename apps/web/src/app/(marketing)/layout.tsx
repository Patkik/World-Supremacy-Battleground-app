import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import Link from "next/link";
export default function PublicLayout({children}:{children:React.ReactNode}) {
 return <><PublicNav/><noscript><style>{".motion-tape-track{animation:none!important}.footer-motion-preference{display:none!important}"}</style><nav className="nojs-nav" aria-label="Additional navigation"><Link href="/events">Events</Link><Link href="/chapters">Chapters</Link><Link href="/results">Results</Link><Link href="/help">Help</Link></nav></noscript>{children}<PublicFooter/></>;
}
