import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server/app.js';

let root: string;
let app: FastifyInstance;
let loopsPath: string;

const LOOPS = `# header comment
stage: early
loops:
  - name: implement
    kind: consumer
    command: "/autopilot --once"
    cron: "0 2 * * *" # nightly
    enabled: false
`;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'loopdeck-app-'));
  const proj = join(root, 'proj');
  await mkdir(join(proj, '.claude', 'agents'), { recursive: true });
  loopsPath = join(proj, 'loops.yaml');
  await writeFile(loopsPath, LOOPS);
  await writeFile(
    join(proj, '.claude', 'agents', 'planner.md'),
    `---\nname: planner\ndescription: Plan.\n---\nbody\n`,
  );
  app = buildApp({ root });
  await app.ready();
});
afterEach(async () => {
  await app.close();
  await rm(root, { recursive: true, force: true });
});

describe('GET /api/scan', () => {
  it('returns the project with parsed loops', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/scan' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0].loopsFile.loops[0].name).toBe('implement');
  });
});

describe('POST /api/loops/preview', () => {
  it('returns a diff without writing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/loops/preview',
      payload: { path: loopsPath, op: { op: 'toggleEnabled', index: 0 } },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().diff).toContain('+    enabled: true');
    // unchanged on disk
    expect(await readFile(loopsPath, 'utf8')).toBe(LOOPS);
  });
});

describe('PUT /api/loops', () => {
  it('writes the change and preserves the header comment', async () => {
    const { mtimeMs } = await stat(loopsPath);
    const res = await app.inject({
      method: 'PUT',
      url: '/api/loops',
      payload: { path: loopsPath, mtimeMs, op: { op: 'toggleEnabled', index: 0 } },
    });
    expect(res.statusCode).toBe(200);
    const after = await readFile(loopsPath, 'utf8');
    expect(after).toContain('# header comment');
    expect(after).toContain('enabled: true');
  });

  it('409 on stale mtime', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/loops',
      payload: { path: loopsPath, mtimeMs: 1, op: { op: 'toggleEnabled', index: 0 } },
    });
    expect(res.statusCode).toBe(409);
  });

  it('400 on invalid cron when adding a loop', async () => {
    const { mtimeMs } = await stat(loopsPath);
    const res = await app.inject({
      method: 'PUT',
      url: '/api/loops',
      payload: {
        path: loopsPath,
        mtimeMs,
        op: {
          op: 'addLoop',
          loop: { name: 'x', kind: 'producer', command: '/r', cron: 'nope', enabled: false },
        },
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('400 on duplicate name', async () => {
    const { mtimeMs } = await stat(loopsPath);
    const res = await app.inject({
      method: 'PUT',
      url: '/api/loops',
      payload: {
        path: loopsPath,
        mtimeMs,
        op: {
          op: 'addLoop',
          loop: {
            name: 'implement',
            kind: 'producer',
            command: '/r',
            cron: '0 2 * * 1',
            enabled: false,
          },
        },
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('403 on path traversal', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/loops',
      payload: { path: join(root, '..', 'evil.yaml'), op: { op: 'toggleEnabled', index: 0 } },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('PUT /api/frontmatter', () => {
  it('edits description and keeps the body', async () => {
    const fmPath = join(root, 'proj', '.claude', 'agents', 'planner.md');
    const { mtimeMs } = await stat(fmPath);
    const res = await app.inject({
      method: 'PUT',
      url: '/api/frontmatter',
      payload: { path: fmPath, mtimeMs, name: 'planner', description: 'Plan better.' },
    });
    expect(res.statusCode).toBe(200);
    const after = await readFile(fmPath, 'utf8');
    expect(after).toContain('description: Plan better.');
    expect(after).toContain('body');
  });

  it('replaces the body when provided (editable bodies)', async () => {
    const fmPath = join(root, 'proj', '.claude', 'agents', 'planner.md');
    const { mtimeMs } = await stat(fmPath);
    const res = await app.inject({
      method: 'PUT',
      url: '/api/frontmatter',
      payload: { path: fmPath, mtimeMs, name: 'planner', description: 'd', body: 'NEW BODY\n' },
    });
    expect(res.statusCode).toBe(200);
    const after = await readFile(fmPath, 'utf8');
    expect(after).toContain('NEW BODY');
    expect(after).not.toContain('body\n'); // old body replaced
  });
});

describe('PUT /api/file', () => {
  it('creates a new file under root, making parent dirs', async () => {
    const p = join(root, 'proj', '.claude', 'skills', 'deploy', 'SKILL.md');
    const res = await app.inject({
      method: 'PUT',
      url: '/api/file',
      payload: { path: p, content: '---\nname: deploy\ndescription: d\n---\nbody\n' },
    });
    expect(res.statusCode).toBe(200);
    expect(await readFile(p, 'utf8')).toContain('name: deploy');
  });

  it('403 on a path outside root', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/file',
      payload: { path: join(root, '..', 'evil.md'), content: 'x' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/assist (stubbed claude)', () => {
  it('returns a diff from the stubbed claude without writing', async () => {
    const stub = async () => 'stage: live\nloops: []\n';
    const a2 = buildApp({ root, runClaude: stub });
    await a2.ready();
    const res = await a2.inject({
      method: 'POST',
      url: '/api/assist',
      payload: { kind: 'loops', projectDir: join(root, 'proj'), instruction: 'clear loops' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.after).toContain('stage: live');
    expect(body.diff).toContain('+stage: live');
    // not written to disk
    expect(await readFile(loopsPath, 'utf8')).toBe(LOOPS);
    await a2.close();
  });

  it('resolves a new agent path and marks it new', async () => {
    const stub = async () => '---\nname: linter\ndescription: lint\n---\nbody\n';
    const a2 = buildApp({ root, runClaude: stub });
    await a2.ready();
    const res = await a2.inject({
      method: 'POST',
      url: '/api/assist',
      payload: {
        kind: 'agent',
        projectDir: join(root, 'proj'),
        newName: 'Linter',
        instruction: 'make a linter',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.isNew).toBe(true);
    expect(body.targetPath).toContain('.claude/agents/linter.md');
    await a2.close();
  });

  it('503 when claude is unavailable', async () => {
    const { ClaudeUnavailableError } = await import('../src/server/core/assist.js');
    const stub = async () => {
      throw new ClaudeUnavailableError('claude CLI not found on PATH');
    };
    const a2 = buildApp({ root, runClaude: stub });
    await a2.ready();
    const res = await a2.inject({
      method: 'POST',
      url: '/api/assist',
      payload: { kind: 'loops', projectDir: join(root, 'proj'), instruction: 'x' },
    });
    expect(res.statusCode).toBe(503);
    await a2.close();
  });
});
