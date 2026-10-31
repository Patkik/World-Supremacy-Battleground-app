import { NativeApplication } from "@/components/native-application";

export default async function Page({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const query = await searchParams;
  const initialKind = query.type === "chapter" ? "chapter_application" : query.type === "partner" ? "partner_application" : "studio_application";
  return <NativeApplication initialKind={initialKind} />;
}
