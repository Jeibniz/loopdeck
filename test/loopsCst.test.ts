import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { editLoopsText } from '../src/server/core/loopsCst.js';
import { docToLoopsFile, parseLoopsDoc } from '../src/server/core/loopsDoc.js';

const FIX = join(__dirname, 'fixtures', 'loops');
const read = (name: string) => readFileSync(join(FIX, `${name}.yaml`), 'utf8');

/** Count lines that differ between before and after. */
function changedLines(before: string, after: string): number {
  const b = before.split('\n');
  const a = after.split('\n');
  let n = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) n++;
  return n;
}

describe('CST edits preserve folded block scalars byte-for-byte', () => {
  it('toggleEnabled on vakio changes exactly one line (folded commands untouched)', () => {
    const before = read('vakio');
    const after = editLoopsText(before, { op: 'toggleEnabled', index: 0 });
    expect(changedLines(before, after)).toBe(1);
    expect(after).toContain('admin-api controllers must use'); // folded cmd intact, unwrapped
    expect(after).toContain('command: >'); // both folded blocks survive
    expect(after.split('command: >').length).toBe(3); // still two folded scalars
  });

  it('updateStage on vakio changes exactly one line', () => {
    const before = read('vakio');
    const after = editLoopsText(before, { op: 'updateStage', stage: 'steady' });
    expect(changedLines(before, after)).toBe(1);
    expect(after).toContain('stage: steady');
  });

  it('deleteLoop removes one loop without reflowing the survivor’s folded command', () => {
    const before = read('vakio');
    const after = editLoopsText(before, { op: 'deleteLoop', index: 1 });
    expect(after).not.toContain('web-design-sweep');
    // survivor's folded command stays multi-line, byte-identical
    expect(after).toContain(
      '      Weekly security review of vakilabs/vakio-platform. Look at changes merged to main in the last 7',
    );
  });

  it('never drops the routine / reviewer fields on toggle', () => {
    const after = editLoopsText(read('extras'), { op: 'toggleEnabled', index: 1 });
    expect(after).toContain('trig_011EssPMuDaJPZAAWgdZ55J5');
    expect(after).toContain('reviewer: security-reviewer');
  });

  it('addLoop appends a correctly-indented entry, existing folded blocks intact', () => {
    const before = read('vakio');
    const after = editLoopsText(before, {
      op: 'addLoop',
      loop: { name: 'new-sweep', kind: 'producer', command: '/review', cron: '0 5 * * 2', enabled: false },
    });
    // parses back cleanly with the new loop present
    const file = docToLoopsFile(parseLoopsDoc(after));
    expect(file.unparseable).toBeUndefined();
    expect(file.loops.map((l) => l.name)).toContain('new-sweep');
    expect(file.loops).toHaveLength(3);
    // folded command of an existing loop preserved
    expect(after).toContain('admin-api controllers must use');
  });

  it('updateLoop edits scalar fields, keeps siblings byte-identical', () => {
    const before = read('extras');
    const after = editLoopsText(before, {
      op: 'updateLoop',
      index: 0,
      loop: { name: 'implement', kind: 'consumer', command: '/autopilot --once --auto-merge', cron: '0 3 * * *', enabled: false },
    });
    const file = docToLoopsFile(parseLoopsDoc(after));
    const impl = file.loops.find((l) => l.name === 'implement')!;
    expect(impl.cron).toBe('0 3 * * *');
    expect(impl.command).toBe('/autopilot --once --auto-merge');
    expect(impl.enabled).toBe(false);
    // the OTHER loop's routine stays intact
    expect(after).toContain('trig_011EssPMuDaJPZAAWgdZ55J5');
  });

  it('round-trips scaffold + kontera-style quoted commands with zero spurious changes on toggle', () => {
    const before = read('scaffold');
    const after = editLoopsText(before, { op: 'toggleEnabled', index: 0 });
    expect(changedLines(before, after)).toBe(1);
  });
});
