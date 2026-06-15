// Typed fetch wrappers around the loopdeck API.
import type {
  FrontmatterWriteRequest,
  LoopOp,
  LoopsWriteRequest,
  ScanResult,
} from '../server/types.js';

async function jsonOrThrow(res: Response): Promise<unknown> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return data;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function scan(): Promise<ScanResult> {
  return (await jsonOrThrow(await fetch('/api/scan'))) as ScanResult;
}

export interface FileResult {
  path: string;
  raw: string;
  frontmatter: { name: string; description: string };
  body: string;
}

export async function getFile(path: string): Promise<FileResult> {
  return (await jsonOrThrow(
    await fetch(`/api/file?path=${encodeURIComponent(path)}`),
  )) as FileResult;
}

export interface PreviewResult {
  diff: string;
  newText: string;
  mtimeMs: number;
}

export async function previewLoops(path: string, op: LoopOp): Promise<PreviewResult> {
  return (await jsonOrThrow(
    await fetch('/api/loops/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path, op }),
    }),
  )) as PreviewResult;
}

export async function writeLoops(req: LoopsWriteRequest): Promise<{ ok: boolean; diff: string }> {
  return (await jsonOrThrow(
    await fetch('/api/loops', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    }),
  )) as { ok: boolean; diff: string };
}

export async function writeFrontmatter(
  req: FrontmatterWriteRequest,
): Promise<{ ok: boolean; diff: string }> {
  return (await jsonOrThrow(
    await fetch('/api/frontmatter', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    }),
  )) as { ok: boolean; diff: string };
}
