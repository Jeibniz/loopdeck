// Shared DTOs for loopdeck. Imported by both the server and the (separately
// bundled) frontend. Grounded in docs/domain/loops-schema.md + ADR 0001:
// the loops schema is EXTENSIBLE — core fields are first-class, everything
// else is passed through and preserved verbatim on write.

export type Stage = 'early' | 'steady' | 'maintenance';
export type LoopKind = 'consumer' | 'producer';

/** A single entry in `loops[]`. Core fields are typed; `extra` holds every
 *  other key (e.g. `reviewer`, `routine`, …) so writes never drop them. */
export interface Loop {
  name: string;
  /** Optional: vakio's producer-only files omit `kind`. */
  kind?: LoopKind;
  command: string;
  cron: string;
  enabled: boolean;
  /** Cron decoded for display (cronstrue); not persisted. */
  cronHuman?: string;
  cronValid: boolean;
  /** Unknown/pass-through keys, read-only in v1 (e.g. reviewer, routine). */
  extra: Record<string, unknown>;
}

/** Parsed view of one loops.yaml. `unparseable` flags a YAML error so the
 *  scan surfaces it rather than crashing (docs/domain/yaml-document-api.md). */
export interface LoopsFile {
  stage?: Stage | string;
  /** Pass-through root keys other than `stage`/`loops` (e.g. vakio's `repo`). */
  rootExtra: Record<string, unknown>;
  loops: Loop[];
  unparseable?: { message: string };
}

export interface MdRef {
  path: string;
  name: string;
  description: string;
}

export interface Project {
  name: string;
  /** Absolute dir of the project root. */
  dir: string;
  /** Path relative to the scanned super-folder root, for display. */
  relDir: string;
  loopsPath?: string;
  loopsFile?: LoopsFile;
  agents: MdRef[];
  skills: MdRef[];
}

export interface ScanResult {
  root: string;
  projects: Project[];
}

// ── Mutation ops on a loops.yaml (typed so the server edits surgically) ──
export type LoopOp =
  | { op: 'updateStage'; stage: string }
  | { op: 'toggleEnabled'; index: number }
  | { op: 'updateLoop'; index: number; loop: LoopCorePatch }
  | { op: 'deleteLoop'; index: number }
  | { op: 'addLoop'; loop: LoopCorePatch };

/** The editable core of a loop (what the UI sends). */
export interface LoopCorePatch {
  name: string;
  kind?: LoopKind;
  command: string;
  cron: string;
  enabled: boolean;
}

export interface LoopsWriteRequest {
  path: string;
  /** mtimeMs captured on read; used for the 409 staleness guard. */
  mtimeMs: number;
  op: LoopOp;
}

export interface FrontmatterWriteRequest {
  path: string;
  mtimeMs: number;
  name: string;
  description: string;
}

export interface PreviewResult {
  diff: string;
  newText: string;
}

export interface CronCheck {
  valid: boolean;
  message?: string;
  human?: string;
  next?: string;
}
