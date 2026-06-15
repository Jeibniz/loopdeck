import type { Project, ScanResult } from '../server/types.js';
import { clear, el } from './ui/dom.js';
import { ApiError, scan } from './api.js';
import { renderProjectList } from './views/projectList.js';
import { renderLoopsTable } from './views/loopsTable.js';
import { renderMarkdownBrowser } from './views/markdownBrowser.js';

const app = document.getElementById('app')!;
const rootPathEl = document.getElementById('root-path')!;

let state: ScanResult | null = null;
let openDir: string | null = null; // project dir currently in detail view

async function refresh(): Promise<void> {
  try {
    state = await scan();
    rootPathEl.textContent = state.root;
    render();
  } catch (err) {
    clear(app);
    app.append(
      el('div', { class: 'empty' }, [err instanceof ApiError ? err.message : String(err)]),
    );
  }
}

function render(): void {
  if (!state) return;
  clear(app);
  const project = openDir ? state.projects.find((p) => p.dir === openDir) : null;
  if (project) {
    renderDetail(project);
  } else {
    openDir = null;
    app.append(
      renderProjectList(state.projects, (p) => {
        openDir = p.dir;
        render();
      }),
    );
  }
}

function renderDetail(project: Project): void {
  const back = el(
    'div',
    {
      class: 'crumb',
      onclick: () => {
        openDir = null;
        render();
      },
    },
    ['← all projects'],
  );
  const title = el('h2', {}, [project.name]);
  if (project.loopsFile?.stage) {
    title.append(
      ' ',
      el('span', { class: `badge stage-${project.loopsFile.stage}` }, [
        String(project.loopsFile.stage),
      ]),
    );
  }
  app.append(back, el('div', { class: 'detail-head' }, [title]));
  app.append(renderLoopsTable(project, () => void refresh()));
  app.append(el('h2', { style: 'margin-top:32px;font-size:16px;' }, ['Agents & Skills']));
  app.append(renderMarkdownBrowser(project));
}

void refresh();
