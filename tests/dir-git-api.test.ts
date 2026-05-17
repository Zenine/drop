import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { app } from '../src/server/index.js';
import { closeDb } from '../src/db/index.js';
import { addDirAuthorization } from '../src/db/dir-authorizations.js';

function withTempDb(): string {
  closeDb();
  const root = mkdtempSync(join(tmpdir(), 'drop-dir-git-api-'));
  process.env.DROP_DB = join(root, 'drop.db');
  return root;
}

function cleanGitEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !key.startsWith('GIT_')) env[key] = value;
  }
  return env;
}

function git(args: string[], cwd: string): string {
  const result = Bun.spawnSync(['git', ...args], { cwd, env: cleanGitEnv(), stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function createRepoWithCommits(root: string, count: number): { repo: string; shas: string[] } {
  const repo = join(root, 'repo');
  mkdirSync(repo);
  git(['init'], repo);
  git(['config', 'core.hooksPath', '/dev/null'], repo);
  git(['config', 'user.email', 'test@example.com'], repo);
  git(['config', 'user.name', 'Test User'], repo);

  const shas: string[] = [];
  for (let i = 1; i <= count; i++) {
    writeFileSync(join(repo, 'note.txt'), `version ${i}\n`);
    git(['add', 'note.txt'], repo);
    git(['commit', '-m', `commit ${i}`], repo);
    shas.unshift(git(['rev-parse', 'HEAD'], repo));
  }
  return { repo, shas };
}

afterEach(() => {
  closeDb();
  delete process.env.DROP_DB;
});

describe('directory git API', () => {
  test('reports whether a shared directory is a git repository', async () => {
    const root = withTempDb();
    try {
      const plainDir = join(root, 'plain');
      mkdirSync(plainDir);
      const plainToken = addDirAuthorization(plainDir, 60, []).token;
      const plainInfo = await app.request(`/d/${plainToken}/api/git`);
      expect(plainInfo.status).toBe(200);
      expect(await plainInfo.json()).toEqual({
        is_git_repo: false,
        default_limit: 5,
        commits_url: null,
      });

      const fakeGitDir = join(root, 'fake-git');
      mkdirSync(join(fakeGitDir, '.git'), { recursive: true });
      const fakeGitToken = addDirAuthorization(fakeGitDir, 60, []).token;
      const fakeGitInfo = await app.request(`/d/${fakeGitToken}/api/git`);
      expect(fakeGitInfo.status).toBe(200);
      expect(await fakeGitInfo.json()).toEqual({
        is_git_repo: false,
        default_limit: 5,
        commits_url: null,
      });

      const { repo } = createRepoWithCommits(root, 1);
      const gitToken = addDirAuthorization(repo, 60, []).token;
      const gitInfo = await app.request(`/d/${gitToken}/api/git`);
      expect(gitInfo.status).toBe(200);
      expect(await gitInfo.json()).toEqual({
        is_git_repo: true,
        default_limit: 5,
        commits_url: `/d/${gitToken}/api/git/commits`,
      });

      const emptyRepo = join(root, 'empty-repo');
      mkdirSync(emptyRepo);
      git(['init'], emptyRepo);
      const emptyToken = addDirAuthorization(emptyRepo, 60, []).token;
      const emptyCommits = await app.request(`/d/${emptyToken}/api/git/commits`);
      expect(emptyCommits.status).toBe(200);
      expect(await emptyCommits.json()).toEqual({ limit: 5, commits: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('lists only the latest five commits without exposing author email', async () => {
    const root = withTempDb();
    try {
      const { repo, shas } = createRepoWithCommits(root, 6);
      const token = addDirAuthorization(repo, 60, []).token;

      const response = await app.request(`/d/${token}/api/git/commits`);
      const json = await response.json() as any;

      expect(response.status).toBe(200);
      expect(json.limit).toBe(5);
      expect(json.commits).toHaveLength(5);
      expect(json.commits.map((c: any) => c.sha)).toEqual(shas.slice(0, 5));
      expect(JSON.stringify(json)).not.toContain('test@example.com');
      expect(json.commits[0]).toEqual(expect.objectContaining({
        short_sha: shas[0].slice(0, 7),
        subject: 'commit 6',
        author_name: 'Test User',
      }));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('allows diffs for the latest five commits and rejects older or invalid shas', async () => {
    const root = withTempDb();
    try {
      const { repo, shas } = createRepoWithCommits(root, 6);
      const token = addDirAuthorization(repo, 60, []).token;

      const latest = await app.request(`/d/${token}/api/git/commit/${shas[0]}`);
      const latestJson = await latest.json() as any;
      expect(latest.status).toBe(200);
      expect(latestJson.commit.sha).toBe(shas[0]);
      expect(latestJson.commit.short_sha).toBe(shas[0].slice(0, 7));
      expect(latestJson.diff_html).toContain('commit 6');
      expect(latestJson.diff_html).toContain('note.txt');

      const latestByPrefix = await app.request(`/d/${token}/api/git/commit/${shas[0].slice(0, 12)}`);
      expect(latestByPrefix.status).toBe(200);

      const sixth = await app.request(`/d/${token}/api/git/commit/${shas[5]}`);
      expect(sixth.status).toBe(403);

      const invalid = await app.request(`/d/${token}/api/git/commit/not-a-sha`);
      expect(invalid.status).toBe(404);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('escapes commit subjects in API responses and diff html', async () => {
    const root = withTempDb();
    try {
      const repo = join(root, 'repo-xss');
      mkdirSync(repo);
      git(['init'], repo);
      git(['config', 'core.hooksPath', '/dev/null'], repo);
      git(['config', 'user.email', 'test@example.com'], repo);
      git(['config', 'user.name', 'Test User'], repo);
      writeFileSync(join(repo, 'note.txt'), 'hello\n');
      git(['add', 'note.txt'], repo);
      git(['commit', '-m', '<img src=x onerror=alert(1)>'], repo);
      const sha = git(['rev-parse', 'HEAD'], repo);
      const token = addDirAuthorization(repo, 60, []).token;

      const commits = await app.request(`/d/${token}/api/git/commits`);
      const commitsJson = await commits.json() as any;
      expect(commits.status).toBe(200);
      expect(commitsJson.commits[0].subject).toBe('<img src=x onerror=alert(1)>');

      const diff = await app.request(`/d/${token}/api/git/commit/${sha}`);
      const diffJson = await diff.json() as any;
      expect(diff.status).toBe(200);
      expect(diffJson.commit.subject).toBe('<img src=x onerror=alert(1)>');
      expect(diffJson.diff_html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(diffJson.diff_html).not.toContain('<img src=x onerror=alert(1)>');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
