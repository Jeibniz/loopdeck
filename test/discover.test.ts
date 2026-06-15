import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { walkSuperFolder } from '../src/server/core/discover.js';

let root: string;

const LOOPS = `stage: early
loops:
  - name: implement
    kind: consumer
    command: "/autopilot --once"
    cron: "0 2 * * *"
    enabled: false
`;

const AGENT = `---
name: planner
description: Plan things.
---
body
`;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'loopdeck-scan-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function makeProject(name: string, sharedAgentsTarget?: string): Promise<string> {
  const dir = join(root, name);
  await mkdir(join(dir, '.claude'), { recursive: true });
  await writeFile(join(dir, 'loops.yaml'), LOOPS);
  if (sharedAgentsTarget) {
    await symlink(sharedAgentsTarget, join(dir, '.claude', 'agents'));
  } else {
    await mkdir(join(dir, '.claude', 'agents'), { recursive: true });
    await writeFile(join(dir, '.claude', 'agents', 'planner.md'), AGENT);
  }
  return dir;
}

describe('walkSuperFolder', () => {
  it('finds projects and parses loops.yaml with cron enrichment', async () => {
    await makeProject('projA');
    const projects = await walkSuperFolder(root);
    expect(projects).toHaveLength(1);
    const p = projects[0]!;
    expect(p.loopsFile?.loops[0]?.name).toBe('implement');
    expect(p.loopsFile?.loops[0]?.cronValid).toBe(true);
    expect(p.agents.map((a) => a.name)).toContain('planner');
  });

  it('ignores node_modules and .git', async () => {
    await makeProject('projA');
    await mkdir(join(root, 'node_modules', 'pkg'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'pkg', 'loops.yaml'), LOOPS);
    await mkdir(join(root, '.git'), { recursive: true });
    await writeFile(join(root, '.git', 'loops.yaml'), LOOPS);
    const projects = await walkSuperFolder(root);
    expect(projects).toHaveLength(1);
    expect(projects[0]!.relDir).toBe('projA');
  });

  it('lists each project agents once even when .claude/agents is symlink-shared', async () => {
    // shared agents dir lives outside, both projects symlink to it
    const shared = join(root, '_shared-agents');
    await mkdir(shared, { recursive: true });
    await writeFile(join(shared, 'planner.md'), AGENT);
    await makeProject('projA', shared);
    await makeProject('projB', shared);

    const projects = await walkSuperFolder(root);
    const named = projects.filter((p) => p.relDir === 'projA' || p.relDir === 'projB');
    expect(named).toHaveLength(2);
    for (const p of named) {
      // listed exactly once per project (deduped by realpath within project)
      expect(p.agents.filter((a) => a.name === 'planner')).toHaveLength(1);
    }
  });

  it('terminates on a directory symlink cycle', async () => {
    await makeProject('projA');
    // a symlink pointing back at root — must not be followed / must not hang
    await symlink(root, join(root, 'projA', 'loop-link'));
    const projects = await walkSuperFolder(root);
    expect(projects.length).toBeGreaterThanOrEqual(1);
  });

  it('respects the depth cap', async () => {
    let deep = root;
    for (const seg of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      deep = join(deep, seg);
      await mkdir(deep, { recursive: true });
    }
    await writeFile(join(deep, 'loops.yaml'), LOOPS); // 7 levels down
    const projects = await walkSuperFolder(root, { maxDepth: 3 });
    expect(projects).toHaveLength(0);
  });

  it('surfaces a malformed loops.yaml as unparseable, not a crash', async () => {
    const dir = join(root, 'broken');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'loops.yaml'), 'loops: [unclosed');
    const projects = await walkSuperFolder(root);
    expect(projects[0]!.loopsFile?.unparseable).toBeTruthy();
  });
});
