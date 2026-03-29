import { existsSync, statSync, chmodSync } from 'fs';
import { randomBytes } from 'crypto';
import { CONFIG_PATH, OWNER_KEY_LENGTH, ensureStateDir } from './constants.js';

let configCache: Record<string, any> | null = null;
let configMtime = 0;

export function loadConfig(): Record<string, any> {
  if (!existsSync(CONFIG_PATH)) {
    configCache = {};
    configMtime = 0;
    return {};
  }
  const mtime = statSync(CONFIG_PATH).mtimeMs;
  if (configCache !== null && mtime === configMtime) {
    return configCache;
  }
  const file = Bun.file(CONFIG_PATH);
  // Bun.file().json() is async; use readFileSync for sync config loading
  const text = require('fs').readFileSync(CONFIG_PATH, 'utf-8');
  configCache = JSON.parse(text);
  configMtime = mtime;
  return configCache!;
}

export function saveConfig(cfg: Record<string, any>): void {
  ensureStateDir();
  const content = JSON.stringify(cfg, null, 2) + '\n';
  require('fs').writeFileSync(CONFIG_PATH, content, 'utf-8');
  // Restrict permissions: config contains owner_key
  chmodSync(CONFIG_PATH, 0o600);
  // Invalidate cache
  configCache = null;
  configMtime = 0;
}

export function getOwnerKey(): string {
  const cfg = loadConfig();
  let key = cfg.owner_key as string | undefined;
  if (!key) {
    key = randomBytes(OWNER_KEY_LENGTH).toString('hex');
    cfg.owner_key = key;
    saveConfig(cfg);
  }
  return key;
}
