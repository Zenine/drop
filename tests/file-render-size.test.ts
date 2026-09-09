import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { closeDb, getDb } from '../src/db/index.js';
import { addAuthorization } from '../src/db/authorizations.js';
import { addDirAuthorization } from '../src/db/dir-authorizations.js';
import { getAccessStats } from '../src/db/access-events.js';
import { app } from '../src/server/index.js';
import { MAX_RENDER_SIZE } from '../src/shared/constants.js';

function withTempDb(): string {
  closeDb();
  const root = mkdtempSync(join(tmpdir(), 'drop-file-render-size-'));
  process.env.DROP_DB = join(root, 'drop.db');
  return root;
}

afterEach(() => {
  closeDb();
  delete process.env.DROP_DB;
});

describe('file share size limits and streaming', () => {
  test('an oversized .log file is served raw instead of rendered', async () => {
    const root = withTempDb();
    try {
      const file = join(root, 'big.log');
      // One line over MAX_RENDER_SIZE (5 MB) so it would previously be split
      // into one giant rendered HTML page.
      const line = 'x'.repeat(1024);
      const lines = Math.ceil((MAX_RENDER_SIZE + 1024 * 1024) / (line.length + 1));
      writeFileSync(file, Array(lines).fill(line).join('\n'));

      const token = addAuthorization(file, 60).token;
      const res = await app.fetch(new Request(`http://drop.test/f/${token}`));

      expect(res.status).toBe(200);
      const contentType = res.headers.get('content-type') || '';
      expect(contentType).not.toContain('text/html');
      const body = await res.text();
      expect(body).not.toContain('<html');
      expect(body.length).toBeGreaterThan(MAX_RENDER_SIZE);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('a small .txt file still renders as an HTML page', async () => {
    const root = withTempDb();
    try {
      const file = join(root, 'small.txt');
      writeFileSync(file, 'hello world\nsecond line\n');

      const token = addAuthorization(file, 60).token;
      const res = await app.fetch(new Request(`http://drop.test/f/${token}`));

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type') || '').toContain('text/html');
      const body = await res.text();
      expect(body).toContain('<html');
      expect(body).toContain('hello world');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('a media share references a raw URL instead of embedding a data URI', async () => {
    const root = withTempDb();
    try {
      const file = join(root, 'clip.mp3');
      writeFileSync(file, Buffer.from('fake mp3 bytes for test'));

      const token = addAuthorization(file, 60).token;
      const res = await app.fetch(new Request(`http://drop.test/f/${token}`));

      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).not.toContain('data:audio');
      expect(body).toContain(`/f/${token}/raw`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('the raw route streams file bytes with the correct content type', async () => {
    const root = withTempDb();
    try {
      const file = join(root, 'clip.mp3');
      const bytes = Buffer.from('fake mp3 bytes for test');
      writeFileSync(file, bytes);

      const token = addAuthorization(file, 60).token;
      const res = await app.fetch(new Request(`http://drop.test/f/${token}/raw`));

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('audio/mpeg');
      const body = Buffer.from(await res.arrayBuffer());
      expect(body.equals(bytes)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('the raw route enforces expiry the same way the page route does', async () => {
    const root = withTempDb();
    try {
      const file = join(root, 'secret.txt');
      writeFileSync(file, 'top secret contents');

      const token = addAuthorization(file, -60).token; // already expired

      const pageRes = await app.fetch(new Request(`http://drop.test/f/${token}`));
      const rawRes = await app.fetch(new Request(`http://drop.test/f/${token}/raw`));

      expect(pageRes.status).toBe(200);
      expect(rawRes.status).toBe(200);
      expect(rawRes.headers.get('content-type') || '').toContain('text/html');
      const rawBody = await rawRes.text();
      expect(rawBody).not.toContain('top secret contents');
      expect(rawBody.toLowerCase()).toContain('expired');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('a shared .html file requested via the raw route is not served as text/html and is forced to download', async () => {
    const root = withTempDb();
    try {
      const file = join(root, 'evil.html');
      writeFileSync(file, '<script>alert(document.cookie)</script>');

      const token = addAuthorization(file, 60).token;
      const res = await app.fetch(new Request(`http://drop.test/f/${token}/raw`));

      expect(res.status).toBe(200);
      const contentType = res.headers.get('content-type') || '';
      expect(contentType).not.toContain('text/html');
      expect(contentType).not.toContain('image/svg+xml');
      expect(res.headers.get('content-disposition') || '').toContain('attachment');
      const body = await res.text();
      expect(body).toContain('<script>'); // bytes are unchanged, just not executable inline
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('a shared .svg file requested via the raw route is not served as image/svg+xml and is forced to download', async () => {
    const root = withTempDb();
    try {
      const file = join(root, 'evil.svg');
      writeFileSync(file, '<svg onload="alert(1)"></svg>');

      const token = addAuthorization(file, 60).token;
      const res = await app.fetch(new Request(`http://drop.test/f/${token}/raw`));

      expect(res.status).toBe(200);
      const contentType = res.headers.get('content-type') || '';
      expect(contentType).not.toContain('image/svg+xml');
      expect(res.headers.get('content-disposition') || '').toContain('attachment');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('a large HTML file falling back to raw via the page route is also not served as text/html', async () => {
    const root = withTempDb();
    try {
      const file = join(root, 'big.html');
      const line = '<!-- ' + 'x'.repeat(1024) + ' -->';
      const lines = Math.ceil((MAX_RENDER_SIZE + 1024 * 1024) / (line.length + 1));
      writeFileSync(file, Array(lines).fill(line).join('\n'));

      const token = addAuthorization(file, 60).token;
      const res = await app.fetch(new Request(`http://drop.test/f/${token}`));

      expect(res.status).toBe(200);
      const contentType = res.headers.get('content-type') || '';
      expect(contentType).not.toContain('text/html');
      expect(res.headers.get('content-disposition') || '').toContain('attachment');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('the raw route percent-encodes a non-ASCII filename in Content-Disposition', async () => {
    const root = withTempDb();
    try {
      const file = join(root, '报告.pdf');
      writeFileSync(file, 'not a real pdf');

      const token = addAuthorization(file, 60).token;
      const res = await app.fetch(new Request(`http://drop.test/f/${token}/raw`));

      expect(res.status).toBe(200);
      const disposition = res.headers.get('content-disposition') || '';
      expect(disposition).toContain("filename*=UTF-8''");
      expect(disposition).toContain(encodeURIComponent('报告.pdf'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('the raw route produces a valid single header for a filename containing a double quote', async () => {
    const root = withTempDb();
    try {
      const file = join(root, 'a"b.txt');
      writeFileSync(file, 'hello');

      const token = addAuthorization(file, 60).token;
      const res = await app.fetch(new Request(`http://drop.test/f/${token}/raw`));

      expect(res.status).toBe(200);
      const disposition = res.headers.get('content-disposition');
      expect(disposition).not.toBeNull();
      expect(disposition).not.toContain('"a"b.txt"'); // must not contain an unescaped bare quote
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('visiting a media page and its embedded raw URL is logged as both events but counted as one view', async () => {
    const root = withTempDb();
    try {
      const file = join(root, 'clip.mp3');
      writeFileSync(file, Buffer.from('fake mp3 bytes for test'));

      const token = addAuthorization(file, 60).token;
      await app.fetch(new Request(`http://drop.test/f/${token}`));
      await app.fetch(new Request(`http://drop.test/f/${token}/raw`)); // simulates the <source> fetch

      // Both requests leave a trace in the raw log...
      const events = getDb().query(
        'SELECT event_type FROM access_events WHERE token = ? ORDER BY id',
      ).all(token) as { event_type: string }[];
      expect(events.map((e) => e.event_type)).toEqual(['page_view', 'raw_view']);

      // ...but the headline view count treats them as a single view, and the
      // breakdown still shows both event types.
      const stats = getAccessStats(token);
      expect(stats.views).toBe(1);
      expect(stats.by_event_type.page_view).toBe(1);
      expect(stats.by_event_type.raw_view).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('a direct request to the raw route with no prior page visit is recorded and visible in the breakdown', async () => {
    const root = withTempDb();
    try {
      const file = join(root, 'clip.mp3');
      writeFileSync(file, Buffer.from('fake mp3 bytes for test'));

      const token = addAuthorization(file, 60).token;
      await app.fetch(new Request(`http://drop.test/f/${token}/raw`)); // no page visit first

      const events = getDb().query(
        'SELECT event_type FROM access_events WHERE token = ? ORDER BY id',
      ).all(token) as { event_type: string }[];
      expect(events.map((e) => e.event_type)).toEqual(['raw_view']);

      const stats = getAccessStats(token);
      expect(stats.by_event_type.raw_view).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('the raw route returns 404 for an unknown token', async () => {
    const res = await app.fetch(new Request('http://drop.test/f/does-not-exist/raw'));
    expect(res.status).toBe(404);
  });

  test('the raw route returns 404 for a token belonging to a directory share', async () => {
    const root = withTempDb();
    try {
      const dir = join(root, 'shared-dir');
      mkdirSync(dir);
      writeFileSync(join(dir, 'note.txt'), 'hi');

      const dirToken = addDirAuthorization(dir, 60, []).token;
      const res = await app.fetch(new Request(`http://drop.test/f/${dirToken}/raw`));

      expect(res.status).toBe(404);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('the raw route returns 404 for a token belonging to a git commit share', async () => {
    const root = withTempDb();
    try {
      const now = Date.now() / 1000;
      getDb().query('INSERT INTO git_authorizations (token, repo_path, commit_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
        .run('git-token-for-file-raw-test', '/nonexistent/repo', 'deadbeef', now, now + 60);

      const res = await app.fetch(new Request('http://drop.test/f/git-token-for-file-raw-test/raw'));

      expect(res.status).toBe(404);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
