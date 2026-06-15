import type { MdRef, Project } from '../../server/types.js';
import { activatable, clear, el } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { ApiError, getFile, writeFrontmatter } from '../api.js';
import { openAssist } from './assist.js';

export function renderMarkdownBrowser(project: Project, reload: () => void): HTMLElement {
  const wrap = el('div', {});
  let active: 'agents' | 'skills' = 'agents';

  const tabs = el('div', { class: 'tabs' });
  const listWrap = el('div', {});

  const renderList = (): void => {
    clear(listWrap);
    const refs = active === 'agents' ? project.agents : project.skills;
    const singular = active === 'agents' ? 'agent' : 'skill';

    const newBtn = el(
      'button',
      {
        class: 'btn',
        onclick: () =>
          openAssist(
            {
              kind: singular,
              projectDir: project.dir,
              creating: true,
              title: `Ask Claude to create a new ${singular}`,
              placeholder: `Describe the ${singular}: what it does, when it's used…`,
            },
            reload,
          ),
      },
      [`+ New ${singular} ✨`],
    );
    listWrap.append(el('div', { class: 'md-toolbar' }, [newBtn]));

    if (refs.length === 0) {
      listWrap.append(el('div', { class: 'empty' }, [`No ${active} in this project yet.`]));
      return;
    }
    listWrap.append(
      el(
        'div',
        { class: 'md-list' },
        refs.map((r) => mdItem(r, singular, project.dir, reload)),
      ),
    );
  };

  const mkTab = (key: 'agents' | 'skills', label: string): HTMLElement => {
    const t = activatable(
      el('div', { class: `tab ${active === key ? 'active' : ''}` }, [label]),
      () => {
        active = key;
        [...tabs.children].forEach((c) => c.classList.remove('active'));
        t.classList.add('active');
        renderList();
      },
    );
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

function mdItem(
  ref: MdRef,
  kind: 'agent' | 'skill',
  projectDir: string,
  reload: () => void,
): HTMLElement {
  return activatable(
    el('div', { class: 'md-item' }, [
      el('b', {}, [ref.name]),
      el('div', { class: 'desc' }, [ref.description || '(no description)']),
    ]),
    () => void openMd(ref, kind, projectDir, reload),
  );
}

async function openMd(
  ref: MdRef,
  kind: 'agent' | 'skill',
  projectDir: string,
  reload: () => void,
): Promise<void> {
  let file;
  try {
    file = await getFile(ref.path);
  } catch (err) {
    toast(err instanceof ApiError ? err.message : String(err), 'err');
    return;
  }
  const name = el('input', { value: file.frontmatter.name }) as HTMLInputElement;
  const desc = el('textarea', { rows: 2 }, [file.frontmatter.description]) as HTMLTextAreaElement;
  const bodyTa = el('textarea', { rows: 12 }, [file.body]) as HTMLTextAreaElement;

  const askBtn = el('button', { class: 'btn' }, ['Ask Claude to edit ✨']);
  askBtn.addEventListener('click', () =>
    openAssist(
      { kind, projectDir, targetPath: ref.path, title: `Ask Claude to edit ${ref.name}` },
      reload,
    ),
  );

  const form = el('div', { class: 'form-grid' }, [
    el('label', {}, ['Name', name]),
    el('label', {}, ['Description', desc]),
    el('label', {}, ['Body', bodyTa]),
    el('div', { class: 'assist-hint' }, [askBtn]),
  ]);

  openModal({
    title: ref.name,
    body: form,
    confirmLabel: 'Save',
    onConfirm: async () => {
      if (!name.value.trim()) {
        toast('Name is required', 'err');
        return false;
      }
      try {
        await writeFrontmatter({
          path: ref.path,
          mtimeMs: NaN, // single-editor tool; staleness guard skipped for md edits
          name: name.value.trim(),
          description: desc.value,
          body: bodyTa.value,
        });
        toast('Saved', 'ok');
        reload();
      } catch (err) {
        toast(err instanceof ApiError ? err.message : String(err), 'err');
        return false;
      }
    },
  });
}
