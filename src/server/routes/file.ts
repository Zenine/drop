/**
 * File serving routes: GET /f/:token and GET /f/:token/:filename
 */

import { Hono } from 'hono';
import { existsSync, readFileSync, statSync } from 'fs';
import { extname } from 'path';
import { lookupAuthorization } from '../../db/authorizations.js';
import { STATUS_NOT_FOUND, STATUS_EXPIRED, MAX_RENDER_SIZE } from '../../shared/constants.js';
import { getFileType } from '../../shared/fs.js';
import { getRenderer } from '../render/index.js';
import { handleExpired } from '../middleware/auth.js';

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
 * Guess MIME type from extension.
 */
function guessMime(filepath: string): string {
  const ext = extname(filepath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
    '.bmp': 'image/bmp',
    '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.m4a': 'audio/mp4',
    '.opus': 'audio/opus',
    '.weba': 'audio/webm',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogv': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.tsv': 'text/tab-separated-values',
    '.md': 'text/markdown',
    '.py': 'text/plain',
    '.ts': 'text/plain',
    '.go': 'text/plain',
    '.rs': 'text/plain',
    '.zip': 'application/zip',
    '.gz': 'application/gzip',
    '.tar': 'application/x-tar',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

function serveFileHandler(c: any) {
  const token = c.req.param('token');
  const { row, status } = lookupAuthorization(token);

  if (status === STATUS_NOT_FOUND) {
    return c.text('Not found', 404);
  }

  if (status === STATUS_EXPIRED) {
    const expiredHtml = handleExpired(c, row!, 'filename', token, 'authorizations');
    if (expiredHtml !== null) {
      return c.html(expiredHtml);
    }
    // If null, owner/password auth extended the expiry — continue serving
  }

  const filepath = row!.filepath;
  if (!existsSync(filepath)) {
    return c.text('File no longer exists on disk', 404);
  }

  const headParam = c.req.query('head');
  const tailParam = c.req.query('tail');
  const head = headParam ? parseInt(headParam, 10) : null;
  const tail = tailParam ? parseInt(tailParam, 10) : null;

  const renderer = getRenderer(filepath);

  if (renderer) {
    let html = renderer(filepath, head, tail);
    if (row!.live && html.includes('</body>')) {
      html = injectLiveJs(html, token);
    }
    return c.html(html);
  }

  // Serve raw file (images, PDFs, binary)
  const mime = guessMime(filepath);
  const data = readFileSync(filepath);
  return new Response(data, {
    headers: { 'Content-Type': mime },
  });
}

fileRoutes.get('/f/:token', serveFileHandler);
fileRoutes.get('/f/:token/:filename', serveFileHandler);

export { fileRoutes };
