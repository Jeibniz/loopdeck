// Scan a super-folder for projects: any dir holding a loops.yaml or a .claude/
// dir. Grounded in docs/domain/local-server-safety.md + loops-schema.md:
//   - ignore node_modules/.git/build dirs and dotdirs except .claude
//   - depth-capped
//   - the general walk recurses only into REAL subdirs and tracks visited
//     realpaths, so the scaffold's symlinked .claude can't cause cycles/explosion
//   - agents/skills are enumerated by reading .claude/{agents,skills} directly
//     (those subdirs may be symlinks), deduped within a project by realpath.
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import pLimit from 'p-limit';
import { docToLoopsFile, parseLoopsDoc } from './loopsDoc.js';
import { parseMd } from './frontmatter.js';
import { validateCron } from './validate.js';
import type { MdRef, Project } from '../types.js';

const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  '.cache',
  'coverage',
  '.turbo',
  '.git',
]);

const limit = pLimit(16);

export interface ScanOptions {
  maxDepth?: number;
}

export async function walkSuperFolder(root: string, opts: ScanOptions = {}): Promise<Project[]> {
  const maxDepth = opts.maxDepth ?? 6;
  const rootReal = await realpath(root);
  const visited = new Set<string>();
  const byRealDir = new Map<string, Project>();

  async function recurse(dir: string, depth: number): Promise<void> {
    let real: string;
    try {
      real = await realpath(dir);
    } catch {
      return;
    }
    if (visited.has(real)) return;
    visited.add(real);

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const hasLoops = entries.some((e) => e.isFile() && e.name === 'loops.yaml');
    const hasClaude = entries.some((e) => e.name === '.claude');
    if (hasLoops || hasClaude) {
      if (!byRealDir.has(real)) {
        byRealDir.set(real, await buildProject(dir, rootReal, hasLoops));
      }
    }

    if (depth >= maxDepth) return;
    for (const e of entries) {
      if (!e.isDirectory()) continue; // do not follow symlinked dirs in the general walk
      const name = e.name;
      if (IGNORE_DIRS.has(name)) continue;
      if (name.startsWith('.') && name !== '.claude') continue;
      if (name === '.claude') continue; // handled by buildProject, not recursed
      await recurse(join(dir, name), depth + 1);
    }
  }

  await recurse(root, 0);
  return [...byRealDir.values()].sort((a, b) => a.relDir.localeCompare(b.relDir));
}

async function buildProject(dir: string, rootReal: string, hasLoops: boolean): Promise<Project> {
  const relDir = relative(rootReal, await realpath(dir)) || '.';
  const project: Project = {
    name: basename(dir) || relDir,
    dir,
    relDir,
    agents: [],
    skills: [],
  };

  if (hasLoops) {
    const loopsPath = join(dir, 'loops.yaml');
    project.loopsPath = loopsPath;
    try {
      const text = await readFile(loopsPath, 'utf8');
      project.loopsFile = docToLoopsFile(parseLoopsDoc(text), validateCron);
    } catch (err) {
      project.loopsFile = {
        rootExtra: {},
        loops: [],
        unparseable: { message: (err as Error).message },
      };
    }
  }

  project.agents = await readMdRefs(join(dir, '.claude', 'agents'), 'agent');
  project.skills = await readMdRefs(join(dir, '.claude', 'skills'), 'skill');
  return project;
}

/** Read frontmatter refs from .claude/agents/*.md or .claude/skills/<n>/SKILL.md.
 *  Dedupes by realpath within the project. */
async function readMdRefs(dir: string, kind: 'agent' | 'skill'): Promise<MdRef[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  if (kind === 'agent') {
    for (const e of entries) {
      if (e.name.endsWith('.md')) files.push(join(dir, e.name));
    }
  } else {
    // skills/<name>/SKILL.md
    for (const e of entries) {
      const skillFile = join(dir, e.name, 'SKILL.md');
      try {
        if ((await stat(skillFile)).isFile()) files.push(skillFile);
      } catch {
        /* not a skill dir */
      }
    }
  }

  const seen = new Set<string>();
  const refs = await Promise.all(
    files.map((f) =>
      limit(async (): Promise<MdRef | null> => {
        let real: string;
        try {
          real = await realpath(f);
        } catch {
          return null;
        }
        if (seen.has(real)) return null;
        seen.add(real);
        try {
          const md = parseMd(await readFile(f, 'utf8'));
          return { path: f, name: md.name || basename(f), description: md.description };
        } catch {
          return null;
        }
      }),
    ),
  );
  return refs.filter((r): r is MdRef => r !== null).sort((a, b) => a.name.localeCompare(b.name));
}
