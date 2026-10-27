/**
 * Fetch handler for Bun.serve().
 *
 * Bun closes a connection after `idleTimeout` seconds without writes (default
 * 10 s). Video and audio players stop reading once they have buffered enough,
 * so a paused media download went idle and was cut off mid-file, which broke
 * playback of shared videos. File and directory share routes therefore disable
 * the idle timeout per request; every other route keeps the server default.
 */

import type { Server } from 'bun';

type FetchApp = { fetch: (req: Request, server?: Server<unknown>) => Response | Promise<Response> };

const STREAMING_PATH = /^\/(f|d)\//;

export function createFetchHandler(app: FetchApp) {
  return (req: Request, server: Server<unknown>) => {
    if (STREAMING_PATH.test(new URL(req.url).pathname)) {
      server.timeout(req, 0);
    }
    return app.fetch(req, server);
  };
}
