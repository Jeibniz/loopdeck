import type { MdRef, Project } from '../../server/types.js';
import { activatable, clear, el } from '../ui/dom.js';
import { diffView, openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { ApiError, getFile, writeFrontmatter } from '../api.js';

export function renderMarkdownBrowser(project: Project): HTMLElement {
  const wrap = el('div', {});
  let active: 'agents' | 'skills' = 'agents';

  const tabs = el('div', { class: 'tabs' });
  const listWrap = el('div', {});

  const renderList = (): void => {
    clear(listWrap);
    const refs = active === 'agents' ? project.agents : project.skills;
    if (refs.length === 0) {
      listWrap.append(el('div', { class: 'empty' }, [`No ${active} in this project.`]));
      return;
    }
    listWrap.append(
      el(
        'div',
        { class: 'md-list' },
        refs.map((r) => mdItem(r)),
      ),
    );
  };

  const mkTab = (key: 'agents' | 'skills', label: string): HTMLElement => {
    const t = activatable(el('div', { class: `tab ${active === key ? 'active' : ''}` }, [label]), () => {
      active = key;
      [...tabs.children].forEach((c) => c.classList.remove('active'));
      t.classList.add('active');
      renderList();
    });
    return t;
  };

  tabs.append(
    mkTab('agents', `Agents (${project.agents.length})`),
    mkTab('skills', `Skills (${project.skills.length})`),
  );
  wrap.append(tabs, listWrap);
  renderList();
  return wrap;
}

function mdItem(ref: MdRef): HTMLElement {
  return activatable(
    el('div', { class: 'md-item' }, [
      el('b', {}, [ref.name]),
      el('div', { class: 'desc' }, [ref.description || '(no description)']),
    ]),
    () => void openMd(ref),
  );
}

async function openMd(ref: MdRef): Promise<void> {
  let file;
  try {
    file = await getFile(ref.path);
  } catch (err) {
    toast(err instanceof ApiError ? err.message : String(err), 'err');
    return;
  }
  const name = el('input', { value: file.frontmatter.name }) as HTMLInputElement;
  const desc = el('textarea', { rows: 3 }, [file.frontmatter.description]) as HTMLTextAreaElement;
  const body = el('div', { class: 'form-grid' }, [
    el('label', {}, ['Name', name]),
    el('label', {}, ['Description', desc]),
    el('label', {}, ['Body (read-only)', el('pre', { class: 'body' }, [file.body])]),
  ]);

  openModal({
    title: ref.name,
    body,
    confirmLabel: 'Save frontmatter',
    onConfirm: async () => {
      if (!name.value.trim()) {
        toast('Name is required', 'err');
        return false;
      }
      try {
        const res = await writeFrontmatter({
          path: ref.path,
          mtimeMs: NaN, // frontmatter edits skip the staleness check (single-editor tool)
          name: name.value.trim(),
          description: desc.value,
        });
        openModal({
          title: 'Saved',
          body: diffView(res.diff || ' (no changes)'),
          confirmLabel: 'OK',
          cancelLabel: 'Close',
          onConfirm: () => {},
        });
        toast('Frontmatter saved', 'ok');
      } catch (err) {
        toast(err instanceof ApiError ? err.message : String(err), 'err');
      }
      return false;
    },
  });
}
