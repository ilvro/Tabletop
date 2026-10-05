import { escapeHTML as esc } from './icons.js';

/** Only editor preferences; opening a panel never edits the scene. */
export function rememberDisclosures(panel, state) {
  for (const node of panel.querySelectorAll('details')) state.set(disclosureKey(node), node.open);
}

function disclosureKey(node) {
  const path = [];
  for (let current = node; current; current = current.parentElement?.closest('details')) {
    path.unshift(current.dataset.panelSection ?? current.dataset.disclosure ?? current.dataset.textureOptions
      ?? current.dataset.atmosphereSection ?? current.querySelector(':scope > summary')?.textContent.trim());
  }
  return path.join('/');
}

export function restoreDisclosures(panel, state) {
  for (const node of panel.querySelectorAll('details')) {
    const key = disclosureKey(node);
    if (state.has(key)) node.open = state.get(key);
  }
}

export function sectionDisclosure(section, key, title, open = false) {
  const details = document.createElement('details');
  details.className = 'panel-disclosure'; details.dataset.panelSection = key; details.open = open;
  const summary = document.createElement('summary'); summary.textContent = title;
  section.classList.add('disclosure-content');
  section.replaceWith(details); details.append(summary, section);
  return details;
}

export function groupDisclosures(panel, groups) {
  const sections = [...panel.children];
  for (const { key, title, description, tasks, open = false } of groups) {
    const group = document.createElement('details');
    group.className = 'panel-group'; group.dataset.panelSection = key; group.open = open;
    group.innerHTML = `<summary><strong>${esc(title)}</strong><small>${esc(description)}</small></summary><div class="panel-group-content"></div>`;
    panel.append(group);
    for (const [index, taskKey, label, expanded = false] of tasks) {
      const section = sections[index];
      const task = sectionDisclosure(section, taskKey, label, expanded);
      group.lastElementChild.append(task);
    }
  }
}

/** Animate user openings, never a rerender caused by editing a value. */
export function animateDisclosures(root) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)'), active = new Set();
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { for (const animation of active) animation.cancel(); active.clear(); }
  });
  root.addEventListener('click', event => {
    const summary = event.target.closest('summary'), details = summary?.parentElement;
    if (!details || details.open || reducedMotion.matches) return;
    requestAnimationFrame(() => {
      if (!details.isConnected || !details.open || reducedMotion.matches) return;
      const content = details.querySelector(':scope > .disclosure-content, :scope > .panel-group-content, :scope > .build-group-content, :scope > section');
      const animation = content?.animate?.([{ opacity: .6 }, { opacity: 1 }], { duration: 100, easing: 'ease-out' });
      if (animation) {
        active.add(animation);
        animation.finished.then(() => active.delete(animation), () => active.delete(animation));
      }
    });
  });
}
