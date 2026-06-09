import Redis from "ioredis";
import type { Room } from "./engine/types";

const DEFAULT_REDIS_URL = "redis://localhost:6379";
const ROOM_KEY_PREFIX = "agentpoker:room:";
const INVALIDATE_CHANNEL = "agentpoker:invalidate";
export const EVENTS_CHANNEL = "agentpoker:events";
const ROOM_TTL_SECONDS = 86_400;

let redis: Redis | null = null;
let subscriber: Redis | null = null;
let eventsSubscriber: Redis | null = null;
let invalidateHandler: ((code: string) => void) | null = null;
let subscriberReady = false;
let eventsSubscriberReady = false;
let eventsHandler: ((code: string) => void) | null = null;

export function getRedisUrl(): string {
  return process.env.REDIS_URL?.trim() || DEFAULT_REDIS_URL;
}

function roomKey(code: string): string {
  return `${ROOM_KEY_PREFIX}${code.toUpperCase()}`;
}

function attachErrorHandler(client: Redis): void {
  client.on("error", () => {
    // Swallow connection errors; callers surface failures on command.
  });
}

export function getRedis(): Redis {
  if (redis) return redis;
  redis = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
  attachErrorHandler(redis);
  return redis;
}

export function onRoomInvalidated(handler: (code: string) => void): void {
  invalidateHandler = handler;
}

async function ensureSubscriber(): Promise<void> {
  if (subscriberReady) return;

  subscriber = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  attachErrorHandler(subscriber);
  await subscriber.connect();
  await subscriber.subscribe(INVALIDATE_CHANNEL);
  subscriber.on("message", (_channel, message) => {
    const code = message.trim().toUpperCase();
    if (code) invalidateHandler?.(code);
  });
  subscriberReady = true;
}

export async function publishRoomUpdate(code: string): Promise<void> {
  const client = getRedis();
  await client.connect().catch(() => undefined);
  await client.publish(EVENTS_CHANNEL, code.toUpperCase());
}

export async function cacheRoom(room: Room): Promise<void> {
  const client = getRedis();
  await client.connect().catch(() => undefined);
  await ensureSubscriber();
  await client.set(
    roomKey(room.code),
    JSON.stringify(room),
    "EX",
    ROOM_TTL_SECONDS,
  );
  await client.publish(INVALIDATE_CHANNEL, room.code);
  await client.publish(EVENTS_CHANNEL, room.code);
}

export async function ensureEventsSubscriber(
  handler: (code: string) => void,
): Promise<void> {
  eventsHandler = handler;
  if (eventsSubscriberReady) return;

  eventsSubscriber = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  attachErrorHandler(eventsSubscriber);
  await eventsSubscriber.connect();
  await eventsSubscriber.subscribe(EVENTS_CHANNEL);
  eventsSubscriber.on("message", (_channel, message) => {
    const code = message.trim().toUpperCase();
    if (code) eventsHandler?.(code);
  });
  eventsSubscriberReady = true;
}

export async function getCachedRoom(code: string): Promise<Room | null> {
  const client = getRedis();
  await client.connect().catch(() => undefined);
  const raw = await client.get(roomKey(code));
  if (!raw) return null;
  return JSON.parse(raw) as Room;
}

export async function invalidateCachedRoom(code: string): Promise<void> {
  const client = getRedis();
  await client.connect().catch(() => undefined);
  await client.del(roomKey(code));
}

export async function flushRoomCache(): Promise<void> {
  const client = getRedis();
  await client.connect().catch(() => undefined);
  let cursor = "0";
  do {
    const [next, keys] = await client.scan(
      cursor,
      "MATCH",
      `${ROOM_KEY_PREFIX}*`,
      "COUNT",
      100,
    );
    cursor = next;
    if (keys.length > 0) await client.del(...keys);
  } while (cursor !== "0");
}

export async function closeRedis(): Promise<void> {
  subscriberReady = false;
  eventsSubscriberReady = false;
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
  }
  if (eventsSubscriber) {
    await eventsSubscriber.quit();
    eventsSubscriber = null;
  }
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
