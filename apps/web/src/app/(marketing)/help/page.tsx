import type { Metadata } from "next";
import {PublicHelp} from "@/components/public-help";
export const metadata: Metadata = { title: "Help", description: "Get help using WSB accounts, crew workspaces and event information.", alternates: { canonical: "/help" } };
export default function Page(){return <PublicHelp/>}
