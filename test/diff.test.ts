import { describe, it, expect } from 'vitest';
import { diffLines, unifiedDiff } from '../src/server/core/diff.js';

describe('diffLines', () => {
  it('marks a single changed line as one del + one add, rest context', () => {
    const before = 'a\nb\nc\n';
    const after = 'a\nB\nc\n';
    const lines = diffLines(before, after);
    expect(lines.filter((l) => l.type === 'del')).toEqual([{ type: 'del', text: 'b' }]);
    expect(lines.filter((l) => l.type === 'add')).toEqual([{ type: 'add', text: 'B' }]);
    expect(lines.filter((l) => l.type === 'ctx').map((l) => l.text)).toEqual(['a', 'c', '']);
  });

  it('identical input yields only context', () => {
    const lines = diffLines('x\ny\n', 'x\ny\n');
    expect(lines.every((l) => l.type === 'ctx')).toBe(true);
  });
});

describe('unifiedDiff', () => {
  it('prefixes changed lines with +/-', () => {
    const out = unifiedDiff('enabled: false\n', 'enabled: true\n');
    expect(out).toContain('-enabled: false');
    expect(out).toContain('+enabled: true');
  });
});
