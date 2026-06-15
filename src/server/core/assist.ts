// "Ask Claude" assist: prompt the LOCAL `claude` CLI (uses the user's existing
// subscription — no API key) to draft a loops.yaml change or an agent/skill
// file. The CLI is run headless with file-touching tools DISALLOWED, so it can
// only return text; loopdeck then shows a diff the user confirms before any
// write (ADR 0002 ethos: nothing lands without a confirmed diff).
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AssistKind } from '../types.js';

/** Tools claude is forbidden from using in assist mode — i.e. everything that
 *  could touch the filesystem, run code, or reach the network. loopdeck only
 *  wants TEXT back; it applies changes itself after the user confirms a diff. */
export const DISALLOWED_TOOLS = [
  'Bash',
  'Edit',
  'Write',
  'NotebookEdit',
  'WebFetch',
  'WebSearch',
] as const;

/** kebab-case a free-text name into a safe file/dir slug. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}

/** Resolve the file a request targets (existing path, or a new agent/skill). */
export function resolveTarget(opts: {
  kind: AssistKind;
  projectDir: string;
  targetPath?: string;
  newName?: string;
}): { path: string; isNew: boolean } {
  if (opts.targetPath) return { path: opts.targetPath, isNew: false };
  const slug = slugify(opts.newName ?? '');
  if (opts.kind === 'loops') return { path: join(opts.projectDir, 'loops.yaml'), isNew: false };
  if (opts.kind === 'agent') {
    return { path: join(opts.projectDir, '.claude', 'agents', `${slug}.md`), isNew: true };
  }
  return { path: join(opts.projectDir, '.claude', 'skills', slug, 'SKILL.md'), isNew: true };
}

const CONVENTIONS: Record<AssistKind, string> = {
  loops: `This is a loops.yaml for Claude Code scheduled autonomy. Root key \`stage\` (early|steady|maintenance|live) and a \`loops:\` list. Each loop has: name, kind (consumer|producer), command, cron (5-field), enabled (bool). Loops may also carry extra keys you MUST preserve verbatim: \`reviewer\`, \`routine\` (machine-owned by /loops apply — never change it), and a root \`repo\`. Preserve ALL existing comments and formatting; change as little as possible.`,
  agent: `This is a Claude Code agent definition: YAML frontmatter between --- fences with exactly \`name\` and \`description\`, followed by a Markdown body of instructions for the agent.`,
  skill: `This is a Claude Code skill (SKILL.md): YAML frontmatter between --- fences with \`name\` and \`description\`, followed by a Markdown body describing what the skill does and how to use it.`,
};

/** Build the headless prompt. Pure (testable). */
export function buildPrompt(opts: {
  kind: AssistKind;
  instruction: string;
  currentContent: string;
  isNew: boolean;
}): string {
  const conventions = CONVENTIONS[opts.kind];
  const state = opts.isNew
    ? `You are CREATING a new file. There is no current content.`
    : `Current file content is between <CURRENT> tags below. Edit it minimally to satisfy the request.\n<CURRENT>\n${opts.currentContent}\n</CURRENT>`;
  return [
    `You are editing a single project file for the "loopdeck" tool.`,
    conventions,
    state,
    `\nRequest: ${opts.instruction}`,
    `\nRespond with ONLY the complete new file content. No explanation, no commentary, no Markdown code fences — just the raw file content that should be written to disk.`,
  ].join('\n');
}

/** Strip accidental Markdown code fences / leading prose the model may add. */
export function cleanResponse(out: string): string {
  let s = out.trim();
  // If wrapped in a single fenced block, unwrap it.
  const fence = s.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
  if (fence) s = fence[1]!;
  return s.endsWith('\n') ? s : s + '\n';
}

export class ClaudeUnavailableError extends Error {}

/** The exact argv passed to claude. Exported so a test can assert the
 *  file-touching tools stay disallowed (a silent flag rename would re-enable
 *  them). `--` ends option parsing; we send the prompt over stdin. */
export function claudeArgs(): string[] {
  return ['-p', '--output-format', 'text', '--disallowed-tools', ...DISALLOWED_TOOLS];
}

/** Run the claude CLI headless, prompt via stdin, file-touching tools off.
 *
 *  Defense-in-depth (security review): claude runs in a throwaway temp dir,
 *  NOT the user's project — the prompt already embeds all needed content, so
 *  even if `--disallowed-tools` were ever silently ignored, claude could not
 *  reach or modify the real project files. Injectable via `_spawn` for tests. */
export async function runClaude(
  prompt: string,
  timeoutMs = 180_000,
  _spawn = spawn,
): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'loopdeck-claude-'));
  try {
    return await new Promise<string>((resolve, reject) => {
      const child = _spawn('claude', claudeArgs(), { cwd: sandbox, stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`claude timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.on('error', (err: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        if (err.code === 'ENOENT') {
          reject(new ClaudeUnavailableError('claude CLI not found on PATH'));
        } else {
          reject(err);
        }
      });
      child.stdout?.on('data', (d) => (stdout += d));
      child.stderr?.on('data', (d) => (stderr += d));
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(stdout);
        else reject(new Error(`claude exited ${code}: ${stderr.trim() || stdout.trim()}`));
      });
      child.stdin?.end(prompt);
    });
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
}
