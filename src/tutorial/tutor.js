import { LESSONS } from './lessons.js';
import { met } from './conditions.js';
import { escapeHTML as esc } from '../ui/icons.js';
import { revealNode } from '../ui/reveal.js';

const STORE = 'tabletop-tutorials-v1';
const read = () => { try { return JSON.parse(localStorage.getItem(STORE) ?? '{}'); } catch { return {}; } };
const write = progress => { try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch { /* private window */ } };

/**
 * Runs a lesson over the live editor. It only points and waits: the person
 * operates the real interface, and a step completes when its condition holds.
 * `host` supplies `state()` for the conditions, `open(tab)` to bring a side
 * tab forward and `project(point)` to find a point of the scene on screen; the tutor never edits the scene.
 */
export function createTutor(root, host) {
  const layer = document.createElement('div'); layer.className = 'tutor'; layer.hidden = true;
  layer.innerHTML = '<div class="tutor-ring" hidden></div><div class="tutor-spot" hidden><i></i></div><section class="tutor-card" role="dialog" aria-live="polite" aria-label="Tutorial"></section>';
  root.append(layer);
  const ring = layer.firstElementChild, spot = ring.nextElementSibling, card = layer.lastElementChild;
  let lesson = null, index = 0, frame = 0, shown = -1, missing = 0, held = -1, listeners = [];
  const step = () => lesson?.steps[index], progress = read();
  const emit = () => listeners.forEach(listener => listener());

  function render() {
    const current = step(), last = index === lesson.steps.length - 1, waits = current.done?.[0] === 'read' || held === index;
    // A long lesson is cut in stages: the card says which one the step belongs to.
    const stages = lesson.steps.filter(entry => entry.stage), stage = lesson.steps.slice(0, index + 1).findLast(entry => entry.stage)?.stage;
    card.innerHTML = `<header><span class="eyebrow">${esc(lesson.title)} · ${index + 1} de ${lesson.steps.length}</span><button type="button" class="quiet" data-tutor="exit" aria-label="Sair do tutorial">Sair</button></header>
      <div class="tutor-progress"><i style="width:${((index + 1) / lesson.steps.length * 100).toFixed(1)}%"></i></div>${stage ? `<p class="tutor-stage">Etapa ${stages.findIndex(entry => entry.stage === stage) + 1} de ${stages.length} · ${esc(stage)}</p>` : ''}
      <p class="tutor-say">${current.say}</p>${current.why ? `<p class="tutor-why">${current.why}</p>` : ''}
      <p class="tutor-lost" hidden>Não encontrei este controle na tela. Siga a instrução acima; se não der, pule o passo.</p>
      <footer><button type="button" class="quiet" data-tutor="back" ${index ? '' : 'disabled'}>Voltar</button>${waits ? `<button type="button" class="primary" data-tutor="next">${last ? 'Concluir' : 'Continuar'}</button>` : '<button type="button" class="quiet" data-tutor="skip">Pular passo</button>'}</footer>`;
    shown = index; missing = 0;
  }
  /** The other controls a step asks for (a length beside a width, a colour beside its strength), by their selectors. */
  function companions(current) {
    const acts = Array.isArray(current.act?.[0]) ? current.act : [current.act];
    return acts.filter(act => ['click', 'fill', 'select'].includes(act?.[0]) && typeof act[1] === 'string').map(act => act[1]).filter(selector => selector !== current.target);
  }
  /** A control inside a collapsed side panel has no size: the panel is opened first (narrow screens collapse it by themselves). */
  const open = node => {
    const shell = root.querySelector('.app-shell');
    if (node.closest('#inspector-content') && shell?.classList.contains('inspector-collapsed')) root.querySelector('[data-action="inspector-toggle"]')?.click();
    if (node.closest('#side-content') && shell?.classList.contains('sidebar-collapsed')) root.querySelector('[data-action="sidebar-toggle"]')?.click();
    revealNode(node, { scroll: false });
  };
  /** Brings the target into reach: its side tab forward and the tasks around it, and around the controls that go with it, open. */
  function prepare(current) {
    if (current.tab && host.state().tab !== current.tab) host.open(current.tab);
    const target = current.target && root.querySelector(current.target);
    if (!target || current.reveal === false) return target;
    open(target);
    for (const selector of companions(current)) { const node = root.querySelector(selector); if (node && region(node) === region(target)) open(node); }
    return target;
  }
  const region = node => node.closest('#side-content, #inspector-content, .app-header, .rail, dialog');
  /**
   * What the step is about on screen: the target with its label, and the controls that go with it in the same panel.
   * The ring goes around all of it and the card keeps clear of it, so no field the step asks for is covered.
   */
  function area(current, target) {
    const field = node => (node.matches('input, select, textarea') && node.closest('.field, .check')) || node;
    let box = target.getBoundingClientRect();
    if (!box.width) return box;
    box = field(target).getBoundingClientRect();
    let { left, top, right, bottom } = box;
    for (const selector of companions(current)) {
      const node = root.querySelector(selector);
      if (!node || region(node) !== region(target)) continue;
      const other = field(node).getBoundingClientRect();
      if (!other.width || other.bottom < 0 || other.top > innerHeight) continue;
      left = Math.min(left, other.left); top = Math.min(top, other.top); right = Math.max(right, other.right); bottom = Math.max(bottom, other.bottom);
    }
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }
  function tick() {
    frame = requestAnimationFrame(tick);
    const current = step(); if (!current) return;
    if (shown !== index) render();
    // Done by any path, including before the step was shown.
    // A step the person went back to is theirs to leave.
    if (current.done?.[0] !== 'read' && held !== index && met(current.done, host.state())) { advance(); return; }
    const target = prepare(current), box = target && area(current, target);
    const visible = box && box.width > 0 && box.bottom > 0 && box.top < innerHeight;
    if (target && !visible && box.width > 0) target.scrollIntoView({ block: 'center' });
    ring.hidden = !visible;
    if (visible) { const pad = 5; Object.assign(ring.style, { left: `${box.left - pad}px`, top: `${box.top - pad}px`, width: `${box.width + pad * 2}px`, height: `${box.height + pad * 2}px` }); }
    // A missing target is reported once it has stayed missing for a moment, not while a panel is still opening.
    missing = current.target && !visible ? missing + 1 : 0; card.querySelector('.tutor-lost').hidden = missing < 90;
    layer.dataset.missing = missing >= 90 ? current.target : '';
    place(visible ? box : null);
    // Where in the scene to click: a mark on the very point, followed as the camera moves.
    const point = where(current), mark = point && host.project?.(point);
    spot.hidden = !mark?.visible;
    if (mark?.visible) Object.assign(spot.style, { left: `${Math.round(mark.x)}px`, top: `${Math.round(mark.y)}px` });
  }
  /** The point of the scene a step asks for: its `spot`, or the point its gesture clicks. */
  function where(current) {
    if (current.spot) return current.spot;
    const acts = Array.isArray(current.act?.[0]) ? current.act : [current.act];
    return acts.find(act => act?.[0] === 'world')?.[1] ?? null;
  }
  /** The card sits beside the target without covering it; over the scene when there is none. */
  function place(box) {
    const width = card.offsetWidth, height = card.offsetHeight, gap = 16;
    let left = innerWidth - width - 24, top = innerHeight - height - 60;
    // A target as large as the scene leaves no side free: the card goes over the panel at the edge, clear of the scene.
    if (box && box.width > innerWidth / 2) { left = innerWidth - width - 12; top = Math.max(12, box.top + 60); }
    else if (box) {
      const right = box.right + gap + width < innerWidth, below = box.bottom + gap + height < innerHeight;
      if (right) { left = box.right + gap; top = Math.min(Math.max(12, box.top), innerHeight - height - 12); }
      else if (box.left - gap - width > 0) { left = box.left - gap - width; top = Math.min(Math.max(12, box.top), innerHeight - height - 12); }
      else { left = Math.min(Math.max(12, box.left), innerWidth - width - 12); top = below ? box.bottom + gap : Math.max(12, box.top - gap - height); }
    }
    card.style.left = `${Math.round(left)}px`; card.style.top = `${Math.round(top)}px`;
  }
  function advance() {
    if (index >= lesson.steps.length - 1) { finish(true); return; }
    held = -1; index++; progress[lesson.id] = { ...progress[lesson.id], step: index }; write(progress); emit();
  }
  function finish(completed) {
    cancelAnimationFrame(frame); layer.hidden = true; ring.hidden = true; spot.hidden = true; document.body.classList.remove('tutoring');
    if (lesson) { progress[lesson.id] = completed ? { done: true } : { ...progress[lesson.id], step: index }; write(progress); }
    lesson = null; shown = -1; emit();
  }
  layer.addEventListener('click', event => {
    const action = event.target.closest('[data-tutor]')?.dataset.tutor; if (!action || !lesson) return;
    if (action === 'exit') finish(false); else if (action === 'back') { index = Math.max(0, index - 1); held = index; shown = -1; emit(); } else advance();
  });
  return {
    lessons: LESSONS,
    progress: () => read(),
    get active() { return lesson && { id: lesson.id, step: index, total: lesson.steps.length, missing: layer.dataset.missing || null }; },
    start(id, from = 0) {
      const found = LESSONS.find(entry => entry.id === id); if (!found) return false;
      cancelAnimationFrame(frame); held = -1; lesson = found; index = Math.max(0, Math.min(found.steps.length - 1, from)); shown = -1; layer.hidden = false; document.body.classList.add('tutoring'); frame = requestAnimationFrame(tick); emit(); return true;
    },
    stop: () => finish(false),
    onChange(listener) { listeners.push(listener); },
  };
}

/** The list of lessons, with what was done and where one stopped. */
export function tutorialCenter(tutor, sceneEmpty) {
  const progress = tutor.progress();
  return `<header><div><span class="eyebrow">APRENDER</span><h2>Tutoriais</h2></div><button type="button" class="quiet" data-action="tutorials" aria-label="Fechar tutoriais">Fechar</button></header>
    <p class="microcopy">Cada tutorial acontece na própria cena: ele aponta, você faz, e o passo avança quando o resultado aparece. Dá para sair e voltar depois.</p>
    ${tutor.lessons.map(lesson => { const state = progress[lesson.id] ?? {}, resume = !state.done && state.step > 0; return `<article class="lesson ${state.done ? 'done' : ''}">
      <h3>${esc(lesson.title)}<small>${lesson.minutes} min · ${lesson.steps.length} passos${state.done ? ' · concluído' : resume ? ` · parou no passo ${state.step + 1}` : ''}</small></h3><p>${esc(lesson.summary)}</p>
      ${lesson.continues ? `<p class="lesson-note">Continua a cena de <b>${esc(tutor.lessons.find(entry => entry.id === lesson.continues)?.title ?? '')}</b>: com ela aberta, comece por aqui.</p>` : ''}
      ${lesson.needs === 'empty' && !sceneEmpty ? '<p class="lesson-note">Este tutorial constrói do zero. A cena aberta já tem objetos: crie uma cena nova antes (botão <b>Nova</b>, no topo) para os passos não se confundirem com o que já existe.</p>' : ''}
      <div class="lesson-actions"><button type="button" class="primary" data-action="tutorial-start" data-id="${lesson.id}">${state.done ? 'Refazer' : 'Começar'}</button>${resume ? `<button type="button" data-action="tutorial-start" data-id="${lesson.id}" data-from="${state.step}">Continuar do passo ${state.step + 1}</button>` : ''}</div></article>`; }).join('')}
    <p class="microcopy">Mais tutoriais virão, incluindo a reconstrução de outras cenas prontas.</p>`;
}
