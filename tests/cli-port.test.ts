import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function cleanEnv(overrides: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !key.startsWith('GIT_')) env[key] = value;
  }
  return { ...env, ...overrides };
}

function makeEnv(root: string, extra: Record<string, string> = {}): Record<string, string> {
  return cleanEnv({
    HOME: root,
    DROP_DB: join(root, 'drop.db'),
    NO_COLOR: '1',
    ...extra,
  });
}

function writeConfig(root: string, config: Record<string, unknown>): void {
  const stateDir = join(root, '.drop');
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, 'config.json'), JSON.stringify(config, null, 2) + '\n');
}

function runDrop(args: string[], env: Record<string, string>) {
  return Bun.spawnSync(['bun', 'src/cli/index.ts', ...args], {
    cwd: process.cwd(),
    env,
    stdout: 'pipe',
    stderr: 'pipe',
  });
}

describe('CLI port resolution honours config.port', () => {
  test('drop list --json URLs use the configured port', () => {
    const root = mkdtempSync(join(tmpdir(), 'drop-cli-port-list-'));
    try {
      writeConfig(root, { port: 17999 });
      const env = makeEnv(root);

      const file = join(root, 'file.txt');
      writeFileSync(file, 'hello');
      const allowRun = runDrop(['allow', file, '--json'], env);
      expect(allowRun.exitCode).toBe(0);

      const listRun = runDrop(['list', '--json'], env);
      expect(listRun.exitCode).toBe(0);
      const items = JSON.parse(listRun.stdout.toString());
      expect(items).toHaveLength(1);
      expect(items[0].url).toContain(':17999');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('drop owner-url uses the configured port', () => {
    const root = mkdtempSync(join(tmpdir(), 'drop-cli-port-owner-'));
    try {
      writeConfig(root, { port: 17999 });
      const env = makeEnv(root);

      const run = runDrop(['owner-url'], env);
      expect(run.exitCode).toBe(0);
      expect(run.stdout.toString()).toContain(':17999');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('drop owner-url prefers base_url over the configured port', () => {
    const root = mkdtempSync(join(tmpdir(), 'drop-cli-port-owner-baseurl-'));
    try {
      writeConfig(root, { port: 17999, base_url: 'https://example.test' });
      const env = makeEnv(root);

      const run = runDrop(['owner-url'], env);
      expect(run.exitCode).toBe(0);
      const out = run.stdout.toString();
      expect(out).toContain('https://example.test/dashboard?key=');
      expect(out).not.toContain(':17999');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
