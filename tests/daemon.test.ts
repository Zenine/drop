import { describe, expect, test } from 'bun:test';
import { buildDaemonArgs } from '../src/cli/daemon.js';

describe('daemon command construction', () => {
  test('uses bun plus script path in source mode', () => {
    expect(buildDaemonArgs('/usr/bin/bun', '/repo/src/cli/index.ts', 17173, '0.0.0.0')).toEqual([
      '/usr/bin/bun', '/repo/src/cli/index.ts', 'serve', '--port', '17173', '--host', '0.0.0.0',
    ]);
  });

  test('uses compiled binary directly in binary mode', () => {
    expect(buildDaemonArgs('/Users/me/.local/bin/drop', undefined, 17173, '0.0.0.0')).toEqual([
      '/Users/me/.local/bin/drop', 'serve', '--port', '17173', '--host', '0.0.0.0',
    ]);
  });

  test('uses compiled binary directly even when argv[1] is a subcommand', () => {
    expect(buildDaemonArgs('/Users/me/.local/bin/drop', 'allow', 17173, '0.0.0.0')).toEqual([
      '/Users/me/.local/bin/drop', 'serve', '--port', '17173', '--host', '0.0.0.0',
    ]);
  });
});
