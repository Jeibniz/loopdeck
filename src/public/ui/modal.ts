import { clear, el } from './dom.js';

export interface ModalSpec {
  title: string;
  body: HTMLElement;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Return false (or throw) to keep the modal open. */
  onConfirm: () => boolean | void | Promise<boolean | void>;
}

export function openModal(spec: ModalSpec): void {
  const root = document.getElementById('modal-root')!;
  clear(root);

  const confirmBtn = el('button', { class: 'btn primary' }, [spec.confirmLabel ?? 'Confirm']);
  const cancelBtn = el('button', { class: 'btn' }, [spec.cancelLabel ?? 'Cancel']);

  const close = (): void => clear(root);
  cancelBtn.addEventListener('click', close);
  confirmBtn.addEventListener('click', async () => {
    confirmBtn.setAttribute('disabled', '');
    try {
      const keepOpen = (await spec.onConfirm()) === false;
      if (!keepOpen) close();
    } finally {
      confirmBtn.removeAttribute('disabled');
    }
  });

  const backdrop = el('div', { class: 'modal-backdrop' }, [
    el('div', { class: 'modal' }, [
      el('h3', {}, [spec.title]),
      el('div', { class: 'modal-body' }, [spec.body]),
      el('div', { class: 'modal-foot' }, [cancelBtn, confirmBtn]),
    ]),
  ]);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  root.append(backdrop);
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
