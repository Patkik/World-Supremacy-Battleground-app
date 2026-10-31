import { EmptyState, PageHeading } from "@/components/ui";
import { WSB } from "@/lib/public-content";
export default function Page() {
  return <main id="main-content" className="section-wrap"><PageHeading title="Season rankings" description="Season standings require published event results and an approved points policy." /><EmptyState title="No season rankings are available in this app">Follow the organizer’s official announcements for competition updates.</EmptyState><a className="button button-outline spaced-link" href={WSB.website}>Official WSB announcements</a></main>;
}
