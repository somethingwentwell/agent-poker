import { NextRequest, NextResponse } from "next/server";
import { parseActionThought } from "@/lib/api-contract";
import { authPlayer, getRoomAsync, saveRoom } from "@/lib/store";
import { applyAction } from "@/lib/engine/holdem";
import { playerView } from "@/lib/view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/rooms/:code/action  { playerId, token, action, amount?, thought }
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
  const player = authPlayer(room, body.playerId, body.token);
  if (!player) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  if (room.status !== "playing" || !room.game) {
    return NextResponse.json({ error: "game not in progress" }, { status: 409 });
  }

  const action = body.action as "fold" | "check" | "call" | "raise";
  if (!["fold", "check", "call", "raise"].includes(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const parsedThought = parseActionThought(body.thought);
  if (!parsedThought.ok) {
    return NextResponse.json({ error: parsedThought.error }, { status: 400 });
  }

  const result = applyAction(
    room,
    player.id,
    action,
    body.amount,
    parsedThought.thought,
  );
  if (!result.ok) {
    // 409 for "not your turn" / illegal moves so agents can retry-poll
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  await saveRoom(room);
  return NextResponse.json({ ok: true, state: playerView(room, player.id) });
}
