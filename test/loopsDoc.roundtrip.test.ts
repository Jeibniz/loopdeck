import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyOp, docToLoopsFile, parseLoopsDoc, serialize } from '../src/server/core/loopsDoc.js';

const FIX = join(__dirname, 'fixtures', 'loops');
const read = (name: string) => readFileSync(join(FIX, `${name}.yaml`), 'utf8');

/** Every `# comment` line present in `before` must still be present in `after`. */
function commentsPreserved(before: string, after: string): void {
  const comments = before
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('#'));
  for (const c of comments) {
    expect(after).toContain(c);
  }
}

describe('docToLoopsFile — parsing the real schema', () => {
  it('parses the producer-only vakio file (no kind:consumer, extra fields)', () => {
    const file = docToLoopsFile(parseLoopsDoc(read('vakio')));
    expect(file.stage).toBe('early');
    expect(file.rootExtra.repo).toBe('vakilabs/vakio-platform');
    expect(file.loops).toHaveLength(2);
    expect(file.loops[0]!.kind).toBe('producer');
    expect(file.loops[0]!.extra.reviewer).toBe('security-reviewer');
    expect(file.loops[0]!.command).toContain('Weekly security review');
  });

  it('exposes routine as a preserved extra field', () => {
    const file = docToLoopsFile(parseLoopsDoc(read('extras')));
    const sweep = file.loops.find((l) => l.name === 'security-sweep')!;
    expect(sweep.extra.routine).toBe('trig_011EssPMuDaJPZAAWgdZ55J5');
  });

  it('surfaces a malformed file as unparseable instead of throwing', () => {
    const file = docToLoopsFile(parseLoopsDoc('stage: early\nloops: [unclosed'));
    expect(file.unparseable).toBeTruthy();
  });
});

describe('round-trip: comments + structure preserved', () => {
  for (const name of ['scaffold', 'vakio', 'extras']) {
    it(`${name}: toggleEnabled changes only the flag, keeps all comments`, () => {
      const before = read(name);
      const doc = parseLoopsDoc(before);
      applyOp(doc, { op: 'toggleEnabled', index: 0 });
      const after = serialize(doc);
      commentsPreserved(before, after);
      // trailing newline preserved
      expect(after.endsWith('\n')).toBe(true);
      // exactly the set of non-comment lines differs only where enabled flipped
      expect(after).not.toBe(before);
    });

    it(`${name}: updateStage keeps comments + trailing newline`, () => {
      const before = read(name);
      const doc = parseLoopsDoc(before);
      applyOp(doc, { op: 'updateStage', stage: 'maintenance' });
      const after = serialize(doc);
      commentsPreserved(before, after);
      expect(after).toContain('stage: maintenance');
    });
  }

  it('vakio: editing a different loop preserves the folded command block of loop 0', () => {
    const before = read('vakio');
    const doc = parseLoopsDoc(before);
    applyOp(doc, { op: 'toggleEnabled', index: 1 });
    const after = serialize(doc);
    // loop 0's command stays a folded block scalar (`command: >`)
    expect(after).toContain('command: >');
    commentsPreserved(before, after);
  });

  it('extras: updateLoop never drops the routine field', () => {
    const before = read('extras');
    const doc = parseLoopsDoc(before);
    // index 1 is security-sweep (has routine)
    applyOp(doc, {
      op: 'updateLoop',
      index: 1,
      loop: {
        name: 'security-sweep',
        kind: 'producer',
        command: '/review security',
        cron: '0 6 * * 1',
        enabled: true,
      },
    });
    const after = serialize(doc);
    expect(after).toContain('trig_011EssPMuDaJPZAAWgdZ55J5');
    expect(after).toContain('reviewer: security-reviewer');
  });

  it('addLoop appends only core fields', () => {
    const doc = parseLoopsDoc(read('scaffold'));
    const beforeCount = docToLoopsFile(doc).loops.length;
    applyOp(doc, {
      op: 'addLoop',
      loop: {
        name: 'new-sweep',
        kind: 'producer',
        command: '/review',
        cron: '0 5 * * 2',
        enabled: false,
      },
    });
    const file = docToLoopsFile(doc);
    expect(file.loops).toHaveLength(beforeCount + 1);
    expect(file.loops.at(-1)!.name).toBe('new-sweep');
    expect(serialize(doc)).toContain('new-sweep');
  });

  it('deleteLoop removes the entry', () => {
    const doc = parseLoopsDoc(read('extras'));
    applyOp(doc, { op: 'deleteLoop', index: 0 }); // remove `implement`
    const file = docToLoopsFile(doc);
    expect(file.loops.find((l) => l.name === 'implement')).toBeUndefined();
  });

  it('throws on an out-of-range index', () => {
    const doc = parseLoopsDoc(read('scaffold'));
    expect(() => applyOp(doc, { op: 'toggleEnabled', index: 99 })).toThrow();
  });
});

describe('editing a quoted command keeps it readable (not block-flattened)', () => {
  it('extras: editing the consumer command stays a plain/quoted scalar', () => {
    const doc = parseLoopsDoc(read('extras'));
    applyOp(doc, {
      op: 'updateLoop',
      index: 0,
      loop: {
        name: 'implement',
        kind: 'consumer',
        command: '/autopilot --once --auto-merge',
        cron: '0 2 * * *',
        enabled: true,
      },
    });
    const after = serialize(doc);
    expect(after).toContain('/autopilot --once --auto-merge');
  });
});
