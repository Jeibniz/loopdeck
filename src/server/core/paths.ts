// Path safety + atomic writes. Grounded in docs/domain/local-server-safety.md:
// every request path must resolve to a location UNDER the super-folder root
// (realpath-checked, so symlinks can't escape), and writes go through a
// temp-file + rename so a crash never truncates a real config.
import { realpath, rename, stat, writeFile, chmod, unlink } from 'node:fs/promises';
import { basename, dirname, resolve, relative, isAbsolute } from 'node:path';

export class UnderRootError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnderRootError';
  }
}

/** Resolve `candidate` and ensure it stays under `root` after following
 *  symlinks. Returns the resolved absolute path, or throws UnderRootError. */
export async function assertUnderRoot(root: string, candidate: string): Promise<string> {
  const rootReal = await realpath(root);
  const abs = isAbsolute(candidate) ? candidate : resolve(rootReal, candidate);

  // Realpath the candidate if it exists, else realpath its parent dir (which
  // must exist — we only ever write into an existing project dir) and rejoin
  // the basename. This still defeats symlink-escape on the parent.
  let resolved: string;
  try {
    resolved = await realpath(abs);
  } catch {
    resolved = resolve(await realpath(dirname(abs)), basename(abs));
  }

  const rel = relative(rootReal, resolved);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
    return resolved;
  }
  throw new UnderRootError(`path escapes root: ${candidate}`);
}

/** Write `text` to `filePath` atomically (tmp in same dir + rename),
 *  preserving the existing file mode when present. */
export async function atomicWrite(filePath: string, text: string): Promise<void> {
  const dir = dirname(filePath);
  const tmp = resolve(dir, `.loopdeck-${process.pid}-${Date.now()}.tmp`);

  let mode: number | undefined;
  try {
    mode = (await stat(filePath)).mode & 0o777;
  } catch {
    mode = undefined;
  }

  try {
    await writeFile(tmp, text, 'utf8');
    if (mode !== undefined) await chmod(tmp, mode);
    await rename(tmp, filePath);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
}

/** Current mtimeMs of a file, for the staleness guard. */
export async function mtimeMs(filePath: string): Promise<number> {
  return (await stat(filePath)).mtimeMs;
}
