import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { scanGitCommit } from '../src/shared/secret-scan.js';

const ANTHROPIC_KEY = 'sk-ant-api03-' + 'g'.repeat(95);

function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !key.startsWith('GIT_')) env[key] = value;
  }
  return env;
}

function git(args: string[], cwd: string): void {
  const result = Bun.spawnSync(['git', ...args], { cwd, env: cleanEnv(), stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
}

describe('secret scanner git commits', () => {
  test('scans added git commit content without leaking secret values', () => {
    const repo = mkdtempSync(join(tmpdir(), 'drop-secret-git-'));
    try {
      git(['init'], repo);
      git(['config', 'user.email', 'test@example.com'], repo);
      git(['config', 'user.name', 'Test User'], repo);
      writeFileSync(join(repo, 'README.md'), 'safe');
      git(['add', 'README.md'], repo);
      git(['commit', '-m', 'initial'], repo);

      mkdirSync(join(repo, 'src'));
      writeFileSync(join(repo, 'src', 'client.ts'), `export const key = '${ANTHROPIC_KEY}';\n`);
      git(['add', 'src/client.ts'], repo);
      git(['commit', '-m', 'add secret'], repo);
      const commit = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], { cwd: repo, env: cleanEnv() }).stdout.toString().trim();

      const result = scanGitCommit(repo, commit);

      expect(result.blocked).toBe(true);
      expect(result.findings[0]).toEqual(expect.objectContaining({
        path: 'src/client.ts',
        line: 1,
        rule_id: 'anthropic-api-key',
        severity: 'high',
      }));
      expect(JSON.stringify(result.findings)).not.toContain(ANTHROPIC_KEY);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
