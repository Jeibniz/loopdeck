// The READ side of loops.yaml: parse a file into the display DTO, preserving
// knowledge of unknown/passthrough fields. Grounded in docs/domain/loops-schema.md.
// WRITES live in loopsCst.ts — they go through the CST so untouched bytes
// (crucially folded `command: >` blocks) are preserved verbatim (ADR 0002);
// the high-level Document stringifier re-folds them, which we must avoid.
import { Document, parseDocument } from 'yaml';
import type { CronCheck, Loop, LoopsFile } from '../types.js';

const CORE_LOOP_KEYS = new Set(['name', 'kind', 'command', 'cron', 'enabled']);
const ROOT_RESERVED = new Set(['stage', 'loops']);

/** Parse text into a Document (used for reading + error detection). */
export function parseLoopsDoc(text: string): Document.Parsed {
  return parseDocument(text);
}

type Enrich = (cron: string) => CronCheck;

/** Build the display DTO from a parsed Document. `enrich` adds cron
 *  validity/human text when provided (kept out of this module to avoid a
 *  hard dependency on the cron libs). */
export function docToLoopsFile(doc: Document.Parsed, enrich?: Enrich): LoopsFile {
  if (doc.errors.length > 0) {
    return {
      rootExtra: {},
      loops: [],
      unparseable: { message: doc.errors[0]!.message },
    };
  }

  const js = (doc.toJS() ?? {}) as Record<string, unknown>;
  const rootExtra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(js)) {
    if (!ROOT_RESERVED.has(k)) rootExtra[k] = v;
  }

  const rawLoops = Array.isArray(js.loops) ? (js.loops as Record<string, unknown>[]) : [];
  const loops: Loop[] = rawLoops.map((raw) => {
    const extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!CORE_LOOP_KEYS.has(k)) extra[k] = v;
    }
    const cron = String(raw.cron ?? '');
    const check = enrich?.(cron);
    return {
      name: String(raw.name ?? ''),
      kind: raw.kind as Loop['kind'],
      command: String(raw.command ?? ''),
      cron,
      enabled: Boolean(raw.enabled),
      cronValid: check ? check.valid : true,
      cronHuman: check?.human,
      extra,
    };
  });

  return { stage: js.stage as LoopsFile['stage'], rootExtra, loops };
}
