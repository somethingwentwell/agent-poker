import { NextRequest, NextResponse } from "next/server";
import { addPlayer, getRoomAsync, saveRoom } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/rooms/:code/join  { name } | { playerId, token }  -> credentials + rejoined?
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

  const rejoinId = body.playerId as string | undefined;
  const rejoinToken = body.token as string | undefined;
  if (rejoinId && rejoinToken) {
    const existing = room.players.find((x) => x.id === rejoinId);
    if (!existing || existing.token !== rejoinToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }
    existing.lastSeen = Date.now();
    existing.connected = true;
    await saveRoom(room);
    return NextResponse.json({
      roomCode: room.code,
      playerId: existing.id,
      token: existing.token,
      avatar: existing.avatar,
      name: existing.name,
      rejoined: room.status !== "lobby",
    });
  }

  if (room.status !== "lobby") {
    return NextResponse.json({ error: "game already started" }, { status: 409 });
  }
  if (room.players.length >= 10) {
    return NextResponse.json({ error: "room full" }, { status: 409 });
  }

  const player = addPlayer(room, body.name || "");
  await saveRoom(room);
  return NextResponse.json({
    roomCode: room.code,
    playerId: player.id,
    token: player.token,
    avatar: player.avatar,
    name: player.name,
    rejoined: false,
  });
}
