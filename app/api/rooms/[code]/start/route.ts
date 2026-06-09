import { NextRequest, NextResponse } from "next/server";
import { getRoomAsync, saveRoom } from "@/lib/store";
import { startMatch } from "@/lib/engine/holdem";
import { roomMeta } from "@/lib/view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/rooms/:code/start  { hostToken }  (room creator only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const room = await getRoomAsync(code);
  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  if (!room.hostToken || body.hostToken !== room.hostToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  if (room.status !== "lobby") {
    return NextResponse.json({ error: "already started" }, { status: 409 });
  }
  if (room.players.length < 2) {
    return NextResponse.json({ error: "need at least 2 players" }, { status: 400 });
  }

  startMatch(room);
  saveRoom(room);
  return NextResponse.json({ ok: true, room: roomMeta(room) });
}
