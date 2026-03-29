import { randomBytes } from 'crypto';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { getDb } from './index.js';
import {
  DIR_TOKEN_LENGTH,
  STATUS_VALID, STATUS_EXPIRED, STATUS_NOT_FOUND,
} from '../shared/constants.js';
import type { DirAuthorization, AuthorizationStatus } from '../shared/types.js';

export function addDirAuthorization(
  dirpath: string,
  ttl: number,
  excludes: string[],
  live = false,
): { token: string; dirname: string; isNew: boolean } {
  const absPath = resolve(dirpath);
  if (!existsSync(absPath)) {
    throw new Error(`Directory not found: ${absPath}`);
  }

  const dirname = absPath.split('/').pop()!;
  const excludesJson = JSON.stringify(excludes);
  const now = Date.now() / 1000;
  const db = getDb();

  const existing = db.query(
    'SELECT token FROM dir_authorizations WHERE dirpath = ? AND expires_at > ?',
  ).get(absPath, now) as { token: string } | null;

  if (existing) {
    db.query(
      'UPDATE dir_authorizations SET expires_at = ?, excludes = ?, live = ? WHERE token = ?',
    ).run(now + ttl, excludesJson, live ? 1 : 0, existing.token);
    return { token: existing.token, dirname, isNew: false };
  }

  const token = randomBytes(DIR_TOKEN_LENGTH).toString('hex');
  db.query(
    'INSERT INTO dir_authorizations (token, dirpath, dirname, excludes, created_at, expires_at, live) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(token, absPath, dirname, excludesJson, now, now + ttl, live ? 1 : 0);
  return { token, dirname, isNew: true };
}

export function lookupDirAuthorization(token: string): { row: DirAuthorization | null; status: AuthorizationStatus } {
  const db = getDb();
  const row = db.query(
    'SELECT token, dirpath, dirname, excludes, created_at, expires_at, live FROM dir_authorizations WHERE token = ?',
  ).get(token) as DirAuthorization | null;

  if (!row) return { row: null, status: STATUS_NOT_FOUND };
  if (Date.now() / 1000 > row.expires_at) return { row, status: STATUS_EXPIRED };
  return { row, status: STATUS_VALID };
}

export function listDirAuthorizations(): DirAuthorization[] {
  const db = getDb();
  return db.query(
    'SELECT token, dirpath, dirname, excludes, created_at, expires_at FROM dir_authorizations ORDER BY created_at DESC',
  ).all() as DirAuthorization[];
}
