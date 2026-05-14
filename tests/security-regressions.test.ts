import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { closeDb, getDb } from '../src/db/index.js';
import { addAuthorization, removeAuthorization } from '../src/db/authorizations.js';
import { addDirAuthorization } from '../src/db/dir-authorizations.js';
import { renderCode } from '../src/server/render/code.js';
import { renderMarkdown } from '../src/server/render/markdown.js';
import { getRenderer } from '../src/server/render/index.js';
import { getClientIpFromHeaders } from '../src/server/middleware/rate-limit.js';

function withTempDb(): string {
  closeDb();
  const root = mkdtempSync(join(tmpdir(), 'drop-security-db-'));
  process.env.DROP_DB = join(root, 'drop.db');
  return root;
}

afterEach(() => {
  closeDb();
  delete process.env.DROP_DB;
});

describe('security regressions', () => {
  test('new share tokens use at least 128 bits of entropy', () => {
    const root = withTempDb();
    try {
      const file = join(root, 'file.txt');
      const dir = join(root, 'dir');
      writeFileSync(file, 'hello');
      mkdirSync(dir);

      const fileAuth = addAuthorization(file, 60);
      const dirAuth = addDirAuthorization(dir, 60, []);

      expect(fileAuth.token).toMatch(/^[0-9a-f]{32,}$/);
      expect(dirAuth.token).toMatch(/^[0-9a-f]{32,}$/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('rendered file paths are escaped in HTML templates', () => {
    const root = mkdtempSync(join(tmpdir(), 'drop-xss-path-'));
    try {
      const filename = '<img src=x onerror=alert(1)>.txt';
      const file = join(root, filename);
      writeFileSync(file, 'plain text');

      const html = renderCode(file);

      expect(html).not.toContain(filename);
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;.txt');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('markdown raw HTML is escaped instead of executed', () => {
    const root = mkdtempSync(join(tmpdir(), 'drop-md-xss-'));
    try {
      const file = join(root, 'README.md');
      writeFileSync(file, '# Title\n\n<script>alert(1)</script>');

      const html = renderMarkdown(file);

      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });


  test('svg previews do not inline executable SVG markup', () => {
    const root = mkdtempSync(join(tmpdir(), 'drop-svg-xss-'));
    try {
      const file = join(root, 'image.svg');
      writeFileSync(file, '<svg><script>alert(1)</script></svg>');

      const renderer = getRenderer(file);
      const html = renderer!(file);

      expect(html).not.toContain('<svg><script>alert(1)</script></svg>');
      expect(html).toContain('data:image/svg+xml;base64,');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('revoke removes matching tokens from every authorization table', () => {
    const root = withTempDb();
    try {
      const db = getDb();
      const now = Date.now() / 1000;
      db.query('INSERT INTO authorizations (token, filepath, filename, created_at, expires_at, live) VALUES (?, ?, ?, ?, ?, ?)')
        .run('file-token', join(root, 'file.txt'), 'file.txt', now, now + 60, 0);
      db.query('INSERT INTO dir_authorizations (token, dirpath, dirname, excludes, created_at, expires_at, live) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run('dir-token', root, 'root', '[]', now, now + 60, 0);
      db.query('INSERT INTO git_authorizations (token, repo_path, commit_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
        .run('git-token', root, 'abc123', now, now + 60);

      expect(removeAuthorization('file-token')).toBe(true);
      expect(removeAuthorization('dir-token')).toBe(true);
      expect(removeAuthorization('git-token')).toBe(true);

      expect(db.query('SELECT COUNT(*) as cnt FROM authorizations').get()).toEqual({ cnt: 0 });
      expect(db.query('SELECT COUNT(*) as cnt FROM dir_authorizations').get()).toEqual({ cnt: 0 });
      expect(db.query('SELECT COUNT(*) as cnt FROM git_authorizations').get()).toEqual({ cnt: 0 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('client identity ignores spoofable proxy headers unless explicitly trusted', () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.10',
      'x-forwarded-for': '198.51.100.1, 198.51.100.2',
      'x-real-ip': '192.0.2.20',
    });

    expect(getClientIpFromHeaders(headers, false)).toBe('127.0.0.1');
    expect(getClientIpFromHeaders(headers, true)).toBe('203.0.113.10');
  });
});
