/**
 * File serving routes: GET /f/:token, GET /f/:token/raw and GET /f/:token/:filename
 */

import { Hono } from 'hono';
import { existsSync, statSync } from 'fs';
import { basename } from 'path';
import { lookupAuthorization } from '../../db/authorizations.js';
import { resolveShareToken } from '../../db/share-aliases.js';
import { STATUS_NOT_FOUND, STATUS_EXPIRED, MAX_RENDER_SIZE } from '../../shared/constants.js';
import { getFileType } from '../../shared/fs.js';
import { getRenderer } from '../render/index.js';
import { handleExpired } from '../middleware/auth.js';
import { guessMime } from '../../shared/mime.js';
import { recordRouteAccess } from '../access-logging.js';
import type { FileAuthorization } from '../../shared/types.js';

const fileRoutes = new Hono();

function injectLiveJs(html: string, token: string): string {
  const script =
    '<script>' +
    '(function(){' +
    'var mtime=0;' +
    'function poll(){' +
    'fetch("/live/' + token + '/poll?since="+mtime)' +
    '.then(function(r){return r.json()})' +
    '.then(function(d){' +
    'if(d.expired||d.deleted){clearInterval(iv);return}' +
    'if(d.changed){mtime=d.mtime;location.reload()}' +
    'else if(!mtime){mtime=d.mtime}' +
    '})' +
    '.catch(function(){});' +
    '}' +
    'var iv=setInterval(poll,2000);' +
    'poll();' +
    '})();' +
    '</script>';
  return html.replace('</body>', script + '</body>');
}

/**
 * Resolve the share token from the request, look up its authorization row,
 * and handle the not-found/expired states. Shared by both the page route
 * and the raw route so they enforce identical authorization and expiry.
 */
function getFileAuth(c: any): { row: FileAuthorization | null; expiredHtml: string | null; token: string; publicId: string } {
  const publicId = c.req.param('token');
  const token = resolveShareToken('file', publicId);
  const { row, status } = lookupAuthorization(token);

  if (status === STATUS_NOT_FOUND) {
    return { row: null, expiredHtml: null, token, publicId };
  }

  if (status === STATUS_EXPIRED) {
    const html = handleExpired(c, row!, 'filename', token, 'authorizations');
    if (html !== null) {
      return { row: null, expiredHtml: html, token, publicId };
    }
    // If null, owner/password auth extended the expiry — continue serving
  }

  return { row: row!, expiredHtml: null, token, publicId };
}

// Types that a browser would execute/render if served inline on this origin.
// Share URLs are public and same-origin with the owner-cookied /dashboard and
// /revoke, so these must never be served as their real type + inline — force
// a plain-text download instead. (Mirrors the fix applied to /d/:token/raw.)
const UNSAFE_INLINE_TYPES = new Set(['text/html', 'application/xhtml+xml', 'image/svg+xml']);

/**
 * Build a Content-Disposition header value that is safe for any filename.
 * Response headers must be Latin-1 and cannot contain quotes/backslashes/
 * control characters, so we emit an ASCII-sanitized `filename` fallback
 * alongside an RFC 5987 percent-encoded `filename*` for the real name.
 */
function contentDispositionHeader(disposition: 'inline' | 'attachment', filename: string): string {
  const asciiFallback = filename
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_') || 'file';
  const encoded = encodeURIComponent(filename).replace(/['()*!~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

/** Largest body returned for one Range request (see rawFileResponse). */
const MAX_RANGE_CHUNK = 8 * 1024 * 1024;

/**
 * Parse a single-range `Range: bytes=...` header against a file of `size`
 * bytes. Returns null when absent or not a single byte range (serve the whole
 * file), 'unsatisfiable' when it cannot be satisfied, else inclusive bounds.
 */
function parseRange(header: string | undefined, size: number): { start: number; end: number } | 'unsatisfiable' | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start: number;
  let end: number;
  if (m[1] === '') {
    const n = parseInt(m[2], 10);
    if (n === 0) return 'unsatisfiable';
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = parseInt(m[1], 10);
    end = m[2] === '' ? size - 1 : Math.min(parseInt(m[2], 10), size - 1);
  }
  if (start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

/**
 * Stream a file's bytes with the correct content type, an explicit
 * Content-Length and single-range support (206/416). Browser PDF viewers and
 * media players depend on these; Bun does not add them for a Response built
 * from Bun.file() with custom headers, and HEAD would otherwise report 0.
 */
async function rawFileResponse(c: any, filepath: string): Promise<Response> {
  const guessedMime = guessMime(filepath);
  const unsafe = UNSAFE_INLINE_TYPES.has(guessedMime);
  const contentType = unsafe ? 'text/plain; charset=utf-8' : guessedMime;
  const disposition = unsafe ? 'attachment' : 'inline';
  const file = Bun.file(filepath);
  const size = file.size;
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Disposition': contentDispositionHeader(disposition, basename(filepath)),
    'Accept-Ranges': 'bytes',
  };
  const isHead = c.req.method === 'HEAD';
  const range = parseRange(c.req.header('range'), size);

  if (range === 'unsatisfiable') {
    return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } });
  }
  if (range) {
    // Send ranged bodies as in-memory bytes so Bun emits an exact
    // Content-Length (a streamed body is sent chunked, and Safari refuses to
    // play media whose 206 responses are chunked). Cap each response at
    // MAX_RANGE_CHUNK; returning a shorter range than an open-ended request
    // asked for is allowed, and players request the next chunk.
    const end = Math.min(range.end, range.start + MAX_RANGE_CHUNK - 1);
    const length = end - range.start + 1;
    const body = isHead ? null : new Uint8Array(await file.slice(range.start, end + 1).arrayBuffer());
    return new Response(body, {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${range.start}-${end}/${size}`, 'Content-Length': String(length) },
    });
  }
  return new Response(isHead ? null : file, { headers: { ...headers, 'Content-Length': String(size) } });
}

function serveFileHandler(c: any) {
  const { row, expiredHtml, token, publicId } = getFileAuth(c);

  if (!row && !expiredHtml) {
    return c.text('Not found', 404);
  }

  if (expiredHtml) {
    return c.html(expiredHtml);
  }

  const filepath = row!.filepath;
  if (!existsSync(filepath)) {
    return c.text('File no longer exists on disk', 404);
  }

  const headParam = c.req.query('head');
  const tailParam = c.req.query('tail');
  const head = headParam ? parseInt(headParam, 10) : null;
  const tail = tailParam ? parseInt(tailParam, 10) : null;

  const fileType = getFileType(filepath);
  const isTextish = fileType === 'code' || fileType === 'markdown' || fileType === 'csv';
  let renderer = getRenderer(filepath);

  // Text-ish renderers build the whole file into one HTML string; skip them
  // for oversized files and serve raw instead (mirrors dir.ts's API cap).
  if (renderer && isTextish) {
    const st = statSync(filepath);
    if (st.size > MAX_RENDER_SIZE) {
      renderer = null;
    }
  }

  if (renderer) {
    const rawUrl = `/f/${publicId}/raw`;
    let html = renderer(filepath, head, tail, rawUrl);
    if (row!.live && html.includes('</body>')) {
      html = injectLiveJs(html, publicId);
    }
    recordRouteAccess(c, token, 'file', 'page_view');
    return c.html(html);
  }

  // Serve raw file (images, PDFs, binary, and oversized text-ish files)
  recordRouteAccess(c, token, 'file', 'page_view');
  return rawFileResponse(c, filepath);
}

function serveFileRawHandler(c: any) {
  const { row, expiredHtml, token } = getFileAuth(c);

  if (!row && !expiredHtml) {
    return c.text('Not found', 404);
  }

  if (expiredHtml) {
    return c.html(expiredHtml);
  }

  const filepath = row!.filepath;
  if (!existsSync(filepath)) {
    return c.text('File no longer exists on disk', 404);
  }

  // Every access to file bytes is recorded (matches dir.ts's /raw route), so
  // a direct request to this URL — saved, reposted, or curled — still shows
  // up in `drop stats`. The browser also auto-fetches this URL as a
  // sub-resource of a page visit already logged as `page_view` (e.g. the
  // <video>/<audio> `src`); to avoid double-counting that as two views, the
  // headline view count in access-events.ts excludes `raw_view` for file
  // shares specifically, while still keeping the raw_view row in the log and
  // in the by_event_type breakdown.
  recordRouteAccess(c, token, 'file', 'raw_view');
  return rawFileResponse(c, filepath);
}

// Specific /raw route must be registered before the generic :filename route.
fileRoutes.get('/f/:token/raw', serveFileRawHandler);
fileRoutes.get('/f/:token', serveFileHandler);
fileRoutes.get('/f/:token/:filename', serveFileHandler);

export { fileRoutes };
