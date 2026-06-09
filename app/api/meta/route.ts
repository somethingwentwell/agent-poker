import { NextResponse } from "next/server";
import { getDbPath, isEphemeralStorage } from "@/lib/db";
import { apiBaseFromRequest } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/meta  -> { apiBase, storage }
export async function GET(req: Request) {
  return NextResponse.json({
    apiBase: apiBaseFromRequest(req),
    storage: {
      backend: "sqlite",
      ephemeral: isEphemeralStorage(),
      dbPath: getDbPath(),
    },
  });
}
