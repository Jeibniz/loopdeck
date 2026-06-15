import { el } from './dom.js';

export function toast(message: string, kind: 'ok' | 'err' = 'ok'): void {
  const root = document.getElementById('toast-root')!;
  const node = el('div', { class: `toast ${kind}` }, [message]);
  root.append(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transition = 'opacity 0.3s';
    setTimeout(() => node.remove(), 300);
  }, 2600);
}
