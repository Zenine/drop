// SVG file icons — minimal 16x16 shapes with appropriate colors
// Dark/light colors are handled via CSS currentColor or hardcoded per-type

const folderClosed = (color: string) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="${color}"><path d="M1.5 2A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h13a1.5 1.5 0 001.5-1.5V5a1.5 1.5 0 00-1.5-1.5H7.71L6.15 2.22A.75.75 0 005.64 2H1.5z"/></svg>`;

const folderOpen = (color: string) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="${color}"><path d="M.5 2A1.5 1.5 0 000 3.36v9.14A1.5 1.5 0 001.5 14h11.19a1.5 1.5 0 001.46-1.14l1.33-5.5A1 1 0 0014.5 6H13V5a1.5 1.5 0 00-1.5-1.5H7.71L6.15 2.22A.75.75 0 005.64 2H1.5A1 1 0 00.5 2z"/></svg>`;

const fileDoc = (color: string) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="${color}"><path d="M3.5 1A1.5 1.5 0 002 2.5v11A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V6.621a1.5 1.5 0 00-.44-1.06L9.94 1.94A1.5 1.5 0 008.878 1.5H3.5zM9 2v3.5a.5.5 0 00.5.5H13v7.5a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5v-11a.5.5 0 01.5-.5H9z"/></svg>`;

const fileSquare = (color: string, letter: string) =>
  `<svg viewBox="0 0 16 16" width="16" height="16"><rect x="1" y="1" width="14" height="14" rx="3" fill="${color}"/><text x="8" y="11.5" text-anchor="middle" fill="#fff" font-size="9" font-weight="700" font-family="sans-serif">${letter}</text></svg>`;

const terminalIcon = (color: string) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="${color}"><path d="M2 2.5A1.5 1.5 0 013.5 1h9A1.5 1.5 0 0114 2.5v11a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 13.5v-11zm2.146 1.146a.5.5 0 00.708.708L7.207 7 4.854 9.354a.5.5 0 00.708.708l3-3a.5.5 0 000-.708l-3-3zM8 10a.5.5 0 000 1h3a.5.5 0 000-1H8z"/></svg>`;

const tableIcon = (color: string) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="${color}"><path d="M2 2.5A1.5 1.5 0 013.5 1h9A1.5 1.5 0 0114 2.5v11a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 13.5v-11zM3.5 2a.5.5 0 00-.5.5V5h10V2.5a.5.5 0 00-.5-.5h-9zM3 6v3h4V6H3zm5 0v3h5V6H8zm5 4H8v3h4.5a.5.5 0 00.5-.5V10zM7 13v-3H3v2.5a.5.5 0 00.5.5H7z"/></svg>`;

const imageIcon = (color: string) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="${color}"><path d="M2 2.5A1.5 1.5 0 013.5 1h9A1.5 1.5 0 0114 2.5v11a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 13.5v-11zm8.5 3a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 13.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5v-2.293l-2.146-2.147a.5.5 0 00-.708 0L7.5 11.707 5.854 10.06a.5.5 0 00-.708 0L3 12.207v1.293z"/></svg>`;

const pdfIcon = (color: string) =>
  `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M3.5 1A1.5 1.5 0 002 2.5v11A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V6.621a1.5 1.5 0 00-.44-1.06L9.94 1.94A1.5 1.5 0 008.878 1.5H3.5z" fill="${color}"/><text x="8" y="12" text-anchor="middle" fill="#fff" font-size="6" font-weight="700" font-family="sans-serif">PDF</text></svg>`;

type IconDef = {
  icon: string;
};

// Extension -> icon mapping
const extIcons: Record<string, IconDef> = {
  // JavaScript/TypeScript
  ts: { icon: fileSquare('#3178c6', 'TS') },
  tsx: { icon: fileSquare('#3178c6', 'TS') },
  js: { icon: fileSquare('#f0db4f', 'JS') },
  jsx: { icon: fileSquare('#f0db4f', 'JS') },
  mjs: { icon: fileSquare('#f0db4f', 'JS') },
  cjs: { icon: fileSquare('#f0db4f', 'JS') },

  // Python
  py: { icon: fileSquare('#3572a5', 'Py') },

  // Markdown
  md: { icon: fileDoc('#56d4dd') },
  markdown: { icon: fileDoc('#56d4dd') },
  mdown: { icon: fileDoc('#56d4dd') },

  // Config
  json: { icon: fileSquare('#e8a32d', '{}') },
  jsonc: { icon: fileSquare('#e8a32d', '{}') },
  json5: { icon: fileSquare('#e8a32d', '{}') },
  yaml: { icon: fileDoc('#e8a32d') },
  yml: { icon: fileDoc('#e8a32d') },
  toml: { icon: fileDoc('#e8a32d') },
  ini: { icon: fileDoc('#e8a32d') },
  cfg: { icon: fileDoc('#e8a32d') },
  conf: { icon: fileDoc('#e8a32d') },
  env: { icon: fileDoc('#e8a32d') },

  // Web
  html: { icon: fileSquare('#e34f26', '<>') },
  htm: { icon: fileSquare('#e34f26', '<>') },
  css: { icon: fileSquare('#663399', '#') },
  scss: { icon: fileSquare('#c6538c', '#') },
  sass: { icon: fileSquare('#c6538c', '#') },
  less: { icon: fileSquare('#1d365d', '#') },
  vue: { icon: fileSquare('#41b883', 'V') },
  svelte: { icon: fileSquare('#ff3e00', 'S') },
  astro: { icon: fileSquare('#bc52ee', 'A') },

  // Go
  go: { icon: fileSquare('#00acd7', 'Go') },

  // Rust
  rs: { icon: fileSquare('#dea584', 'Rs') },

  // Ruby
  rb: { icon: fileSquare('#cc342d', 'Rb') },

  // Shell
  sh: { icon: terminalIcon('#4ec930') },
  bash: { icon: terminalIcon('#4ec930') },
  zsh: { icon: terminalIcon('#4ec930') },
  fish: { icon: terminalIcon('#4ec930') },
  ps1: { icon: terminalIcon('#4ec930') },
  bat: { icon: terminalIcon('#4ec930') },
  cmd: { icon: terminalIcon('#4ec930') },

  // Media/Images
  svg: { icon: imageIcon('#9b59b6') },
  png: { icon: imageIcon('#9b59b6') },
  jpg: { icon: imageIcon('#9b59b6') },
  jpeg: { icon: imageIcon('#9b59b6') },
  gif: { icon: imageIcon('#9b59b6') },
  webp: { icon: imageIcon('#9b59b6') },
  avif: { icon: imageIcon('#9b59b6') },
  ico: { icon: imageIcon('#9b59b6') },
  bmp: { icon: imageIcon('#9b59b6') },

  // Video/Audio
  mp4: { icon: imageIcon('#9b59b6') },
  webm: { icon: imageIcon('#9b59b6') },
  ogv: { icon: imageIcon('#9b59b6') },
  mov: { icon: imageIcon('#9b59b6') },
  mp3: { icon: imageIcon('#9b59b6') },
  wav: { icon: imageIcon('#9b59b6') },
  ogg: { icon: imageIcon('#9b59b6') },
  flac: { icon: imageIcon('#9b59b6') },
  aac: { icon: imageIcon('#9b59b6') },
  m4a: { icon: imageIcon('#9b59b6') },

  // PDF
  pdf: { icon: pdfIcon('#e5252a') },

  // CSV
  csv: { icon: tableIcon('#4ec930') },
  tsv: { icon: tableIcon('#4ec930') },
  tab: { icon: tableIcon('#4ec930') },

  // Other languages
  java: { icon: fileSquare('#b07219', 'Ja') },
  c: { icon: fileSquare('#555555', 'C') },
  cpp: { icon: fileSquare('#f34b7d', 'C+') },
  h: { icon: fileSquare('#555555', 'H') },
  hpp: { icon: fileSquare('#f34b7d', 'H') },
  php: { icon: fileSquare('#4f5d95', 'PH') },
  swift: { icon: fileSquare('#f05138', 'Sw') },
  kt: { icon: fileSquare('#a97bff', 'Kt') },
  scala: { icon: fileSquare('#c22d40', 'Sc') },
  lua: { icon: fileSquare('#000080', 'Lu') },
  r: { icon: fileSquare('#198ce7', 'R') },
  R: { icon: fileSquare('#198ce7', 'R') },
  pl: { icon: fileSquare('#0298c3', 'Pl') },
  sql: { icon: fileSquare('#e38c00', 'SQ') },

  // Text
  txt: { icon: fileDoc('#888888') },
  log: { icon: fileDoc('#888888') },
};

// Default gray document icon
const defaultIcon = fileDoc('#888888');

/**
 * Get an inline SVG icon for a filename.
 * @param name - The filename (e.g. "readme.md")
 * @param isDir - Whether it's a directory
 * @param isOpen - Whether the directory is expanded
 * @returns HTML string of inline SVG
 */
export function getFileIcon(name: string, isDir?: boolean, isOpen?: boolean): string {
  if (isDir) {
    const color = '#6ab0f3';
    return isOpen ? folderOpen(color) : folderClosed(color);
  }

  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  const def = extIcons[ext];
  return def ? def.icon : defaultIcon;
}

// Keep backward compat — old emoji function used in FileTreeItem
export function fileIcon(name: string): string {
  return getFileIcon(name, false, false);
}
