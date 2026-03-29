/**
 * Owner auth route: GET /owner/auth
 */

import { Hono } from 'hono';
import { getOwnerKey } from '../../shared/config.js';
import { setOwnerCookie, safeCompare } from '../middleware/auth.js';

const ownerRoutes = new Hono();

ownerRoutes.get('/owner/auth', (c) => {
  const key = c.req.query('key') || '';
  let nextUrl = c.req.query('next') || '/dashboard';
  if (!nextUrl.startsWith('/')) {
    nextUrl = '/dashboard';
  }

  const ownerKey = getOwnerKey();
  if (!key || !safeCompare(key, ownerKey)) {
    return c.text('Invalid key', 403);
  }

  setOwnerCookie(c);
  return c.redirect(nextUrl);
});

export { ownerRoutes };
