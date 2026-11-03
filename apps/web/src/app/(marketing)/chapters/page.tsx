import type { Metadata } from "next";
import {ChapterDirectory} from "@/components/chapter-directory";
export const metadata: Metadata = { title: "Chapters", description: "Find World Supremacy Battlegrounds chapter information and official country listings.", alternates: { canonical: "/chapters" } };
export default function Page(){return <ChapterDirectory/>}
