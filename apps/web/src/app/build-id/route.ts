import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const buildId = (await readFile(join(process.cwd(), ".next", "BUILD_ID"), "utf8")).trim();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(buildId)) throw new Error("Invalid application build identifier");
    return Response.json({ buildId }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "build_id_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
