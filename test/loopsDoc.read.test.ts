import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { docToLoopsFile, parseLoopsDoc } from '../src/server/core/loopsDoc.js';

const FIX = join(__dirname, 'fixtures', 'loops');
const read = (name: string) => readFileSync(join(FIX, `${name}.yaml`), 'utf8');

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

  it('enriches cron when a checker is supplied', () => {
    const file = docToLoopsFile(parseLoopsDoc(read('scaffold')), (c) => ({
      valid: c.startsWith('0'),
      human: 'human',
    }));
    expect(file.loops[0]!.cronHuman).toBe('human');
  });
});
