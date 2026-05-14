import { existsSync, readFileSync } from 'fs';
import { TUNNEL_URL_PATH } from '../shared/constants.js';

export function buildUrl(cfg: Record<string, unknown>, prefix: string, token: string, port: number, host = 'localhost'): string {
  if (existsSync(TUNNEL_URL_PATH)) {
    const tunnelUrl = readFileSync(TUNNEL_URL_PATH, 'utf-8').trim();
    if (tunnelUrl) return `${tunnelUrl.replace(/\/$/, '')}/${prefix}/${token}`;
  }
  const baseUrl = cfg.base_url as string | undefined;
  if (baseUrl) return `${baseUrl.replace(/\/$/, '')}/${prefix}/${token}`;
  return `http://${host}:${port}/${prefix}/${token}`;
}
