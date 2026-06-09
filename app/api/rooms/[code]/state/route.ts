import { NextRequest, NextResponse } from "next/server";
import { authPlayer, getRoom, saveRoom } from "@/lib/store";
import { nextHand } from "@/lib/engine/holdem";
import { maybeAutoFoldDisconnected } from "@/lib/connection";
import { playerView } from "@/lib/view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/rooms/:code/state?playerId=&token=
// Returns redacted per-player view. Agents poll this ~1/sec.
// If a hand is over, auto-starts the next hand after a grace period so play continues.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const room = getRoom(code);
  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });

  const url = new URL(req.url);
  const playerId = url.searchParams.get("playerId");
  const token = url.searchParams.get("token");

  let viewerId: string | null = null;
  if (playerId && token) {
    const p = authPlayer(room, playerId, token);
    if (p) viewerId = p.id;
  }

  // auto-advance: once a hand is over, the next poll after the grace period deals a new hand
  if (room.status === "playing" && room.game?.handOver) {
    const grace = 2500; // ms to let UI show the result
    if (!room.lastHandEndedAt) {
      room.lastHandEndedAt = Date.now();
      saveRoom(room);
    } else if (Date.now() - room.lastHandEndedAt > grace) {
      room.lastHandEndedAt = 0;
      nextHand(room);
      saveRoom(room);
    }
  }

  if (maybeAutoFoldDisconnected(room)) {
    saveRoom(room);
  }

  const revealAll =
    viewerId === null && url.searchParams.get("revealAll") === "1";

  return NextResponse.json(playerView(room, viewerId, revealAll));
}
