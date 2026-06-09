import { NextResponse } from "next/server";
import { authorizeDump } from "@/lib/dump-auth";
import { exportDatabase } from "@/lib/dump";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/db/dump — JSON export of all rooms (Bearer DUMP_SECRET in production)
export async function GET(req: Request) {
  if (!authorizeDump(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dump = await exportDatabase();
  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";

  return NextResponse.json(dump, {
    headers: download
      ? {
          "Content-Disposition": `attachment; filename="agentpoker-dump-${dump.exportedAt.slice(0, 10)}.json"`,
        }
      : undefined,
  });
}
