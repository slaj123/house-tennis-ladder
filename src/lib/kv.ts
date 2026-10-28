import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { INITIAL_PLAYERS, MATCHES_KEY, PLAYERS_KEY, type Match, type Player } from "@/lib/types";

interface Store {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  hset(key: string, field: string, value: unknown): Promise<unknown>;
  hdel(key: string, field: string): Promise<unknown>;
  hgetall<T>(key: string): Promise<Record<string, T>>;
  del(key: string): Promise<unknown>;
  /** Increments a counter, starting a TTL window on first hit. Returns the new count. */
  incrWithTtl(key: string, ttlSeconds: number): Promise<number>;
}

const hasRedisEnv = Boolean(
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
);

function redisStore(): Store {
  const r = Redis.fromEnv();
  return {
    get: (key) => r.get(key),
    set: (key, value) => r.set(key, value),
    hset: (key, field, value) => r.hset(key, { [field]: value }),
    hdel: (key, field) => r.hdel(key, field),
    hgetall: async <T,>(key: string) => (await r.hgetall<Record<string, T>>(key)) ?? {},
    del: (key) => r.del(key),
    async incrWithTtl(key, ttlSeconds) {
      const count = await r.incr(key);
      if (count === 1) await r.expire(key, ttlSeconds);
      return count;
    },
  };
}

// Local fallback for testing without an Upstash account: data lives in a
// gitignored JSON file so it survives dev-server restarts.
function fileStore(): Store {
  const file = path.join(process.cwd(), ".data", "local-store.json");
  const read = (): Record<string, unknown> => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return {};
    }
  };
  const write = (data: Record<string, unknown>) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  };
  const hash = (data: Record<string, unknown>, key: string) =>
    (data[key] as Record<string, unknown> | undefined) ?? {};
  const counters = new Map<string, { count: number; resetAt: number }>();

  return {
    async get<T>(key: string) {
      return (read()[key] as T) ?? null;
    },
    async set(key, value) {
      const data = read();
      data[key] = value;
      write(data);
    },
    async hset(key, field, value) {
      const data = read();
      data[key] = { ...hash(data, key), [field]: value };
      write(data);
    },
    async hdel(key, field) {
      const data = read();
      const h = hash(data, key);
      delete h[field];
      data[key] = h;
      write(data);
    },
    async hgetall<T>(key: string) {
      return hash(read(), key) as Record<string, T>;
    },
    async del(key) {
      const data = read();
      delete data[key];
      write(data);
    },
    async incrWithTtl(key, ttlSeconds) {
      const now = Date.now();
      const entry = counters.get(key);
      if (!entry || entry.resetAt <= now) {
        counters.set(key, { count: 1, resetAt: now + ttlSeconds * 1000 });
        return 1;
      }
      entry.count++;
      return entry.count;
    },
  };
}

// Production always uses Redis, so a missing env var fails loudly instead of
// silently writing to a throwaway file on the server.
const useRedis = hasRedisEnv || process.env.NODE_ENV === "production";

const kv: Store = useRedis ? redisStore() : fileStore();

export async function getPlayers(): Promise<Player[]> {
  const players = (await kv.get<Player[]>(PLAYERS_KEY)) ?? INITIAL_PLAYERS;
  return players.map(({ id, name }) => ({ id, name }));
}

export async function setPlayers(players: Player[]): Promise<void> {
  await kv.set(PLAYERS_KEY, players);
}

export async function getMatches(): Promise<Match[]> {
  return Object.values(await kv.hgetall<Match>(MATCHES_KEY));
}

export async function saveMatch(match: Match): Promise<void> {
  await kv.hset(MATCHES_KEY, match.id, match);
}

export async function deleteMatch(id: string): Promise<void> {
  await kv.hdel(MATCHES_KEY, id);
}

export async function clearMatches(): Promise<void> {
  await kv.del(MATCHES_KEY);
}

/** True if this key has made more than `limit` calls in the current window. */
export async function isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  return (await kv.incrWithTtl(`tennis:ratelimit:${key}`, windowSeconds)) > limit;
}
