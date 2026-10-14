import { LESSONS } from './lessons.js';
import { met } from './conditions.js';
import { escapeHTML as esc } from '../ui/icons.js';

const STORE = 'tabletop-tutorials-v1';
const read = () => { try { return JSON.parse(localStorage.getItem(STORE) ?? '{}'); } catch { return {}; } };
const write = progress => { try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch { /* private window */ } };

/**
 * Runs a lesson over the live editor. It only points and waits: the person
 * operates the real interface, and a step completes when its condition holds.
 * `host` supplies `state()` for the conditions and `open(tab)` to bring a side
 * tab forward; the tutor never edits the scene.
 */
export function createTutor(root, host) {
  const layer = document.createElement('div'); layer.className = 'tutor'; layer.hidden = true;
  layer.innerHTML = '<div class="tutor-ring" hidden></div><section class="tutor-card" role="dialog" aria-live="polite" aria-label="Tutorial"></section>';
  root.append(layer);
  const ring = layer.firstElementChild, card = layer.lastElementChild;
  let lesson = null, index = 0, frame = 0, shown = -1, missing = 0, held = -1, listeners = [];
  const step = () => lesson?.steps[index], progress = read();
  const emit = () => listeners.forEach(listener => listener());

  function render() {
    const current = step(), last = index === lesson.steps.length - 1, waits = current.done?.[0] === 'read' || held === index;
    card.innerHTML = `<header><span class="eyebrow">${esc(lesson.title)} · ${index + 1} de ${lesson.steps.length}</span><button type="button" class="quiet" data-tutor="exit" aria-label="Sair do tutorial">Sair</button></header>
      <div class="tutor-progress"><i style="width:${((index + 1) / lesson.steps.length * 100).toFixed(1)}%"></i></div>
      <p class="tutor-say">${current.say}</p>${current.why ? `<p class="tutor-why">${current.why}</p>` : ''}
      <p class="tutor-lost" hidden>Não encontrei este controle na tela. Siga a instrução acima; se não der, pule o passo.</p>
      <footer><button type="button" class="quiet" data-tutor="back" ${index ? '' : 'disabled'}>Voltar</button>${waits ? `<button type="button" class="primary" data-tutor="next">${last ? 'Concluir' : 'Continuar'}</button>` : '<button type="button" class="quiet" data-tutor="skip">Pular passo</button>'}</footer>`;
    shown = index; missing = 0;
  }
  /** Brings the target into reach: its side tab forward and the tasks around it open. */
  function prepare(current) {
    if (current.tab && host.state().tab !== current.tab) host.open(current.tab);
    const target = current.target && root.querySelector(current.target);
    if (!target || current.reveal === false) return target;
    for (let parent = target.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS' && !parent.open) parent.querySelector(':scope > summary')?.click();
    return target;
  }
  function tick() {
    frame = requestAnimationFrame(tick);
    const current = step(); if (!current) return;
    if (shown !== index) render();
    // Done by any path, including before the step was shown.
    // A step the person went back to is theirs to leave.
    if (current.done?.[0] !== 'read' && held !== index && met(current.done, host.state())) { advance(); return; }
    const target = prepare(current), box = target?.getBoundingClientRect();
    const visible = box && box.width > 0 && box.bottom > 0 && box.top < innerHeight;
    if (target && !visible && box.width > 0) target.scrollIntoView({ block: 'center' });
    ring.hidden = !visible;
    if (visible) { const pad = 5; Object.assign(ring.style, { left: `${box.left - pad}px`, top: `${box.top - pad}px`, width: `${box.width + pad * 2}px`, height: `${box.height + pad * 2}px` }); }
    // A missing target is reported once it has stayed missing for a moment, not while a panel is still opening.
    missing = current.target && !visible ? missing + 1 : 0; card.querySelector('.tutor-lost').hidden = missing < 90;
    layer.dataset.missing = missing >= 90 ? current.target : '';
    place(visible ? box : null);
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
    cancelAnimationFrame(frame); layer.hidden = true; ring.hidden = true; document.body.classList.remove('tutoring');
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
      ${lesson.needs === 'empty' && !sceneEmpty ? '<p class="lesson-note">Este tutorial constrói do zero. A cena aberta já tem objetos: crie uma cena nova antes (botão <b>Nova</b>, no topo) para os passos não se confundirem com o que já existe.</p>' : ''}
      <div class="lesson-actions"><button type="button" class="primary" data-action="tutorial-start" data-id="${lesson.id}">${state.done ? 'Refazer' : 'Começar'}</button>${resume ? `<button type="button" data-action="tutorial-start" data-id="${lesson.id}" data-from="${state.step}">Continuar do passo ${state.step + 1}</button>` : ''}</div></article>`; }).join('')}
    <p class="microcopy">Mais tutoriais virão, incluindo a reconstrução passo a passo de cenas prontas.</p>`;
}
