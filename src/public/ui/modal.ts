import { clear, el } from './dom.js';

export interface ModalSpec {
  title: string;
  body: HTMLElement;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Return false (or throw) to keep the modal open. */
  onConfirm: () => boolean | void | Promise<boolean | void>;
  /** Called when dismissed without confirming (Cancel / Escape / backdrop). */
  onCancel?: () => void;
}

export function openModal(spec: ModalSpec): void {
  const root = document.getElementById('modal-root')!;
  clear(root);

  const lastFocused = document.activeElement as HTMLElement | null;
  const confirmBtn = el('button', { class: 'btn primary' }, [spec.confirmLabel ?? 'Confirm']);
  const cancelBtn = el('button', { class: 'btn' }, [spec.cancelLabel ?? 'Cancel']);

  let confirmed = false;
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };
  const close = (): void => {
    document.removeEventListener('keydown', onKey);
    clear(root);
    if (!confirmed) spec.onCancel?.();
    lastFocused?.focus?.();
  };
  cancelBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  confirmBtn.addEventListener('click', async () => {
    confirmBtn.setAttribute('disabled', '');
    try {
      const keepOpen = (await spec.onConfirm()) === false;
      if (!keepOpen) {
        confirmed = true;
        close();
      }
    } finally {
      confirmBtn.removeAttribute('disabled');
    }
  });

  const dialog = el(
    'div',
    { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': spec.title },
    [
      el('h3', {}, [spec.title]),
      el('div', { class: 'modal-body' }, [spec.body]),
      el('div', { class: 'modal-foot' }, [cancelBtn, confirmBtn]),
    ],
  );
  const backdrop = el('div', { class: 'modal-backdrop' }, [dialog]);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  root.append(backdrop);
  // Move focus into the dialog (first input, else the confirm button).
  const firstInput = dialog.querySelector('input, textarea, select') as HTMLElement | null;
  (firstInput ?? confirmBtn).focus();
}

/** Render a unified diff string into a styled <pre>. */
export function diffView(diff: string): HTMLElement {
  const pre = el('pre', { class: 'diff' });
  for (const line of diff.split('\n')) {
    const cls = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : 'ctx';
    pre.append(el('div', { class: cls }, [line || ' ']));
  }
  return pre;
}
