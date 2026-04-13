import type { Context, Next } from 'hono';

const RATE_LIMIT = 300;
const RATE_WINDOW = 60; // seconds
const RATE_CLEANUP_INTERVAL = 300; // seconds

const rateLimits = new Map<string, number[]>();
let lastCleanup = Date.now() / 1000;

function getClientIp(c: Context): string {
  // CF-Connecting-IP (Cloudflare) takes priority
  const cfIp = c.req.header('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  // X-Forwarded-For: last entry is from closest trusted proxy
  const xff = c.req.header('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',');
    return parts[parts.length - 1].trim();
  }

  // Fallback to connection info
  return c.req.header('x-real-ip') || '127.0.0.1';
}

export async function rateLimitMiddleware(c: Context, next: Next): Promise<Response | void> {
  const ip = getClientIp(c);
  const now = Date.now() / 1000;

  // Periodic cleanup of stale IPs
  if (now - lastCleanup > RATE_CLEANUP_INTERVAL) {
    for (const [k, v] of rateLimits) {
      if (!v.length || v[v.length - 1] < now - RATE_WINDOW) {
        rateLimits.delete(k);
      }
    }
    lastCleanup = now;
  }

  let entries = rateLimits.get(ip);
  if (entries) {
    entries = entries.filter(t => now - t < RATE_WINDOW);
    rateLimits.set(ip, entries);
  } else {
    entries = [];
    rateLimits.set(ip, entries);
  }

  if (entries.length >= RATE_LIMIT) {
    return c.text('Rate limit exceeded', 429);
  }
  entries.push(now);

  await next();
}
