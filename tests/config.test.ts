import { describe, expect, test } from 'bun:test';
import { applyConfigValue, getConfigValue } from '../src/cli/config.js';

describe('CLI config validation', () => {
  test('parses numeric and boolean config values', () => {
    const cfg: Record<string, unknown> = {};
    applyConfigValue(cfg, 'port', '17174');
    applyConfigValue(cfg, 'file_ttl', '3600');
    applyConfigValue(cfg, 'dir_default_ttl', '7200');
    applyConfigValue(cfg, 'auto_stop', 'true');

    expect(getConfigValue(cfg, 'port')).toBe(17174);
    expect(getConfigValue(cfg, 'file_ttl')).toBe(3600);
    expect(getConfigValue(cfg, 'dir_default_ttl')).toBe(7200);
    expect(getConfigValue(cfg, 'auto_stop')).toBe(true);
  });

  test('rejects invalid ports and TTLs', () => {
    expect(() => applyConfigValue({}, 'port', '70000')).toThrow('port');
    expect(() => applyConfigValue({}, 'file_ttl', '0')).toThrow('file_ttl');
    expect(() => applyConfigValue({}, 'dir_default_ttl', 'NaN')).toThrow('dir_default_ttl');
  });

  test('rejects invalid base_url values', () => {
    expect(() => applyConfigValue({}, 'base_url', 'ftp://example.com')).toThrow('base_url');
  });
});
