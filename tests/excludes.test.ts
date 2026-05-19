import { describe, expect, test } from 'bun:test';
import { directoryDefaultExcludes } from '../src/shared/excludes.js';

describe('directory default excludes', () => {
  test('exclude dotfiles and hidden directories by default', () => {
    const excludes = directoryDefaultExcludes(false, ['node_modules/', '.env', '.github/', '*.log']);

    expect(excludes).toContain('.*');
    expect(excludes).toContain('.env');
    expect(excludes).toContain('.github/');
    expect(excludes).toContain('node_modules/');
    expect(excludes).toContain('*.log');
  });

  test('include-hidden removes hidden defaults but keeps visible excludes', () => {
    const excludes = directoryDefaultExcludes(true);

    expect(excludes).toContain('node_modules/');
    expect(excludes).not.toContain('.*');
    expect(excludes).not.toContain('.env');
    expect(excludes).not.toContain('.git/');
    expect(excludes).not.toContain('.venv/');
  });

  test('include-hidden still respects configured default excludes', () => {
    const excludes = directoryDefaultExcludes(true, ['node_modules/', '.env', '.github/', '*.log', '.*']);

    expect(excludes).toEqual(['node_modules/', '.env', '.github/', '*.log']);
    expect(excludes).not.toContain('.*');
  });
});
