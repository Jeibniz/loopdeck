import type { Project } from '../../server/types.js';
import { activatable, el } from '../ui/dom.js';

export function renderProjectList(projects: Project[], onOpen: (p: Project) => void): HTMLElement {
  if (projects.length === 0) {
    return el('div', { class: 'empty' }, [
      'No projects found here. Run loopdeck from a folder that contains loops.yaml or .claude/ directories.',
    ]);
  }
  const cards = projects.map((p) => {
    const stage = p.loopsFile?.stage;
    const counts = el('div', { class: 'counts' }, [
      el('span', {}, [el('b', {}, [String(p.loopsFile?.loops.length ?? 0)]), ' loops']),
      el('span', {}, [el('b', {}, [String(p.agents.length)]), ' agents']),
      el('span', {}, [el('b', {}, [String(p.skills.length)]), ' skills']),
    ]);
    const head = el('h3', {}, [p.name]);
    if (stage) head.append(' ', el('span', { class: `badge stage-${stage}` }, [String(stage)]));
    return activatable(
      el('div', { class: 'card' }, [head, el('div', { class: 'relpath' }, [p.relDir]), counts]),
      () => onOpen(p),
    );
  });
  return el('div', { class: 'cards' }, cards);
}
