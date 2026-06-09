import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/rooms/:code/history  -> full match history for replay (all hands, all actions)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const room = getRoom(code);
  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });

  return NextResponse.json({
    code: room.code,
    status: room.status,
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
    })),
    history: room.history,
    results: room.results,
  });
}
