import type { Context, Next } from 'hono';

export async function securityMiddleware(c: Context, next: Next): Promise<void> {
  await next();
  c.header('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Content-Type-Options', 'nosniff');
}
