import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { closeDb } from '../src/db/index.js';
import { addAuthorization } from '../src/db/authorizations.js';
import { app } from '../src/server/index.js';

// Browser PDF viewers and media players rely on Content-Length, Accept-Ranges
// and 206 range responses; without them Chrome's PDF viewer can fail to load.

function withTempDb(): string {
  closeDb();
  const root = mkdtempSync(join(tmpdir(), 'drop-file-range-'));
  process.env.DROP_DB = join(root, 'drop.db');
  return root;
}

afterEach(() => {
  closeDb();
  delete process.env.DROP_DB;
  delete process.env.DROP_TRUST_PROXY;
});

// The rate limiter is process-wide and keyed by client IP; when the whole
// suite runs in one process, earlier files can exhaust the shared bucket.
// Give every request its own documentation-range client IP.
let ipCounter = 0;
function fetchAs(url: string, init: RequestInit = {}): Promise<Response> {
  process.env.DROP_TRUST_PROXY = '1';
  ipCounter += 1;
  const headers = new Headers(init.headers);
  headers.set('cf-connecting-ip', `198.51.100.${(ipCounter % 250) + 1}`);
  return app.fetch(new Request(url, { ...init, headers }));
}

function makePdf(root: string, size = 10_000): { file: string; bytes: Buffer } {
  const bytes = Buffer.alloc(size);
  Buffer.from('%PDF-1.4\n').copy(bytes, 0);
  for (let i = 9; i < size; i++) bytes[i] = i % 251;
  const file = join(root, 'report.pdf');
  writeFileSync(file, bytes);
  return { file, bytes };
}

describe('raw file responses support length and ranges', () => {
  for (const suffix of ['', '/raw']) {
    test(`GET /f/:token${suffix} advertises length and range support`, async () => {
      const root = withTempDb();
      try {
        const { file, bytes } = makePdf(root);
        const token = addAuthorization(file, 60).token;
        const res = await fetchAs(`http://drop.test/f/${token}${suffix}`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-length')).toBe(String(bytes.length));
        expect(res.headers.get('accept-ranges')).toBe('bytes');
        expect(Buffer.from(await res.arrayBuffer()).equals(bytes)).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test(`Range on /f/:token${suffix} returns 206 with the requested slice`, async () => {
      const root = withTempDb();
      try {
        const { file, bytes } = makePdf(root);
        const token = addAuthorization(file, 60).token;
        const res = await fetchAs(`http://drop.test/f/${token}${suffix}`, { headers: { Range: 'bytes=100-199' } });
        expect(res.status).toBe(206);
        expect(res.headers.get('content-range')).toBe(`bytes 100-199/${bytes.length}`);
        expect(res.headers.get('content-length')).toBe('100');
        expect(Buffer.from(await res.arrayBuffer()).equals(bytes.subarray(100, 200))).toBe(true);

        const open = await fetchAs(`http://drop.test/f/${token}${suffix}`, { headers: { Range: 'bytes=9900-' } });
        expect(open.status).toBe(206);
        expect(open.headers.get('content-range')).toBe(`bytes 9900-9999/${bytes.length}`);

        const suffixRange = await fetchAs(`http://drop.test/f/${token}${suffix}`, { headers: { Range: 'bytes=-50' } });
        expect(suffixRange.status).toBe(206);
        expect(Buffer.from(await suffixRange.arrayBuffer()).equals(bytes.subarray(bytes.length - 50))).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test(`unsatisfiable Range on /f/:token${suffix} returns 416`, async () => {
      const root = withTempDb();
      try {
        const { file, bytes } = makePdf(root);
        const token = addAuthorization(file, 60).token;
        const res = await fetchAs(`http://drop.test/f/${token}${suffix}`, { headers: { Range: 'bytes=20000-30000' } });
        expect(res.status).toBe(416);
        expect(res.headers.get('content-range')).toBe(`bytes */${bytes.length}`);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test(`HEAD /f/:token${suffix} reports the real size`, async () => {
      const root = withTempDb();
      try {
        const { file, bytes } = makePdf(root);
        const token = addAuthorization(file, 60).token;
        const res = await fetchAs(`http://drop.test/f/${token}${suffix}`, { method: 'HEAD' });
        expect(res.status).toBe(200);
        expect(res.headers.get('content-length')).toBe(String(bytes.length));
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  }
});

describe('ranged responses over a real Bun.serve socket', () => {
  // app.fetch() keeps whatever headers the handler set, but Bun.serve drops
  // Content-Length for streamed bodies and falls back to chunked encoding.
  // Safari refuses to play media whose 206 responses lack Content-Length.
  test('206 responses carry Content-Length and are not chunked', async () => {
    const root = withTempDb();
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: app.fetch });
    try {
      const { file, bytes } = makePdf(root, 3 * 1024 * 1024);
      const token = addAuthorization(file, 60).token;
      for (const [range, start, end] of [['bytes=0-1', 0, 1], ['bytes=1000-', 1000, bytes.length - 1]] as const) {
        const res = await fetch(`http://127.0.0.1:${server.port}/f/${token}/raw`, {
          headers: { Range: range, 'cf-connecting-ip': '198.51.100.250' },
        });
        expect(res.status).toBe(206);
        expect(res.headers.get('transfer-encoding')).toBeNull();
        const len = Number(res.headers.get('content-length'));
        const m = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(res.headers.get('content-range') || '');
        expect(m).not.toBeNull();
        expect(Number(m![1])).toBe(start);
        expect(Number(m![3])).toBe(bytes.length);
        const lastServed = Number(m![2]);
        expect(lastServed).toBeLessThanOrEqual(end);   // servers may shorten an open-ended range
        const body = Buffer.from(await res.arrayBuffer());
        expect(len).toBe(lastServed - start + 1);
        expect(body.equals(bytes.subarray(start, lastServed + 1))).toBe(true);
      }
    } finally {
      server.stop(true);
      rmSync(root, { recursive: true, force: true });
    }
  });
});
