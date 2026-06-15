// "Ask Claude" flow: collect an instruction → POST /api/assist (local claude
// CLI drafts the change) → show the diff → on confirm, write via PUT /api/file.
// Nothing is written without a confirmed diff.
import type { AssistKind } from '../../server/types.js';
import { el } from '../ui/dom.js';
import { diffView, openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { ApiError, assist, writeFile } from '../api.js';

export interface AssistOpts {
  kind: AssistKind;
  projectDir: string;
  /** Editing an existing file (loops.yaml or an agent/skill). */
  targetPath?: string;
  /** Creating a new agent/skill — collect a name. */
  creating?: boolean;
  title: string;
  placeholder?: string;
}

export function openAssist(opts: AssistOpts, onApplied: () => void): void {
  const nameInput = el('input', { placeholder: 'name, e.g. dependency-check' }) as HTMLInputElement;
  const instruction = el('textarea', {
    rows: 4,
    placeholder: opts.placeholder ?? 'Describe what you want Claude to create or change…',
  }) as HTMLTextAreaElement;

  const fields = [
    opts.creating ? el('label', {}, ['Name', nameInput]) : null,
    el('label', {}, ['Instruction', instruction]),
    el('div', { class: 'assist-hint' }, [
      'Uses your local Claude Code subscription. You confirm the diff before anything is written.',
    ]),
  ].filter(Boolean) as HTMLElement[];
  const body = el('div', { class: 'form-grid' }, fields);

  openModal({
    title: opts.title,
    body,
    confirmLabel: 'Ask Claude ✨',
    onConfirm: async () => {
      const text = instruction.value.trim();
      if (!text) {
        toast('Describe what you want first', 'err');
        return false;
      }
      if (opts.creating && !nameInput.value.trim()) {
        toast('Give it a name', 'err');
        return false;
      }
      body.replaceChildren(
        el('div', { class: 'thinking' }, ['Asking Claude… (can take up to a minute)']),
      );
      try {
        const result = await assist({
          kind: opts.kind,
          projectDir: opts.projectDir,
          targetPath: opts.targetPath,
          newName: opts.creating ? nameInput.value.trim() : undefined,
          instruction: text,
        });
        showDiff(result, onApplied);
      } catch (err) {
        const msg =
          err instanceof ApiError && err.status === 503
            ? 'Claude CLI not found — install/login to Claude Code first.'
            : err instanceof ApiError
              ? err.message
              : String(err);
        toast(msg, 'err');
      }
      return false; // we manage the modal transition ourselves
    },
  });
}

function showDiff(
  result: { targetPath: string; diff: string; after: string; isNew: boolean; mtimeMs?: number },
  onApplied: () => void,
): void {
  const header = el('div', { class: 'assist-target' }, [
    result.isNew ? `New file: ${result.targetPath}` : `Edit: ${result.targetPath}`,
  ]);
  openModal({
    title: 'Review Claude’s proposal',
    body: el('div', {}, [header, diffView(result.diff || ' (no changes proposed)')]),
    confirmLabel: 'Write changes',
    onConfirm: async () => {
      try {
        await writeFile({
          path: result.targetPath,
          content: result.after,
          mtimeMs: result.mtimeMs,
        });
        toast('Saved — run /loops apply if you changed loops', 'ok');
        onApplied();
      } catch (err) {
        toast(err instanceof ApiError ? err.message : String(err), 'err');
      }
    },
  });
}
