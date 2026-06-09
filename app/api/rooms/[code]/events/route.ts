import { NextRequest } from "next/server";
import {
  formatSse,
  pushRoomSnapshot,
  subscribeRoomEvents,
  type RoomEventClient,
} from "@/lib/room-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/rooms/:code/events — SSE stream (meta + state + history on each update)
// Query: playerId & token (agent view) | revealAll=1 (spectator god-mode)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const url = new URL(req.url);
  const playerId = url.searchParams.get("playerId");
  const token = url.searchParams.get("token");
  const revealAll = url.searchParams.get("revealAll") === "1";

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const client: RoomEventClient = {
        id: crypto.randomUUID(),
        code,
        playerId,
        token,
        revealAll,
        closed: false,
        enqueue(chunk) {
          if (client.closed) return;
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {
            client.closed = true;
          }
        },
      };

      unsubscribe = subscribeRoomEvents(client);

      void pushRoomSnapshot(client).catch(() => {
        client.enqueue(
          formatSse({ type: "error", message: "failed to load room" }, "error"),
        );
      });

      heartbeat = setInterval(() => {
        if (client.closed) return;
        client.enqueue(formatSse({ type: "ping" }));
      }, 20_000);

      req.signal.addEventListener("abort", () => {
        client.closed = true;
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
