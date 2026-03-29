/**
 * CSV/TSV renderer — builds an HTML table from CSV data.
 * Simple parser: no external dependencies.
 */

import { readFileSync } from 'fs';
import { extname } from 'path';
import { htmlEscape } from '../../shared/utils.js';
import { getFileMeta } from '../../shared/fs.js';
import { csvPageHtml } from './html-templates.js';

/**
 * Parse a CSV/TSV string into rows of string arrays.
 * Handles quoted fields with embedded delimiters and newlines.
 */
function parseCsv(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          // Escaped quote
          field += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        // Handle \r\n
        if (ch === '\r' && i + 1 < content.length && content[i + 1] === '\n') {
          i += 2;
        } else {
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Last field/row
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function renderCsv(filepath: string, head?: number | null, tail?: number | null): string {
  const ext = extname(filepath).toLowerCase();
  const delimiter = (ext === '.tsv' || ext === '.tab') ? '\t' : ',';

  const content = readFileSync(filepath, 'utf-8');
  let rows = parseCsv(content, delimiter);

  if (head != null) {
    rows = rows.slice(0, head + 1); // +1 to include header
  } else if (tail != null) {
    const header = rows.slice(0, 1);
    rows = [...header, ...rows.slice(-tail)];
  }

  let bodyHtml: string;
  if (rows.length === 0) {
    bodyHtml = '<p>Empty file</p>';
  } else {
    const header = rows[0];
    const data = rows.slice(1);
    const thead = '<tr>' + header.map(c => `<th>${htmlEscape(c)}</th>`).join('') + '</tr>';
    const tbody = data.map(row =>
      '<tr>' + row.map(c => `<td>${htmlEscape(c)}</td>`).join('') + '</tr>'
    ).join('');
    bodyHtml = `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  }

  const meta = getFileMeta(filepath);
  const rowCount = Math.max(0, rows.length - 1);

  return csvPageHtml({
    displayPath: meta.display_path,
    fileMeta: `${meta.size} \u00b7 ${rowCount} rows \u00b7 ${meta.mtime}`,
    bodyHtml,
  });
}
