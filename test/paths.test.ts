import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile, symlink, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertUnderRoot, atomicWrite, UnderRootError } from '../src/server/core/paths.js';

let root: string;
let outside: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'loopdeck-root-'));
  outside = await mkdtemp(join(tmpdir(), 'loopdeck-out-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});

describe('assertUnderRoot', () => {
  it('accepts a path inside the root', async () => {
    const { realpath } = await import('node:fs/promises');
    const p = join(root, 'a', 'loops.yaml');
    await mkdir(join(root, 'a'), { recursive: true });
    await writeFile(p, 'x');
    // Returns the realpath (e.g. macOS /private prefix), which must still be under root.
    await expect(assertUnderRoot(root, p)).resolves.toBe(await realpath(p));
  });

  it('rejects traversal with ..', async () => {
    await expect(assertUnderRoot(root, join(root, '..', 'evil.yaml'))).rejects.toBeInstanceOf(
      UnderRootError,
    );
  });

  it('rejects an absolute path outside the root', async () => {
    await expect(assertUnderRoot(root, join(outside, 'evil.yaml'))).rejects.toBeInstanceOf(
      UnderRootError,
    );
  });

  it('rejects a symlink that points outside the root', async () => {
    const target = join(outside, 'secret.yaml');
    await writeFile(target, 'secret');
    const link = join(root, 'link.yaml');
    await symlink(target, link);
    await expect(assertUnderRoot(root, link)).rejects.toBeInstanceOf(UnderRootError);
  });
});

describe('atomicWrite', () => {
  it('writes content', async () => {
    const p = join(root, 'f.txt');
    await atomicWrite(p, 'hello\n');
    expect(await readFile(p, 'utf8')).toBe('hello\n');
  });

  it('replaces existing content and preserves mode', async () => {
    const p = join(root, 'f.txt');
    await writeFile(p, 'old', { mode: 0o640 });
    const before = (await stat(p)).mode & 0o777;
    await atomicWrite(p, 'new\n');
    expect(await readFile(p, 'utf8')).toBe('new\n');
    expect((await stat(p)).mode & 0o777).toBe(before);
  });

  it('does not leave a temp file behind', async () => {
    const p = join(root, 'f.txt');
    await atomicWrite(p, 'x');
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(root);
    expect(entries.filter((e) => e.includes('.tmp'))).toHaveLength(0);
  });
});
