/**
 * Verify routes: GET /verify and POST /verify
 */

import { Hono } from 'hono';
import { loadConfig } from '../../shared/config.js';
import { checkExpiredAuth, setAuthCookie, safeCompare } from '../middleware/auth.js';
import { verifyPageHtml } from '../render/html-templates.js';

const verifyRoutes = new Hono();

verifyRoutes.get('/verify', (c) => {
  const nextUrl = c.req.query('next') || '/';
  const cfg = loadConfig();
  const password = cfg.password as string | undefined;

  if (!password) {
    return c.text('No password configured', 403);
  }

  if (checkExpiredAuth(c, password)) {
    return c.redirect(nextUrl);
  }

  return c.html(verifyPageHtml({ nextUrl, error: '' }));
});

verifyRoutes.post('/verify', async (c) => {
  const body = await c.req.parseBody();
  let nextUrl = (body.next as string) || '/';
  if (!nextUrl.startsWith('/')) {
    nextUrl = '/';
  }

  const cfg = loadConfig();
  const password = cfg.password as string | undefined;
  if (!password) {
    return c.text('No password configured', 403);
  }

  const submitted = (body.password as string) || '';
  if (safeCompare(submitted, password)) {
    setAuthCookie(c, password);
    return c.redirect(nextUrl);
  } else {
    return c.html(verifyPageHtml({ nextUrl, error: 'Incorrect password' }));
  }
});

export { verifyRoutes };
