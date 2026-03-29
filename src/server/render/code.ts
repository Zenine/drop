/**
 * Code file renderer using shiki for syntax highlighting.
 */

import { createHighlighter, type Highlighter } from 'shiki';
import { readFileSync } from 'fs';
import { extname, basename } from 'path';
import { getFileMeta } from '../../shared/fs.js';
import { codePageHtml } from './html-templates.js';

let highlighter: Highlighter | null = null;

const SHIKI_LANGS = [
  'javascript', 'typescript', 'python', 'go', 'rust', 'ruby', 'java',
  'c', 'cpp', 'csharp', 'swift', 'kotlin', 'scala',
  'shellscript', 'bash',
  'json', 'yaml', 'toml', 'xml', 'html', 'css', 'scss', 'less',
  'sql', 'graphql', 'markdown', 'diff',
  'lua', 'php', 'r', 'perl',
  'dockerfile', 'makefile', 'hcl', 'nix',
  'vue', 'svelte', 'astro',
  'jsx', 'tsx',
  'ini',
] as const;

export async function initHighlighter(): Promise<void> {
  highlighter = await createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: [...SHIKI_LANGS],
  });
}

/**
 * Map file extension to shiki language ID.
 */
function extToLang(filepath: string): string {
  const ext = extname(filepath).toLowerCase();
  const name = basename(filepath).toLowerCase();

  // Extensionless known files
  if (!ext) {
    if (name === 'makefile') return 'makefile';
    if (name === 'dockerfile') return 'dockerfile';
    return 'text';
  }

  const map: Record<string, string> = {
    '.py': 'python',
    '.js': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.ts': 'typescript',
    '.mts': 'typescript',
    '.cts': 'typescript',
    '.jsx': 'jsx',
    '.tsx': 'tsx',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.hpp': 'cpp',
    '.h': 'c',
    '.cs': 'csharp',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash',
    '.fish': 'bash',
    '.ps1': 'shellscript',
    '.json': 'json',
    '.jsonc': 'json',
    '.json5': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.ini': 'ini',
    '.cfg': 'ini',
    '.conf': 'ini',
    '.xml': 'xml',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'scss',
    '.less': 'less',
    '.sql': 'sql',
    '.graphql': 'graphql',
    '.md': 'markdown',
    '.markdown': 'markdown',
    '.diff': 'diff',
    '.patch': 'diff',
    '.lua': 'lua',
    '.php': 'php',
    '.r': 'r',
    '.R': 'r',
    '.pl': 'perl',
    '.pm': 'perl',
    '.dockerfile': 'dockerfile',
    '.makefile': 'makefile',
    '.cmake': 'makefile',
    '.tf': 'hcl',
    '.hcl': 'hcl',
    '.nix': 'nix',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.astro': 'astro',
    '.txt': 'text',
    '.log': 'text',
    '.env.example': 'bash',
    '.gitignore': 'text',
    '.gitattributes': 'text',
    '.editorconfig': 'ini',
    '.proto': 'text',
    '.bat': 'shellscript',
    '.cmd': 'shellscript',
  };

  return map[ext] || 'text';
}

export function renderCode(filepath: string, head?: number | null, tail?: number | null): string {
  if (!highlighter) {
    throw new Error('Highlighter not initialized. Call initHighlighter() first.');
  }

  let lines = readFileSync(filepath, 'utf-8').split('\n');

  if (head != null) {
    lines = lines.slice(0, head);
  } else if (tail != null) {
    lines = lines.slice(-tail);
  }

  const code = lines.join('\n');
  const lang = extToLang(filepath);

  let highlighted: string;
  try {
    highlighted = highlighter.codeToHtml(code, {
      lang,
      themes: {
        dark: 'github-dark',
        light: 'github-light',
      },
      defaultColor: false,
    });
  } catch {
    // Fallback: try as plain text
    highlighted = highlighter.codeToHtml(code, {
      lang: 'text',
      themes: {
        dark: 'github-dark',
        light: 'github-light',
      },
      defaultColor: false,
    });
  }

  const meta = getFileMeta(filepath);
  const highlightCss = `
  html.dark .shiki,
  html.dark .shiki span { color: var(--shiki-dark) !important; background-color: var(--shiki-dark-bg) !important; }
  html.light .shiki,
  html.light .shiki span { color: var(--shiki-light) !important; background-color: var(--shiki-light-bg) !important; }
  @media (prefers-color-scheme: dark) {
    .shiki, .shiki span { color: var(--shiki-dark) !important; background-color: var(--shiki-dark-bg) !important; }
  }
  @media (prefers-color-scheme: light) {
    .shiki, .shiki span { color: var(--shiki-light) !important; background-color: var(--shiki-light-bg) !important; }
  }`;

  return codePageHtml({
    displayPath: meta.display_path,
    fileMeta: `${meta.size} \u00b7 ${meta.mtime} (mtime) \u00b7 ${meta.ctime} (ctime)`,
    highlightedCode: highlighted,
    highlightCss,
  });
}

/**
 * Highlight a code string (for use in markdown code blocks or git diffs).
 * Returns HTML string.
 */
export function highlightCode(code: string, lang: string): string {
  if (!highlighter) return `<pre><code>${code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;

  try {
    return highlighter.codeToHtml(code, {
      lang: lang || 'text',
      themes: {
        dark: 'github-dark',
        light: 'github-light',
      },
      defaultColor: false,
    });
  } catch {
    try {
      return highlighter.codeToHtml(code, {
        lang: 'text',
        themes: {
          dark: 'github-dark',
          light: 'github-light',
        },
        defaultColor: false,
      });
    } catch {
      return `<pre><code>${code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    }
  }
}

/**
 * Returns the shared CSS for shiki dual-theme highlighting.
 */
export function getShikiDualCss(): string {
  return `
  html.dark .shiki,
  html.dark .shiki span { color: var(--shiki-dark) !important; background-color: var(--shiki-dark-bg) !important; }
  html.light .shiki,
  html.light .shiki span { color: var(--shiki-light) !important; background-color: var(--shiki-light-bg) !important; }
  @media (prefers-color-scheme: dark) {
    .shiki, .shiki span { color: var(--shiki-dark) !important; background-color: var(--shiki-dark-bg) !important; }
  }
  @media (prefers-color-scheme: light) {
    .shiki, .shiki span { color: var(--shiki-light) !important; background-color: var(--shiki-light-bg) !important; }
  }`;
}
