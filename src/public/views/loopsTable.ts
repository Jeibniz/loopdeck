import type { Loop, LoopCorePatch, LoopOp, Project } from '../../server/types.js';
import { el } from '../ui/dom.js';
import { diffView, openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { ApiError, previewLoops, writeLoops } from '../api.js';

const STAGES = ['early', 'steady', 'maintenance'];

export function renderLoopsTable(project: Project, reload: () => void): HTMLElement {
  const file = project.loopsFile;
  const wrap = el('div', {});

  if (!file) {
    wrap.append(el('div', { class: 'empty' }, ['This project has no loops.yaml.']));
    return wrap;
  }
  if (file.unparseable) {
    wrap.append(
      el('div', { class: 'unparseable' }, [
        `loops.yaml is unparseable: ${file.unparseable.message}`,
      ]),
    );
    return wrap;
  }

  const path = project.loopsPath!;

  // diff-confirm → write, then reload
  const confirmAndWrite = async (op: LoopOp, title: string): Promise<void> => {
    try {
      const preview = await previewLoops(path, op);
      openModal({
        title,
        body: diffView(preview.diff || ' (no changes)'),
        confirmLabel: 'Write changes',
        onConfirm: async () => {
          try {
            await writeLoops({ path, mtimeMs: preview.mtimeMs, op });
            toast('Saved — run /loops apply to reconcile', 'ok');
            reload();
          } catch (err) {
            toast(err instanceof ApiError ? err.message : String(err), 'err');
          }
        },
      });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : String(err), 'err');
    }
  };

  // ── stage row ──
  const stageSel = el(
    'select',
    {},
    STAGES.map((s) => el('option', { value: s, selected: s === file.stage }, [s])),
  );
  stageSel.addEventListener('change', () => {
    void confirmAndWrite(
      { op: 'updateStage', stage: (stageSel as HTMLSelectElement).value },
      'Change stage',
    );
  });

  const head = el('div', { class: 'detail-head' }, [
    el('div', { class: 'stage-row' }, ['stage:', stageSel]),
    el(
      'button',
      {
        class: 'btn primary',
        onclick: () =>
          openLoopForm(null, (loop) => confirmAndWrite({ op: 'addLoop', loop }, 'Add loop')),
      },
      ['+ Add loop'],
    ),
  ]);
  wrap.append(head);

  // ── table ──
  const rows = file.loops.map((loop, i) => loopRow(loop, i, confirmAndWrite));
  const table = el('table', {}, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', {}, ['On']),
        el('th', {}, ['Name']),
        el('th', {}, ['Kind']),
        el('th', {}, ['Command']),
        el('th', {}, ['Cron']),
        el('th', {}, ['']),
      ]),
    ]),
    el('tbody', {}, rows),
  ]);
  wrap.append(table);

  if (Object.keys(file.rootExtra).length > 0) {
    wrap.append(
      el('div', { class: 'extra' }, [
        'extra (read-only): ' +
          Object.entries(file.rootExtra)
            .map(([k, v]) => `${k}=${String(v)}`)
            .join(', '),
      ]),
    );
  }
  return wrap;
}

function loopRow(
  loop: Loop,
  index: number,
  confirmAndWrite: (op: LoopOp, title: string) => Promise<void>,
): HTMLElement {
  const toggle = el('input', { type: 'checkbox', checked: loop.enabled });
  toggle.addEventListener('change', (e) => {
    e.preventDefault();
    (toggle as HTMLInputElement).checked = loop.enabled; // revert until confirmed
    void confirmAndWrite(
      { op: 'toggleEnabled', index },
      `${loop.enabled ? 'Disable' : 'Enable'} ${loop.name}`,
    );
  });

  const cronCell = el('td', { class: 'cron' }, [loop.cron]);
  cronCell.append(
    el('div', { class: `cron-human ${loop.cronValid ? '' : 'cron-invalid'}` }, [
      loop.cronValid ? (loop.cronHuman ?? '') : 'invalid cron',
    ]),
  );

  const nameCell = el('td', { class: 'name-cell' }, [el('b', {}, [loop.name])]);
  const extraKeys = Object.keys(loop.extra);
  if (extraKeys.length > 0) {
    nameCell.append(
      el('div', { class: 'extra' }, [
        extraKeys.map((k) => `${k}=${String(loop.extra[k])}`).join(' · '),
      ]),
    );
  }

  const editBtn = el('button', { class: 'btn icon' }, ['Edit']);
  editBtn.addEventListener('click', () =>
    openLoopForm(loop, (patch) =>
      confirmAndWrite({ op: 'updateLoop', index, loop: patch }, `Edit ${loop.name}`),
    ),
  );
  const delBtn = el('button', { class: 'btn icon danger' }, ['Delete']);
  delBtn.addEventListener('click', () =>
    confirmAndWrite({ op: 'deleteLoop', index }, `Delete ${loop.name}`),
  );

  return el('tr', {}, [
    el('td', {}, [el('label', { class: 'switch' }, [toggle, el('span', { class: 'slider' })])]),
    nameCell,
    el('td', {}, [
      loop.kind
        ? el('span', { class: `badge kind-${loop.kind}` }, [loop.kind])
        : el('span', { class: 'badge' }, ['—']),
    ]),
    el('td', { class: 'cmd' }, [loop.command]),
    cronCell,
    el('td', {}, [el('div', { class: 'row-actions' }, [editBtn, delBtn])]),
  ]);
}

/** Add/Edit form modal. `existing=null` → add. Calls `submit` with the core patch. */
function openLoopForm(existing: Loop | null, submit: (loop: LoopCorePatch) => void): void {
  const name = el('input', { value: existing?.name ?? '' }) as HTMLInputElement;
  const kindSel = el('select', {}, [
    el('option', { value: '', selected: !existing?.kind }, ['(none)']),
    el('option', { value: 'consumer', selected: existing?.kind === 'consumer' }, ['consumer']),
    el('option', { value: 'producer', selected: existing?.kind === 'producer' }, ['producer']),
  ]) as HTMLSelectElement;
  const cron = el('input', { value: existing?.cron ?? '0 2 * * 1' }) as HTMLInputElement;
  const command = el('textarea', { rows: 3 }, [existing?.command ?? '']) as HTMLTextAreaElement;
  const enabled = el('input', {
    type: 'checkbox',
    checked: existing?.enabled ?? false,
  }) as HTMLInputElement;

  const body = el('div', { class: 'form-grid' }, [
    el('label', {}, ['Name', name]),
    el('div', { class: 'row2' }, [
      el('label', {}, ['Kind', kindSel]),
      el('label', {}, ['Cron', cron]),
    ]),
    el('label', {}, ['Command', command]),
    el('label', {}, [el('span', {}, ['Enabled ', enabled])]),
  ]);

  openModal({
    title: existing ? `Edit ${existing.name}` : 'Add loop',
    body,
    confirmLabel: 'Preview diff',
    onConfirm: () => {
      const patch: LoopCorePatch = {
        name: name.value.trim(),
        kind: kindSel.value ? (kindSel.value as 'consumer' | 'producer') : undefined,
        command: command.value,
        cron: cron.value.trim(),
        enabled: enabled.checked,
      };
      if (!patch.name || !patch.command.trim() || !patch.cron) {
        toast('Name, command and cron are required', 'err');
        return false; // keep open
      }
      submit(patch); // opens the diff-confirm modal (replaces this one)
      return false;
    },
  });
}
