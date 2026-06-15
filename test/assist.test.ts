import { describe, it, expect } from 'vitest';
import { buildPrompt, cleanResponse, resolveTarget, slugify } from '../src/server/core/assist.js';

describe('slugify', () => {
  it('kebab-cases names', () => {
    expect(slugify('My New Sweep!')).toBe('my-new-sweep');
    expect(slugify('  spaced  ')).toBe('spaced');
    expect(slugify('')).toBe('untitled');
  });
});

describe('resolveTarget', () => {
  it('uses targetPath when editing', () => {
    expect(resolveTarget({ kind: 'agent', projectDir: '/p', targetPath: '/p/x.md' })).toEqual({
      path: '/p/x.md',
      isNew: false,
    });
  });
  it('builds a new agent path', () => {
    expect(resolveTarget({ kind: 'agent', projectDir: '/p', newName: 'Bug Fixer' })).toEqual({
      path: '/p/.claude/agents/bug-fixer.md',
      isNew: true,
    });
  });
  it('builds a new skill path', () => {
    expect(resolveTarget({ kind: 'skill', projectDir: '/p', newName: 'Deploy' })).toEqual({
      path: '/p/.claude/skills/deploy/SKILL.md',
      isNew: true,
    });
  });
  it('loops always resolves to loops.yaml (not new)', () => {
    expect(resolveTarget({ kind: 'loops', projectDir: '/p' })).toEqual({
      path: '/p/loops.yaml',
      isNew: false,
    });
  });
});

describe('buildPrompt', () => {
  it('embeds current content when editing and demands raw output', () => {
    const p = buildPrompt({
      kind: 'loops',
      instruction: 'disable all',
      currentContent: 'stage: live',
      isNew: false,
    });
    expect(p).toContain('<CURRENT>');
    expect(p).toContain('stage: live');
    expect(p).toContain('disable all');
    expect(p).toMatch(/ONLY the complete new file content/i);
    expect(p).toContain('routine'); // loops conventions warn about machine-owned field
  });
  it('says creating for a new file', () => {
    const p = buildPrompt({
      kind: 'agent',
      instruction: 'a linter agent',
      currentContent: '',
      isNew: true,
    });
    expect(p).toMatch(/CREATING a new file/i);
    expect(p).not.toContain('<CURRENT>');
  });
});

describe('cleanResponse', () => {
  it('unwraps a fenced block', () => {
    expect(cleanResponse('```yaml\nstage: live\n```')).toBe('stage: live\n');
  });
  it('keeps plain content and ensures a trailing newline', () => {
    expect(cleanResponse('stage: live')).toBe('stage: live\n');
  });
});
