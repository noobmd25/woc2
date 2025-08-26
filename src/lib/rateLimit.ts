const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

interface RateRecord {
  count: number;
  expires: number;
}

const hits = new Map<string, RateRecord>();

export function rateLimit(id: string): boolean {
  const now = Date.now();
  const entry = hits.get(id);
  if (!entry || entry.expires < now) {
    hits.set(id, { count: 1, expires: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return true;
  }
  return false;
}
