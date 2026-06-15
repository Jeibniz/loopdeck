// Fastify app: the local API + static frontend. Bound to loopback by the CLI.
// Grounded in docs/domain/local-server-safety.md + ADR 0003: every request
// path is realpath-guarded under the super-folder root; writes are atomic and
// gated by a 409 staleness check; validation blocks bad cron / dup names.
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { walkSuperFolder } from './core/discover.js';
import { docToLoopsFile, parseLoopsDoc } from './core/loopsDoc.js';
import { editLoopsText } from './core/loopsCst.js';
import { parseMd, setFrontmatter } from './core/frontmatter.js';
import { isValidStage, validateCron, validateLoopCore } from './core/validate.js';
import { unifiedDiff } from './core/diff.js';
import { assertUnderRoot, atomicWrite, UnderRootError } from './core/paths.js';
import {
  buildPrompt,
  cleanResponse,
  ClaudeUnavailableError,
  resolveTarget,
  runClaude as runClaudeCli,
} from './core/assist.js';
import type {
  LoopOp,
  LoopsWriteRequest,
  FrontmatterWriteRequest,
  AssistRequest,
  FileWriteRequest,
} from './types.js';

export interface AppOptions {
  root: string;
  staticDir?: string;
  /** Injectable claude runner (tests stub this); defaults to the real CLI. */
  runClaude?: typeof runClaudeCli;
}

class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function buildApp(opts: AppOptions): FastifyInstance {
  const root = opts.root;
  const app = Fastify({ logger: false });

  // Reject requests whose Host header isn't loopback — defeats DNS-rebinding,
  // where a malicious page rebinds a hostname to 127.0.0.1 to reach this API
  // (docs/domain/local-server-safety.md). Loopback-only tool, so this is safe.
  app.addHook('onRequest', async (req, reply) => {
    const host = (req.headers.host ?? '').split(':')[0];
    if (host && host !== '127.0.0.1' && host !== 'localhost' && host !== '[::1]') {
      return reply.code(403).send({ error: 'forbidden host' });
    }
  });

  app.setErrorHandler((err: Error, _req, reply) => {
    if (err instanceof UnderRootError) return reply.code(403).send({ error: err.message });
    if (err instanceof HttpError) return reply.code(err.statusCode).send({ error: err.message });
    return reply.code(400).send({ error: err.message });
  });

  // ── GET /api/scan ──
  app.get('/api/scan', async () => {
    const projects = await walkSuperFolder(root);
    return { root, projects };
  });

  // ── GET /api/file?path= ── (agent/skill markdown)
  app.get<{ Querystring: { path?: string } }>('/api/file', async (req) => {
    const path = req.query.path;
    if (!path) throw new HttpError(400, 'path is required');
    const resolved = await assertUnderRoot(root, path);
    const raw = await readFile(resolved, 'utf8');
    const md = parseMd(raw);
    return {
      path,
      raw,
      frontmatter: { name: md.name, description: md.description },
      body: md.body,
    };
  });

  // ── POST /api/loops/preview ── compute diff, no write
  app.post<{ Body: { path?: string; op?: LoopOp } }>('/api/loops/preview', async (req) => {
    const { path, op } = req.body ?? {};
    if (!path || !op) throw new HttpError(400, 'path and op are required');
    const resolved = await assertUnderRoot(root, path);
    const before = await readFile(resolved, 'utf8');
    const { after } = computeEdit(before, op);
    return {
      diff: unifiedDiff(before, after),
      newText: after,
      mtimeMs: (await stat(resolved)).mtimeMs,
    };
  });

  // ── PUT /api/loops ── validated, staleness-guarded, atomic write
  app.put<{ Body: LoopsWriteRequest }>('/api/loops', async (req) => {
    const { path, op, mtimeMs } = req.body ?? ({} as LoopsWriteRequest);
    if (!path || !op) throw new HttpError(400, 'path and op are required');
    const resolved = await assertUnderRoot(root, path);
    await guardStale(resolved, mtimeMs);
    const before = await readFile(resolved, 'utf8');
    const { after } = computeEdit(before, op, /* validate */ true);
    await atomicWrite(resolved, after);
    return { ok: true, diff: unifiedDiff(before, after), mtimeMs: (await stat(resolved)).mtimeMs };
  });

  // ── PUT /api/frontmatter ── edit name/description (and body if provided)
  app.put<{ Body: FrontmatterWriteRequest }>('/api/frontmatter', async (req) => {
    const { path, name, description, body, mtimeMs } = req.body ?? ({} as FrontmatterWriteRequest);
    if (!path) throw new HttpError(400, 'path is required');
    if (!name?.trim()) throw new HttpError(400, 'name is required');
    const resolved = await assertUnderRoot(root, path);
    await guardStale(resolved, mtimeMs);
    const before = await readFile(resolved, 'utf8');
    const after = setFrontmatter(before, name, description ?? '', body);
    await atomicWrite(resolved, after);
    return { ok: true, diff: unifiedDiff(before, after), mtimeMs: (await stat(resolved)).mtimeMs };
  });

  // ── PUT /api/file ── write raw content (creates parent dirs); used to apply
  //    an assist result or a new agent/skill. Under-root + atomic + staleness.
  app.put<{ Body: FileWriteRequest }>('/api/file', async (req) => {
    const { path, content, mtimeMs } = req.body ?? ({} as FileWriteRequest);
    if (!path || typeof content !== 'string') {
      throw new HttpError(400, 'path and content are required');
    }
    const resolved = await assertUnderRoot(root, path);
    if (mtimeMs !== undefined && existsSync(resolved)) await guardStale(resolved, mtimeMs);
    await mkdir(dirname(resolved), { recursive: true });
    await atomicWrite(resolved, content);
    return { ok: true, mtimeMs: (await stat(resolved)).mtimeMs };
  });

  // ── POST /api/assist ── ask the local claude CLI to draft a change; returns
  //    a diff to confirm. NEVER writes — the client applies via PUT /api/file.
  app.post<{ Body: AssistRequest }>('/api/assist', async (req, reply) => {
    const { kind, projectDir, targetPath, newName, instruction } =
      req.body ?? ({} as AssistRequest);
    if (!kind || !projectDir || !instruction?.trim()) {
      throw new HttpError(400, 'kind, projectDir and instruction are required');
    }
    if (!targetPath && (kind === 'agent' || kind === 'skill') && !newName?.trim()) {
      throw new HttpError(400, 'newName is required when creating an agent or skill');
    }
    const projDir = await assertUnderRoot(root, projectDir);
    const target = resolveTarget({ kind, projectDir: projDir, targetPath, newName });
    const resolved = await assertUnderRoot(root, target.path);

    const before = target.isNew || !existsSync(resolved) ? '' : await readFile(resolved, 'utf8');
    const prompt = buildPrompt({
      kind,
      instruction,
      currentContent: before,
      isNew: target.isNew || before === '',
    });

    let after: string;
    try {
      after = cleanResponse(await (opts.runClaude ?? runClaudeCli)(prompt, projDir));
    } catch (err) {
      if (err instanceof ClaudeUnavailableError) {
        return reply.code(503).send({ error: err.message });
      }
      throw new HttpError(502, `claude failed: ${(err as Error).message}`);
    }

    const mtimeMs = existsSync(resolved) ? (await stat(resolved)).mtimeMs : undefined;
    return {
      targetPath: resolved,
      before,
      after,
      diff: unifiedDiff(before, after),
      isNew: before === '',
      mtimeMs,
    };
  });

  // ── static frontend ──
  if (opts.staticDir && existsSync(opts.staticDir)) {
    app.register(fastifyStatic, { root: opts.staticDir });
  }

  return app;
}

/** Parse-check → validate (optionally) → CST edit. Pure; no I/O.
 *  Uses the CST editor (loopsCst) so untouched bytes — crucially folded
 *  `command: >` blocks — are preserved verbatim (ADR 0002). */
function computeEdit(before: string, op: LoopOp, validate = false): { after: string } {
  const doc = parseLoopsDoc(before);
  if (doc.errors.length > 0)
    throw new HttpError(400, `unparseable loops.yaml: ${doc.errors[0]!.message}`);

  if (validate) validateOp(before, op);
  return { after: editLoopsText(before, op) }; // throws on bad index → 400
}

function validateOp(before: string, op: LoopOp): void {
  const file = docToLoopsFile(parseLoopsDoc(before));
  const names = file.loops.map((l) => l.name);
  if (op.op === 'updateStage') {
    if (!isValidStage(op.stage)) throw new HttpError(400, `invalid stage: ${op.stage}`);
  } else if (op.op === 'addLoop') {
    const r = validateLoopCore(op.loop, names);
    if (!r.ok) throw new HttpError(400, r.errors.join('; '));
  } else if (op.op === 'updateLoop') {
    const others = names.filter((_, i) => i !== op.index);
    const r = validateLoopCore(op.loop, others);
    if (!r.ok) throw new HttpError(400, r.errors.join('; '));
  } else if (op.op === 'toggleEnabled') {
    // toggling can't break cron; still ensure the cron currently parses? no-op.
    void validateCron;
  }
}

async function guardStale(resolved: string, expectedMtimeMs: number | undefined): Promise<void> {
  if (typeof expectedMtimeMs !== 'number') return; // no guard requested
  const current = (await stat(resolved)).mtimeMs;
  // allow tiny fs rounding differences
  if (Math.abs(current - expectedMtimeMs) > 1) {
    throw new HttpError(409, 'file changed on disk since it was read; reload and retry');
  }
}
