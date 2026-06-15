// Read/edit the YAML frontmatter of agent/skill Markdown files
// (docs/domain/loops-schema.md). Only name/description are editable; the
// Markdown body is preserved byte-for-byte. Uses the yaml Document API so any
// comments/extra keys in the frontmatter survive too.
import { parseDocument } from 'yaml';

export interface ParsedMd {
  name: string;
  description: string;
  /** Raw frontmatter block (between the --- fences), for re-parsing on write. */
  frontmatterText: string;
  /** Everything after the closing fence, preserved verbatim. */
  body: string;
  /** True if the file had a valid `---`-delimited frontmatter block. */
  hasFrontmatter: boolean;
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseMd(text: string): ParsedMd {
  const m = text.match(FENCE);
  if (!m) {
    return { name: '', description: '', frontmatterText: '', body: text, hasFrontmatter: false };
  }
  const frontmatterText = m[1] ?? '';
  const body = text.slice(m[0].length);
  const fm = (parseDocument(frontmatterText).toJS() ?? {}) as Record<string, unknown>;
  return {
    name: String(fm.name ?? ''),
    description: String(fm.description ?? ''),
    frontmatterText,
    body,
    hasFrontmatter: true,
  };
}

/** Return new file text with name/description updated. The body is replaced
 *  when `body` is provided, otherwise kept exactly as-is. */
export function setFrontmatter(
  text: string,
  name: string,
  description: string,
  body?: string,
): string {
  const m = text.match(FENCE);
  if (!m) {
    throw new Error('file has no frontmatter block');
  }
  const doc = parseDocument(m[1] ?? '');
  doc.set('name', name);
  doc.set('description', description);
  const newFm = doc.toString({ lineWidth: 0 }).replace(/\n$/, '');
  const newBody = body !== undefined ? body : text.slice(m[0].length);
  // Reassemble with canonical fences.
  return `---\n${newFm}\n---\n${newBody}`;
}
