import { describe, expect, test } from 'bun:test';
import { guessMime } from '../src/shared/mime.js';

describe('guessMime', () => {
  test('maps common preview file extensions', () => {
    expect(guessMime('README.md')).toBe('text/markdown');
    expect(guessMime('image.png')).toBe('image/png');
    expect(guessMime('movie.mp4')).toBe('video/mp4');
    expect(guessMime('archive.unknown')).toBe('application/octet-stream');
  });
});
