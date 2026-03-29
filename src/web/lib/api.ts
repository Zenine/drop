import type { FilePreviewData } from './types';

const cache: Map<string, FilePreviewData> = new Map();
const inflight: Map<string, Promise<FilePreviewData>> = new Map();

export function getCached(relPath: string): FilePreviewData | undefined {
  return cache.get(relPath);
}

export function fetchFile(token: string, basePath: string, relPath: string): Promise<FilePreviewData> {
  const cached = cache.get(relPath);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(relPath);
  if (existing) return existing;

  const url = `${basePath}/d/${token}/api/file?path=${encodeURIComponent(relPath)}`;
  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<FilePreviewData>;
    })
    .then((data) => {
      cache.set(relPath, data);
      inflight.delete(relPath);
      return data;
    })
    .catch((err) => {
      inflight.delete(relPath);
      throw err;
    });

  inflight.set(relPath, p);
  return p;
}

export function prefetch(token: string, basePath: string, relPath: string): void {
  if (!cache.has(relPath) && !inflight.has(relPath)) {
    fetchFile(token, basePath, relPath);
  }
}
