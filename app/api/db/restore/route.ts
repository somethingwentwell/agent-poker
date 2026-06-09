import { NextResponse } from "next/server";
import { authorizeDump } from "@/lib/dump-auth";
import { importDatabase } from "@/lib/dump";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/db/restore — import rooms from a dump JSON body
export async function POST(req: Request) {
  if (!authorizeDump(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const url = new URL(req.url);
  const replace = url.searchParams.get("replace") === "1";

  try {
    const result = await importDatabase(body, { replace });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "restore failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
