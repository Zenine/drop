import { Hono } from 'hono';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { securityMiddleware } from './middleware/security.js';

const app = new Hono();

// Apply middleware
app.use('*', rateLimitMiddleware);
app.use('*', securityMiddleware);

// Health check / root
app.get('/', (c) => c.text('vibefs running'));

// robots.txt
app.get('/robots.txt', (c) => {
  return c.text('User-agent: *\nDisallow: /\n', 200, {
    'Content-Type': 'text/plain',
  });
});

export { app };
