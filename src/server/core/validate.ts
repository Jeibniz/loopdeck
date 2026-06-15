// Validation. Grounded in docs/domain/cron-libraries.md + loops-schema.md:
//   - cron-parser (v5: CronExpressionParser.parse, strict OFF) is the
//     authoritative validator and gives the next run.
//   - cronstrue is DISPLAY only (throwExceptionOnParseError:false → never throws).
//   - kind is enforced only when present; stage is a fixed enum.
import { CronExpressionParser } from 'cron-parser';
import cronstrue from 'cronstrue';
import type { CronCheck, LoopCorePatch, Stage } from '../types.js';

export const STAGES: readonly Stage[] = ['early', 'steady', 'maintenance'];
export const KINDS = ['consumer', 'producer'] as const;

/** Validate a cron expression and, when valid, attach a human description
 *  and the next run time. Accepts standard 5-field expressions. */
export function validateCron(expr: string): CronCheck {
  const trimmed = expr?.trim() ?? '';
  if (!trimmed) return { valid: false, message: 'cron is empty' };
  try {
    const interval = CronExpressionParser.parse(trimmed);
    const next = interval.next().toDate().toISOString();
    const human = cronstrue.toString(trimmed, { throwExceptionOnParseError: false });
    return { valid: true, human, next };
  } catch (err) {
    return { valid: false, message: (err as Error).message };
  }
}

export function isValidStage(stage: string): stage is Stage {
  return (STAGES as readonly string[]).includes(stage);
}

export interface LoopValidation {
  ok: boolean;
  errors: string[];
}

/** Validate the editable core of a loop. `otherNames` are the names of the
 *  OTHER loops in the same file (caller excludes the one being edited) so a
 *  rename onto a different loop is rejected (case-insensitive). */
export function validateLoopCore(loop: LoopCorePatch, otherNames: string[]): LoopValidation {
  const errors: string[] = [];
  const name = (loop.name ?? '').trim();
  if (!name) errors.push('name is required');
  const lower = name.toLowerCase();
  if (name && otherNames.some((n) => n.trim().toLowerCase() === lower)) {
    errors.push(`duplicate loop name: ${name}`);
  }
  if (!(loop.command ?? '').trim()) errors.push('command is required');
  if (loop.kind !== undefined && !(KINDS as readonly string[]).includes(loop.kind)) {
    errors.push(`kind must be one of ${KINDS.join(', ')}`);
  }
  const cron = validateCron(loop.cron ?? '');
  if (!cron.valid) errors.push(`invalid cron: ${cron.message}`);
  return { ok: errors.length === 0, errors };
}
