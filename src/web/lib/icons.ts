const iconMap: Record<string, string> = {
  md: '\ud83d\udcdd',
  txt: '\ud83d\udcc4',
  json: '\ud83d\udccb',
  yaml: '\ud83d\udccb',
  yml: '\ud83d\udccb',
  toml: '\ud83d\udccb',
  py: '\ud83d\udc0d',
  js: '\ud83d\udcdc',
  ts: '\ud83d\udcdc',
  go: '\ud83d\udd35',
  rs: '\ud83e\udd80',
  rb: '\ud83d\udc8e',
  html: '\ud83c\udf10',
  css: '\ud83c\udfa8',
  svg: '\ud83c\udfa8',
  png: '\ud83d\uddbc',
  jpg: '\ud83d\uddbc',
  jpeg: '\ud83d\uddbc',
  gif: '\ud83d\uddbc',
  webp: '\ud83d\uddbc',
  avif: '\ud83d\uddbc',
  sh: '\u26a1',
  bash: '\u26a1',
  zsh: '\u26a1',
};

export function fileIcon(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  return iconMap[ext] || '\ud83d\udcc4';
}
