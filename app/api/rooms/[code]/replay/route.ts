import { NextRequest, NextResponse } from "next/server";
import {
  buildReplayExport,
  replayFilename,
} from "@/lib/replay-export";
import { getRoom } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/rooms/:code/replay  — full replay export (finished matches)
// ?download=1  → Content-Disposition attachment
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const room = await getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "room not found" }, { status: 404 });
  }

  if (room.status !== "finished") {
    return NextResponse.json(
      { error: "replay available only after the match ends" },
      { status: 409 },
    );
  }

  const payload = buildReplayExport(room);
  const download = req.nextUrl.searchParams.get("download") === "1";
  const body = JSON.stringify(payload, null, 2);

  if (download) {
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${replayFilename(room.code)}"`,
      },
    });
  }

  return NextResponse.json(payload);
}
