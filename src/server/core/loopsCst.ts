// CST-based editor for loops.yaml. Grounded in docs/domain/yaml-document-api.md
// + ADR 0002: the high-level Document stringifier RE-FOLDS block scalars
// (`command: >`), so editing one field reflows unrelated multi-line commands —
// noisy, against the tool's whole point. The CST (concrete syntax tree)
// preserves every untouched token byte-for-byte, so in-place edits change only
// the bytes they must. Reading/validation still use the Document API
// (loopsDoc.ts); this module owns WRITES.
import { Parser, CST } from 'yaml';
import type { LoopCorePatch, LoopOp } from '../types.js';

type Token = CST.Token;
interface CollItem {
  key?: Token;
  value?: Token;
  start: Token[];
  sep?: Token[];
}

function parseTokens(text: string): Token[] {
  return [...new Parser().parse(text)];
}

function rootMap(tokens: Token[]): CST.BlockMap {
  const doc = tokens.find((t) => t.type === 'document') as CST.Document | undefined;
  const value = doc?.value;
  if (!value || value.type !== 'block-map') {
    throw new Error('loops.yaml root is not a mapping');
  }
  return value;
}

function findEntry(map: CST.BlockMap, key: string): CollItem | undefined {
  return map.items.find(
    (it) => it.key && CST.isScalar(it.key) && it.key.source === key,
  ) as CollItem | undefined;
}

function loopsSeq(map: CST.BlockMap): CST.BlockSequence {
  const entry = findEntry(map, 'loops');
  if (!entry?.value || entry.value.type !== 'block-seq') {
    throw new Error('loops: is not a sequence');
  }
  return entry.value;
}

function seqItemMap(seq: CST.BlockSequence, index: number): CST.BlockMap {
  const item = seq.items[index];
  if (!item || !item.value || item.value.type !== 'block-map') {
    throw new Error(`loop index out of range: ${index}`);
  }
  return item.value;
}

function setField(map: CST.BlockMap, key: string, value: string): void {
  const entry = findEntry(map, key);
  if (entry?.value && CST.isScalar(entry.value)) {
    CST.setScalarValue(entry.value, value);
  } else {
    throw new Error(`field not found or not scalar: ${key}`);
  }
}

function removeField(map: CST.BlockMap, key: string): void {
  const idx = map.items.findIndex(
    (it) => it.key && CST.isScalar(it.key) && it.key.source === key,
  );
  if (idx >= 0) map.items.splice(idx, 1);
}

function hasField(map: CST.BlockMap, key: string): boolean {
  return !!findEntry(map, key);
}

/** Apply an in-place op to the parsed CST tokens. (addLoop is handled in
 *  editLoopsText via append, not here.) */
function applyOpCst(tokens: Token[], op: LoopOp): void {
  const root = rootMap(tokens);

  switch (op.op) {
    case 'updateStage': {
      const entry = findEntry(root, 'stage');
      if (entry?.value && CST.isScalar(entry.value)) CST.setScalarValue(entry.value, op.stage);
      else throw new Error('stage field not found');
      return;
    }
    case 'toggleEnabled': {
      const m = seqItemMap(loopsSeq(root), op.index);
      const entry = findEntry(m, 'enabled');
      const cur = entry?.value && CST.isScalar(entry.value) ? entry.value.source : 'false';
      setField(m, 'enabled', cur === 'true' ? 'false' : 'true');
      return;
    }
    case 'deleteLoop': {
      const seq = loopsSeq(root);
      if (op.index < 0 || op.index >= seq.items.length) {
        throw new Error(`loop index out of range: ${op.index}`);
      }
      seq.items.splice(op.index, 1);
      return;
    }
    case 'updateLoop': {
      const m = seqItemMap(loopsSeq(root), op.index);
      const { loop } = op;
      setField(m, 'name', loop.name);
      setField(m, 'cron', loop.cron);
      setField(m, 'enabled', String(loop.enabled));
      setField(m, 'command', loop.command);
      if (loop.kind !== undefined) {
        if (hasField(m, 'kind')) setField(m, 'kind', loop.kind);
        // (adding a brand-new kind key mid-map is rare; skip to avoid layout churn)
      } else if (hasField(m, 'kind')) {
        removeField(m, 'kind');
      }
      return;
    }
    case 'addLoop':
      // Handled in editLoopsText after byte-perfect serialization (append).
      throw new Error('addLoop handled separately');
  }
}

/** Build the YAML text for a new loop entry at the sequence's indentation. */
function newLoopBlock(seq: CST.BlockSequence, loop: LoopCorePatch): string {
  const indent = seq.indent ?? 2;
  const pad = ' '.repeat(indent);
  const fieldPad = ' '.repeat(indent + 2);
  const lines = [`${pad}- name: ${q(loop.name)}`];
  if (loop.kind !== undefined) lines.push(`${fieldPad}kind: ${loop.kind}`);
  lines.push(`${fieldPad}command: ${q(loop.command)}`);
  lines.push(`${fieldPad}cron: ${q(loop.cron)}`);
  lines.push(`${fieldPad}enabled: ${loop.enabled}`);
  return lines.join('\n');
}

/** Is `loops:` the last entry of the root map? (true for all real files —
 *  then the sequence runs to EOF and we can simply append.) */
function loopsIsLastRootKey(root: CST.BlockMap): boolean {
  const items = root.items;
  const last = items[items.length - 1];
  return !!last?.key && CST.isScalar(last.key) && last.key.source === 'loops';
}

/** Quote a scalar value for safe single-line YAML emission. */
function q(s: string): string {
  if (s === '') return "''";
  // Quote if it could be misread (leading special, contains :#, etc.); else bare.
  if (/^[\w./-][\w ./@:*-]*$/.test(s) && !/^\s|\s$/.test(s)) return `"${s}"`;
  return JSON.stringify(s);
}

/** Parse → apply → serialize, preserving every untouched byte. */
export function editLoopsText(text: string, op: LoopOp): string {
  const tokens = parseTokens(text);
  const root = rootMap(tokens);

  if (op.op === 'addLoop') {
    const seq = loopsSeq(root);
    const block = newLoopBlock(seq, op.loop);
    const out = tokens.map((t) => CST.stringify(t)).join('');
    if (loopsIsLastRootKey(root)) {
      // Sequence runs to EOF: append after trimming trailing blank lines.
      return `${out.replace(/\s*$/, '')}\n${block}\n`;
    }
    // Rare: loops not last. Insert before the next root key's text by locating
    // the seq's end via the next sibling entry's first token offset.
    return insertBeforeNextKey(text, out, root, block);
  }

  applyOpCst(tokens, op);
  return tokens.map((t) => CST.stringify(t)).join('');
}

/** Fallback for the rare case where `loops:` is not the last root key. */
function insertBeforeNextKey(
  _origText: string,
  out: string,
  root: CST.BlockMap,
  block: string,
): string {
  const idx = root.items.findIndex(
    (it) => it.key && CST.isScalar(it.key) && it.key.source === 'loops',
  );
  const next = root.items[idx + 1];
  const nextKey = next?.key;
  if (nextKey && CST.isScalar(nextKey) && typeof nextKey.offset === 'number') {
    // The next root key's source is unique enough to split on for our files.
    const marker = `\n${nextKey.source}:`;
    const at = out.indexOf(marker);
    if (at >= 0) return `${out.slice(0, at)}\n${block}${out.slice(at)}`;
  }
  // Give up gracefully: append at end.
  return `${out.replace(/\s*$/, '')}\n${block}\n`;
}
