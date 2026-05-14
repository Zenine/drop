import { renderTerminalQr, type WritableStreamLike } from './qr.js';

export type ShareResult = {
  url: string;
  [key: string]: unknown;
};

export type ShareOutputOptions = {
  json?: boolean;
  qr?: boolean;
  stdout?: WritableStreamLike;
  stderr?: WritableStreamLike;
  qrRenderer?: (url: string) => string;
  stderrMessages?: string[];
};

function writeLine(stream: WritableStreamLike, line: string): void {
  stream.write(`${line}\n`);
}

function writeQr(url: string, opts: ShareOutputOptions): void {
  if (!opts.qr) return;
  const stderr = opts.stderr ?? process.stderr;
  try {
    const rendered = opts.qrRenderer ? opts.qrRenderer(url) : renderTerminalQr(url);
    if (!rendered) return;
    stderr.write(`${rendered.endsWith('\n') ? rendered : `${rendered}\n`}`);
  } catch (e: any) {
    writeLine(stderr, `Warning: failed to render QR code: ${e?.message ?? e}`);
  }
}

export function outputShareResult(result: ShareResult, opts: ShareOutputOptions = {}): void {
  const stdout = opts.stdout ?? process.stdout;
  const stderr = opts.stderr ?? process.stderr;

  if (opts.json) {
    writeLine(stdout, JSON.stringify(result));
  } else {
    writeLine(stdout, result.url);
    for (const message of opts.stderrMessages ?? []) {
      writeLine(stderr, message);
    }
  }

  writeQr(result.url, opts);
}

export function outputShareError(message: string, opts: ShareOutputOptions = {}): void {
  const stdout = opts.stdout ?? process.stdout;
  const stderr = opts.stderr ?? process.stderr;
  if (opts.json) {
    writeLine(stdout, JSON.stringify({ error: message }));
  } else {
    writeLine(stderr, message);
  }
}
