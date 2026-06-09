import { NextRequest, NextResponse } from "next/server";
import { authPlayer } from "@/lib/store";
import { getTickedRoom } from "@/lib/room-tick";
import { playerView } from "@/lib/view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/rooms/:code/state?playerId=&token=
// Returns redacted per-player view. Prefer SSE /events; this remains for one-shot reads.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const room = await getTickedRoom(code);
  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });

  const url = new URL(req.url);
  const playerId = url.searchParams.get("playerId");
  const token = url.searchParams.get("token");

  let viewerId: string | null = null;
  if (playerId && token) {
    const p = authPlayer(room, playerId, token);
    if (p) viewerId = p.id;
  }

  const revealAll =
    viewerId === null && url.searchParams.get("revealAll") === "1";

  return NextResponse.json(playerView(room, viewerId, revealAll));
}
