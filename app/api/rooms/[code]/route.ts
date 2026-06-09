import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/store";
import { roomMeta } from "@/lib/view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/rooms/:code  -> lobby/meta (used by UI 1s poll)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });
  return NextResponse.json(roomMeta(room));
}
