import { describe, it, expect } from 'vitest';
import { validateCron, isValidStage, validateLoopCore } from '../src/server/core/validate.js';

describe('validateCron', () => {
  it('accepts standard 5-field expressions', () => {
    const r = validateCron('0 2 * * 1');
    expect(r.valid).toBe(true);
    expect(r.human).toMatch(/Monday/i);
    expect(r.next).toBeTruthy();
  });

  it('accepts the vakio expression', () => {
    expect(validateCron('7 6 * * 1').valid).toBe(true);
  });

  it('rejects garbage', () => {
    const r = validateCron('not a cron');
    expect(r.valid).toBe(false);
    expect(r.message).toBeTruthy();
  });

  it('rejects an out-of-range field', () => {
    expect(validateCron('99 99 * * *').valid).toBe(false);
  });

  it('rejects empty', () => {
    expect(validateCron('   ').valid).toBe(false);
  });
});

describe('isValidStage', () => {
  it('accepts the enum', () => {
    expect(isValidStage('early')).toBe(true);
    expect(isValidStage('steady')).toBe(true);
    expect(isValidStage('maintenance')).toBe(true);
  });
  it('rejects others', () => {
    expect(isValidStage('whenever')).toBe(false);
  });
});

describe('validateLoopCore', () => {
  const base = {
    name: 'sweep',
    kind: 'producer' as const,
    command: '/review',
    cron: '0 2 * * 1',
    enabled: false,
  };

  it('passes a valid loop', () => {
    expect(validateLoopCore(base, ['implement']).ok).toBe(true);
  });

  it('rejects a duplicate name (case-insensitive)', () => {
    const r = validateLoopCore(base, ['Sweep']);
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/duplicate/);
  });

  it('rejects empty name and command', () => {
    const r = validateLoopCore({ ...base, name: '', command: '' }, []);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects a bad kind', () => {
    // @ts-expect-error testing runtime guard
    expect(validateLoopCore({ ...base, kind: 'banana' }, []).ok).toBe(false);
  });

  it('allows an omitted kind (producer-only files)', () => {
    const noKind = { name: 'sweep', command: '/review', cron: '0 2 * * 1', enabled: false };
    expect(validateLoopCore(noKind, []).ok).toBe(true);
  });

  it('rejects an invalid cron', () => {
    expect(validateLoopCore({ ...base, cron: 'nope' }, []).ok).toBe(false);
  });
});
