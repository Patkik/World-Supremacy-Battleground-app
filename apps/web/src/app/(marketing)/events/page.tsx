import type { Metadata } from "next";
import {UpcomingEvents} from "@/components/upcoming-events";
export const metadata: Metadata = { title: "Events", description: "Explore published World Supremacy Battlegrounds event information and organizer updates.", alternates: { canonical: "/events" } };
export default function Page(){return <UpcomingEvents/>}
