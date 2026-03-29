import { Hono } from 'hono';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { securityMiddleware } from './middleware/security.js';
import { fileRoutes } from './routes/file.js';
import { dirRoutes } from './routes/dir.js';
import { gitRoutes } from './routes/git.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { verifyRoutes } from './routes/verify.js';
import { ownerRoutes } from './routes/owner.js';
import { liveRoutes } from './routes/live.js';

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

// Register all route modules
app.route('/', fileRoutes);
app.route('/', dirRoutes);
app.route('/', gitRoutes);
app.route('/', dashboardRoutes);
app.route('/', verifyRoutes);
app.route('/', ownerRoutes);
app.route('/', liveRoutes);

export { app };
