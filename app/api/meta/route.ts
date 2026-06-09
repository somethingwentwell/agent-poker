import { NextResponse } from "next/server";
import { getDatabaseUrl, isEphemeralStorage } from "@/lib/db";
import { getRedisUrl } from "@/lib/redis";
import { apiBaseFromRequest } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/meta  -> { apiBase, storage }
export async function GET(req: Request) {
  return NextResponse.json({
    apiBase: apiBaseFromRequest(req),
    realtime: "sse",
    storage: {
      backend: "postgres+redis",
      ephemeral: isEphemeralStorage(),
      databaseUrl: getDatabaseUrl(),
      redisUrl: getRedisUrl(),
    },
  });
}
