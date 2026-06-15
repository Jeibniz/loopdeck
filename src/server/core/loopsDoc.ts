// The heart: comment-preserving read/edit/write of loops.yaml.
// Grounded in docs/domain/yaml-document-api.md + ADR 0001/0002:
//   parse with parseDocument → mutate the SAME Document surgically → toString.
// Never round-trip through toJS()+new Document(): that drops comments, blank
// lines, field order, anchors, and block-scalar styles. Unknown fields
// (reviewer, routine, repo, …) are preserved because we only touch named paths.
import { Document, Scalar, isScalar, isSeq, parseDocument } from 'yaml';
import type { CronCheck, Loop, LoopCorePatch, LoopOp, LoopsFile } from '../types.js';

const CORE_LOOP_KEYS = new Set(['name', 'kind', 'command', 'cron', 'enabled']);
const ROOT_RESERVED = new Set(['stage', 'loops']);

/** Parse text into a mutable Document (preserves everything). */
export function parseLoopsDoc(text: string): Document.Parsed {
  return parseDocument(text);
}

/** Serialize back to YAML with wrapping disabled for round-trip fidelity. */
export function serialize(doc: Document): string {
  return doc.toString({ lineWidth: 0 });
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

/** Apply a typed op to the Document in place. Throws Error on a bad index. */
export function applyOp(doc: Document, op: LoopOp): void {
  switch (op.op) {
    case 'updateStage':
      doc.set('stage', op.stage);
      return;

    case 'toggleEnabled': {
      assertLoopIndex(doc, op.index);
      const cur = doc.getIn(['loops', op.index, 'enabled']);
      doc.setIn(['loops', op.index, 'enabled'], !cur);
      return;
    }

    case 'updateLoop': {
      assertLoopIndex(doc, op.index);
      const { loop } = op;
      doc.setIn(['loops', op.index, 'name'], loop.name);
      doc.setIn(['loops', op.index, 'cron'], loop.cron);
      doc.setIn(['loops', op.index, 'enabled'], loop.enabled);
      setCommandPreservingStyle(doc, op.index, loop.command);
      // Only touch `kind` if it was present or is being set; never inject it
      // into producer-only files that omit it (ADR 0001).
      if (loop.kind !== undefined) {
        doc.setIn(['loops', op.index, 'kind'], loop.kind);
      } else if (doc.hasIn(['loops', op.index, 'kind'])) {
        doc.deleteIn(['loops', op.index, 'kind']);
      }
      return;
    }

    case 'deleteLoop':
      assertLoopIndex(doc, op.index);
      doc.deleteIn(['loops', op.index]);
      return;

    case 'addLoop': {
      const node = doc.createNode(compactLoop(op.loop));
      const seq = doc.get('loops', true);
      if (isSeq(seq)) {
        seq.add(node);
      } else {
        doc.set('loops', doc.createNode([compactLoop(op.loop)]));
      }
      return;
    }
  }
}

/** Set `command` while keeping a block-scalar style (`>` / `|`) if the
 *  existing value used one (docs/domain/yaml-document-api.md §6b). */
function setCommandPreservingStyle(doc: Document, index: number, command: string): void {
  const node = doc.getIn(['loops', index, 'command'], true);
  if (isScalar(node)) {
    const prevType = node.type;
    node.value = command;
    if (prevType === Scalar.BLOCK_FOLDED || prevType === Scalar.BLOCK_LITERAL) {
      node.type = prevType;
    }
    return;
  }
  doc.setIn(['loops', index, 'command'], command);
}

/** A new loop only carries the core fields, in canonical order. */
function compactLoop(loop: LoopCorePatch): Record<string, unknown> {
  const out: Record<string, unknown> = { name: loop.name };
  if (loop.kind !== undefined) out.kind = loop.kind;
  out.command = loop.command;
  out.cron = loop.cron;
  out.enabled = loop.enabled;
  return out;
}

function loopCount(doc: Document): number {
  const seq = doc.get('loops', true);
  return isSeq(seq) ? seq.items.length : 0;
}

function assertLoopIndex(doc: Document, index: number): void {
  const n = loopCount(doc);
  if (!Number.isInteger(index) || index < 0 || index >= n) {
    throw new Error(`loop index out of range: ${index} (have ${n})`);
  }
}
