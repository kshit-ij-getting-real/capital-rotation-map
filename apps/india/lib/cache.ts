import { Redis } from '@upstash/redis';

const ttlPrice = 900;

function client() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function getCache<T>(key: string): Promise<T | null> {
  const c = client();
  if (!c) return null;
  return c.get<T>(key);
}

export async function setPriceCache<T>(key: string, value: T): Promise<void> {
  const c = client();
  if (!c) return;
  await c.set(key, value, { ex: ttlPrice });
}
