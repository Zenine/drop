import { describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { walkDirectory } from '../src/shared/fs.js';

describe('walkDirectory', () => {
  test('skips symlink directory cycles', () => {
    const root = mkdtempSync(join(tmpdir(), 'drop-walk-'));
    try {
      mkdirSync(join(root, 'a'));
      writeFileSync(join(root, 'a', 'file.txt'), 'ok');
      symlinkSync(root, join(root, 'a', 'loop'));

      const tree = walkDirectory(root, []);
      const a = tree.children.find((entry) => entry.name === 'a');
      expect(a?.is_dir).toBe(true);
      expect(a?.children.some((entry) => entry.name === 'file.txt')).toBe(true);
      expect(a?.children.some((entry) => entry.name === 'loop')).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
