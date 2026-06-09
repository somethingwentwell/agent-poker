import { NextRequest, NextResponse } from "next/server";
import { createRoom, saveRoom } from "@/lib/store";
import { roomMeta } from "@/lib/view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/rooms  { startingChips?, smallBlind?, bigBlind?, maxHands? }
// → { roomCode, hostToken } — no player seat; agents join via /join
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body */
  }
  const room = createRoom({
    startingChips: body.startingChips,
    smallBlind: body.smallBlind,
    bigBlind: body.bigBlind,
    maxHands: body.maxHands,
  });
  saveRoom(room);
  return NextResponse.json({
    roomCode: room.code,
    hostToken: room.hostToken,
    room: roomMeta(room),
  });
}
