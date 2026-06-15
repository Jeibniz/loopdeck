import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  buildPrompt,
  claudeArgs,
  cleanResponse,
  DISALLOWED_TOOLS,
  resolveTarget,
  runClaude,
  slugify,
} from '../src/server/core/assist.js';

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

describe('claude is locked down (security)', () => {
  it('disallows every file-touching / network / code tool', () => {
    const args = claudeArgs();
    const i = args.indexOf('--disallowed-tools');
    expect(i).toBeGreaterThan(-1);
    const listed = args.slice(i + 1);
    // a future flag rename / dropped tool fails this test
    for (const t of ['Bash', 'Edit', 'Write', 'NotebookEdit', 'WebFetch', 'WebSearch']) {
      expect(listed).toContain(t);
    }
    expect([...DISALLOWED_TOOLS]).toEqual(listed);
  });

  it('runs claude in an isolated temp dir, not the caller’s project', async () => {
    let seenCwd = '';
    let seenArgs: string[] = [];
    const fakeSpawn = ((_cmd: string, args: string[], opts: { cwd: string }) => {
      seenCwd = opts.cwd;
      seenArgs = args;
      const child = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        stdin: { end: (s: string) => void };
        kill: () => void;
      };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.stdin = { end: () => {} };
      child.kill = () => {};
      setTimeout(() => {
        child.stdout.emit('data', 'ok\n');
        child.emit('close', 0);
      }, 0);
      return child;
    }) as unknown as typeof import('node:child_process').spawn;

    const out = await runClaude('hi', 5000, fakeSpawn);
    expect(out).toBe('ok\n');
    expect(seenCwd).toContain('loopdeck-claude-'); // isolated sandbox, not the project
    expect(seenArgs).toContain('--disallowed-tools');
  });
});
