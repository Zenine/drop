import { realpathSync } from 'fs';
import { sep } from 'path';
import { homedir } from 'os';

const home = homedir();

export function displayPath(filepath: string): string {
  if (filepath.startsWith(home + '/')) {
    return '~/' + filepath.slice(home.length + 1);
  }
  return filepath;
}

export function formatSize(nbytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'] as const;
  let value = nbytes;
  for (const unit of units) {
    if (value < 1024) {
      return unit === 'B' ? `${Math.floor(value)} ${unit}` : `${value.toFixed(1)} ${unit}`;
    }
    value /= 1024;
  }
  return `${value.toFixed(1)} TB`;
}

export function htmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function jsSafeJson(obj: unknown): string {
  let s = JSON.stringify(obj);
  s = s.replace(/<\//g, '<\\/');
  s = s.replace(/<!--/g, '<\\!--');
  return s;
}

export function jsStringEscape(text: string): string {
  text = text.replace(/\\/g, '\\\\');
  text = text.replace(/'/g, "\\'");
  text = text.replace(/"/g, '\\"');
  text = text.replace(/\n/g, '\\n');
  text = text.replace(/\r/g, '\\r');
  text = text.replace(/<\//g, '<\\/');
  return text;
}

export function isSafeSubpath(base: string, target: string): boolean {
  const baseReal = realpathSync(base);
  let targetReal: string;
  try {
    targetReal = realpathSync(target);
  } catch {
    return false;
  }
  return targetReal === baseReal || targetReal.startsWith(baseReal + sep);
}

/**
 * Format a Unix timestamp to YYYY-MM-DD HH:MM in local time.
 */
export function formatTime(epoch: number): string {
  const d = new Date(epoch * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
