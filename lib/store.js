const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);

function createRedisStore() {
  const cmd = async (...args) => {
    const res = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.result;
  };
  return {
    async get(key) {
      const v = await cmd("GET", key);
      return v == null ? null : parse(v);
    },
    async set(key, value, ttl) {
      await cmd("SET", key, JSON.stringify(value), "EX", ttl);
    },
    async hset(key, field, value, ttl) {
      await cmd("HSET", key, field, JSON.stringify(value));
      await cmd("EXPIRE", key, ttl);
    },
    async hget(key, field) {
      const v = await cmd("HGET", key, field);
      return v == null ? null : parse(v);
    },
    async hgetall(key) {
      const flat = (await cmd("HGETALL", key)) || [];
      const out = {};
      for (let i = 0; i < flat.length; i += 2) out[flat[i]] = parse(flat[i + 1]);
      return out;
    },
  };
}

function createMemoryStore() {
  const g = globalThis;
  const data = (g.__bingoStore ||= new Map());
  const read = (key) => {
    const e = data.get(key);
    if (!e) return null;
    if (e.exp < Date.now()) {
      data.delete(key);
      return null;
    }
    return e;
  };
  return {
    async get(key) {
      const e = read(key);
      return e ? e.v : null;
    },
    async set(key, value, ttl) {
      data.set(key, { v: value, exp: Date.now() + ttl * 1000 });
    },
    async hset(key, field, value, ttl) {
      const e = read(key) || { v: {} };
      e.v[field] = value;
      e.exp = Date.now() + ttl * 1000;
      data.set(key, e);
    },
    async hget(key, field) {
      const e = read(key);
      return e?.v[field] ?? null;
    },
    async hgetall(key) {
      const e = read(key);
      return e ? { ...e.v } : {};
    },
  };
}

export const store = URL && TOKEN ? createRedisStore() : createMemoryStore();
