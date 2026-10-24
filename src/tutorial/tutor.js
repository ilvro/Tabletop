import { LESSONS } from './lessons.js';
import { met, measure } from './conditions.js';
import { escapeHTML as esc } from '../ui/icons.js';
import { revealNode } from '../ui/reveal.js';

const STORE = 'tabletop-tutorials-v1', SEEN = 'tabletop-tutorials-seen-v1', LOG = 'tabletop-tutorials-log-v1';
const load = key => { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private window */ } };
const read = () => load(STORE) ?? {};
const write = progress => save(STORE, progress);
/** After this long on a step the ring insists; after the second, the card offers the values. In seconds. */
const INSIST = 20, OFFER = 35;

/**
 * Runs a lesson over the live editor. It only points and waits: the person
 * operates the real interface, and a step completes when its condition holds.
 * `host` supplies `state()` for the conditions, `open(tab)` to bring a side
 * tab forward and `project(point)` to find a point of the scene on screen; the tutor never edits the scene.
 * `afterLesson(lesson, completed)`, optional, returns the buttons of the closing card (going back to the person's scene).
 *
 * Help comes in steps and never does the step: after a while the ring insists, then the card offers to show where
 * (for a step done alone, without the ring) and the values the step asks for. Steps with `try` show only the goal.
 */
export function createTutor(root, host) {
  const layer = document.createElement('div'); layer.className = 'tutor'; layer.hidden = true;
  layer.innerHTML = '<div class="tutor-ring" hidden></div><div class="tutor-spot" hidden><i></i></div><section class="tutor-card" role="dialog" aria-live="polite" aria-label="Tutorial"></section>';
  root.append(layer);
  const ring = layer.firstElementChild, card = layer.lastElementChild, spots = [ring.nextElementSibling];
  let lesson = null, index = 0, frame = 0, shown = -1, missing = 0, held = -1, listeners = [], ending = null;
  // The step's clock and help: when it was shown, whether the person asked to see where, and how far it was at the start.
  let since = 0, shownWhere = false, startLeft = 0, lastNear = '';
  const step = () => lesson?.steps[index], progress = read();
  const emit = () => listeners.forEach(listener => listener());
  const alone = current => Boolean(current.try) && !shownWhere;

  /** What the person does on each step, kept in this browser only, to find the steps that confuse (Exportar relatório). */
  function note(kind) {
    if (!lesson) return;
    const log = load(LOG) ?? {}, entry = log[lesson.id] ??= { starts: 0, completes: 0, steps: {} }, at = entry.steps[index] ??= { seconds: 0, skips: 0, backs: 0, lost: 0, hints: 0 };
    if (kind === 'start') entry.starts++; else if (kind === 'complete') entry.completes++; else if (kind === 'leave') at.seconds = Math.round(at.seconds + (performance.now() - since) / 1000); else at[kind]++;
    save(LOG, log);
  }
  function render() {
    const current = step(), last = index === lesson.steps.length - 1, waits = current.done?.[0] === 'read' || held === index;
    // A long lesson is cut in stages: the card says which one the step belongs to.
    const stages = lesson.steps.filter(entry => entry.stage), stage = lesson.steps.slice(0, index + 1).findLast(entry => entry.stage)?.stage;
    card.innerHTML = `<header><span class="eyebrow">${esc(lesson.title)} · ${index + 1} de ${lesson.steps.length}</span><button type="button" class="quiet" data-tutor="exit" aria-label="Sair do tutorial">Sair</button></header>
      <div class="tutor-progress"><i style="width:${((index + 1) / lesson.steps.length * 100).toFixed(1)}%"></i></div>${stage ? `<p class="tutor-stage">Etapa ${stages.findIndex(entry => entry.stage === stage) + 1} de ${stages.length} · ${esc(stage)}</p>` : ''}
      ${current.try ? '<p class="tutor-alone">Agora sozinho</p>' : ''}<p class="tutor-say">${current.say}</p>${current.why ? `<p class="tutor-why">${current.why}</p>` : ''}
      <div class="tutor-near" hidden><span></span><i><b></b></i></div>
      <p class="tutor-hint" hidden></p>
      <p class="tutor-lost" hidden>Não encontrei este controle na tela. Siga a instrução acima; se não der, pule o passo.</p>
      <div class="tutor-help" hidden>${current.try && current.target ? '<button type="button" class="quiet" data-tutor="where">Mostrar onde</button>' : ''}${current.try ? '' : hint(current) ? '<button type="button" class="quiet" data-tutor="value">Mostrar o valor</button>' : ''}</div>
      <footer><button type="button" class="quiet" data-tutor="back" ${index ? '' : 'disabled'}>Voltar</button>${waits ? `<button type="button" class="primary" data-tutor="next">${last ? 'Concluir' : 'Continuar'}</button>` : '<button type="button" class="quiet" data-tutor="skip">Pular passo</button>'}</footer>`;
    shown = index; missing = 0; since = performance.now(); shownWhere = false; startLeft = 0; lastNear = ''; ring.classList.remove('insist');
  }
  /** The other controls a step asks for (a length beside a width, a colour beside its strength), by their selectors. */
  const actsOf = current => Array.isArray(current.act?.[0]) ? current.act : [current.act];
  function companions(current) {
    return actsOf(current).filter(act => ['click', 'fill', 'select'].includes(act?.[0]) && typeof act[1] === 'string').map(act => act[1]).filter(selector => selector !== current.target);
  }
  /**
   * The values a step asks for, as a person would read them on screen: the label of each field and what goes in it.
   * They come from the gestures the test performs, so no lesson has to write them twice. Empty when there are none.
   */
  function hint(current) {
    if (current.hint) return current.hint;
    const labelOf = selector => { const node = root.querySelector(selector), field = node?.closest('.field, .check'); return (field?.querySelector('.field-label')?.firstChild?.textContent ?? field?.querySelector('span')?.textContent ?? '').trim(); };
    const shown = value => /^-?\d+(\.\d+)?$/.test(value) ? value.replace('.', ',') : value;
    return actsOf(current).filter(act => ['fill', 'set', 'select'].includes(act?.[0])).map(([, selector, value]) => { const label = labelOf(selector); return label ? `<b>${esc(label)}</b>: ${esc(shown(String(value)))}` : esc(shown(String(value))); }).join(' · ');
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
    // A step done alone leaves finding the place to the person, until they ask to be shown.
    if (alone(current)) return current.target && root.querySelector(current.target);
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
  /** "Quase lá": how far a step reached by degrees still is, as a line and a bar that fills. */
  function gauge(current, state) {
    const near = card.querySelector('.tutor-near'); if (!near) return;
    const reading = measure(current.done, state);
    if (!reading) { near.hidden = true; return; }
    startLeft = Math.max(startLeft, reading.left);
    const filled = startLeft > 0 ? Math.max(0, Math.min(1, 1 - reading.left / startLeft)) : 0;
    if (reading.text !== lastNear) { near.querySelector('span').textContent = reading.text; lastNear = reading.text; }
    near.querySelector('b').style.width = `${(filled * 100).toFixed(0)}%`; near.hidden = false;
  }
  function tick() {
    frame = requestAnimationFrame(tick);
    const current = step(); if (!current) return;
    if (shown !== index) render();
    const state = host.state();
    // Done by any path, including before the step was shown.
    // A step the person went back to is theirs to leave.
    if (current.done?.[0] !== 'read' && held !== index && met(current.done, state)) { advance(); return; }
    const target = prepare(current), box = target && area(current, target);
    const visible = box && box.width > 0 && box.bottom > 0 && box.top < innerHeight, pointing = visible && !alone(current);
    if (target && !visible && box.width > 0 && !alone(current)) target.scrollIntoView({ block: 'center' });
    ring.hidden = !pointing;
    if (pointing) { const pad = 5; Object.assign(ring.style, { left: `${box.left - pad}px`, top: `${box.top - pad}px`, width: `${box.width + pad * 2}px`, height: `${box.height + pad * 2}px` }); }
    // A missing target is reported once it has stayed missing for a moment, not while a panel is still opening.
    const wasLost = missing >= 90;
    missing = current.target && !visible && !alone(current) ? missing + 1 : 0; card.querySelector('.tutor-lost').hidden = missing < 90;
    if (missing >= 90 && !wasLost) note('lost');
    layer.dataset.missing = missing >= 90 ? current.target : '';
    place(pointing ? box : null);
    // Where in the scene to click: a mark on each point, followed as the camera moves; several are numbered in order.
    mark(alone(current) ? [] : where(current));
    if (current.done?.[0] !== 'read') {
      gauge(current, state);
      const waited = (performance.now() - since) / 1000, help = card.querySelector('.tutor-help');
      ring.classList.toggle('insist', waited > INSIST);
      if (help && help.hidden && help.children.length && waited > (current.try ? INSIST : OFFER)) help.hidden = false;
    }
  }
  /** The points of the scene a step asks for: its `spot` (one point or a list), or the points its gestures click. */
  function where(current) {
    if (current.spot) return Array.isArray(current.spot[0]) ? current.spot : [current.spot];
    return actsOf(current).filter(act => act?.[0] === 'world').map(act => act[1]);
  }
  function mark(points) {
    while (spots.length < points.length) { const extra = spots[0].cloneNode(true); extra.hidden = true; spots.at(-1).after(extra); spots.push(extra); }
    spots.forEach((node, order) => {
      const place = points[order] && host.project?.(points[order]);
      node.hidden = !place?.visible;
      node.dataset.order = points.length > 1 ? String(order + 1) : '';
      if (place?.visible) Object.assign(node.style, { left: `${Math.round(place.x)}px`, top: `${Math.round(place.y)}px` });
    });
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
    note('leave');
    if (index >= lesson.steps.length - 1) { finish(true); return; }
    held = -1; index++; progress[lesson.id] = { ...progress[lesson.id], step: index }; write(progress); emit();
  }
  /** What the lesson taught, from the steps marked with `learn`: a key and what it does, or a phrase. */
  const learned = finished => finished.steps.flatMap(entry => entry.learn ? [entry.learn] : []).map(item => Array.isArray(item) ? `<li><kbd>${esc(item[0])}</kbd> ${esc(item[1])}</li>` : `<li>${esc(item)}</li>`).join('');
  /**
   * The closing card: what was learned, the next tutorial and, when the lesson ran on a practice scene, the way back
   * to the person's own. A lesson left halfway shows it only when there is somewhere to go back to.
   */
  function closing(finished, completed) {
    const extra = host.afterLesson?.(finished, completed) ?? '', next = completed && finished.next && LESSONS.find(entry => entry.id === finished.next), list = completed ? learned(finished) : '';
    if (!completed && !extra) return;
    ending = finished.id;
    card.innerHTML = `<header><span class="eyebrow">${esc(finished.title)}</span><button type="button" class="quiet" data-tutor="close" aria-label="Fechar">Fechar</button></header>
      <p class="tutor-say">${completed ? 'Concluído.' : 'Você saiu do tutorial. O progresso fica guardado.'}</p>
      ${list ? `<p class="tutor-why">O que você aprendeu:</p><ul class="tutor-learned">${list}</ul>` : ''}
      <footer class="tutor-closing">${extra}${next ? `<button type="button" class="${extra ? 'quiet' : 'primary'}" data-action="tutorial-start" data-id="${next.id}">Próximo: ${esc(next.title)}</button>` : ''}</footer>`;
    layer.hidden = false; ring.hidden = true; spots.forEach(node => { node.hidden = true; });
    card.style.left = `${Math.round(innerWidth - card.offsetWidth - 24)}px`; card.style.top = `${Math.round(innerHeight - card.offsetHeight - 60)}px`;
  }
  function dismiss() { if (ending && !lesson) { ending = null; layer.hidden = true; } }
  function finish(completed) {
    cancelAnimationFrame(frame); layer.hidden = true; ring.hidden = true; spots.forEach(node => { node.hidden = true; }); document.body.classList.remove('tutoring');
    const finished = lesson;
    if (lesson) { if (completed) note('complete'); else note('leave'); progress[lesson.id] = completed ? { done: true } : { ...progress[lesson.id], step: index }; write(progress); }
    lesson = null; shown = -1; emit();
    if (finished) closing(finished, completed);
  }
  layer.addEventListener('click', event => {
    const action = event.target.closest('[data-tutor]')?.dataset.tutor;
    if (action === 'close' || (event.target.closest('[data-action]') && ending && !lesson)) { dismiss(); return; }
    if (!action || !lesson) return;
    if (action === 'exit') finish(false);
    else if (action === 'back') { note('leave'); note('backs'); index = Math.max(0, index - 1); held = index; shown = -1; emit(); }
    else if (action === 'where') { shownWhere = true; note('hints'); event.target.remove(); }
    else if (action === 'value') { const box = card.querySelector('.tutor-hint'); box.innerHTML = hint(step()); box.hidden = false; note('hints'); event.target.remove(); }
    else { if (action === 'skip') note('skips'); advance(); }
  });
  return {
    lessons: LESSONS,
    progress: () => read(),
    get active() { return lesson && { id: lesson.id, step: index, total: lesson.steps.length, missing: layer.dataset.missing || null }; },
    start(id, from = 0) {
      const found = LESSONS.find(entry => entry.id === id); if (!found) return false;
      cancelAnimationFrame(frame); ending = null; held = -1; lesson = found; index = Math.max(0, Math.min(found.steps.length - 1, from)); shown = -1; layer.hidden = false; document.body.classList.add('tutoring'); note('start'); frame = requestAnimationFrame(tick); emit(); return true;
    },
    stop: () => finish(false),
    /** "Mostrar onde" on a step done alone: the ring and the panel come back. */
    showWhere() { if (lesson && step().try) { shownWhere = true; card.querySelector('[data-tutor="where"]')?.remove(); } },
    /** Closes the closing card, if it is up. */
    dismiss,
    /** Lessons marked `since` a date after the last time the list was opened. */
    news: () => news(),
    /** The list was opened: what is new has been seen. */
    seen() { const latest = LESSONS.map(entry => entry.since ?? '').sort().at(-1) ?? ''; if (latest > (load(SEEN) ?? '')) save(SEEN, latest); emit(); },
    /** Where people stop, skip and ask for help, per lesson and step, for whoever improves the lessons. */
    report: () => ({ exported: new Date().toISOString(), progress: read(), steps: load(LOG) ?? {} }),
    onChange(listener) { listeners.push(listener); },
  };
}

/**
 * The lessons that are new to this person. Someone who never opened a tutorial starts with nothing new (everything is);
 * someone who already used them sees what came after the last time they looked.
 */
function news() {
  let seen = load(SEEN);
  if (seen === null) { seen = Object.keys(read()).length ? '' : new Date().toISOString().slice(0, 10); save(SEEN, seen); }
  return LESSONS.filter(lesson => lesson.since && lesson.since > seen);
}

/** The folders of the tutorial list, in order; a lesson names its folder with `folder`. */
export const LESSON_FOLDERS = [
  { id: 'start', name: 'Fundamentos', about: 'A tela inteira e o assistente de construção.' },
  { id: 'table', name: 'Na mesa', about: 'Conduzir a sessão: projetor, combate e personagens.' },
  { id: 'light', name: 'Luz e câmera', about: 'Iluminar como um diretor de fotografia e dirigir a cena ao vivo.' },
  { id: 'tips', name: 'Dicas rápidas', about: 'Um minuto cada: a resposta para “como faço…?”. Também no “?” de cada tarefa.' },
  { id: 'industrial', name: 'Galpão abandonado', about: 'A cena de exemplo do galpão, refeita em quatro partes.' },
];

/** Two ways in, by what the person came to do. Each is a sequence of lessons; the list offers the first one not done. */
export const LESSON_PATHS = [
  { id: 'master', name: 'Vou mestrar', about: 'Montar rápido, mostrar no projetor e conduzir um combate.', lessons: ['basics', 'session', 'combat'] },
  { id: 'build', name: 'Quero construir', about: 'Cenas bonitas do zero, com o assistente e a luz certa.', lessons: ['basics', 'assistant', 'lighting', 'industrial-1'] },
];

const KINDS = { tip: 'dica', lesson: 'lição', project: 'projeto' };

/** The list of lessons, in folders, with what was done and where one stopped. `held` names the person's scene kept aside during practice. */
export function tutorialCenter(tutor, sceneEmpty, held = null) {
  const progress = tutor.progress(), fresh = new Set(tutor.news?.().map(lesson => lesson.id) ?? []);
  const card = (lesson, folder) => { const state = progress[lesson.id] ?? {}, resume = !state.done && state.step > 0, title = folder && lesson.title.startsWith(`${folder.name} · `) ? lesson.title.slice(folder.name.length + 3) : lesson.title; return `<article class="lesson ${state.done ? 'done' : ''}" data-lesson="${lesson.id}">
      <h3>${esc(title)}${fresh.has(lesson.id) ? '<span class="lesson-new">Novo</span>' : ''}<small>${KINDS[lesson.kind ?? 'lesson']} · ${lesson.minutes} min · ${lesson.steps.length} passos${state.done ? ' · concluído' : resume ? ` · parou no passo ${state.step + 1}` : ''}</small></h3><p>${esc(lesson.summary)}</p>
      ${lesson.continues ? `<p class="lesson-note">Continua a cena de <b>${esc(tutor.lessons.find(entry => entry.id === lesson.continues)?.title ?? '')}</b>: com ela aberta, comece por aqui.</p>` : ''}
      ${lesson.needs && !(lesson.needs === 'empty' && sceneEmpty) ? `<p class="lesson-note">Acontece numa cena de treino${lesson.needs.example ? ', cópia do exemplo' : ''}. A sua fica guardada e volta quando você terminar.</p>` : ''}
      <div class="lesson-actions"><button type="button" class="primary" data-action="tutorial-start" data-id="${lesson.id}">${state.done ? 'Refazer' : 'Começar'}</button>${resume ? `<button type="button" data-action="tutorial-start" data-id="${lesson.id}" data-from="${state.step}">Continuar do passo ${state.step + 1}</button>` : ''}</div></article>`; };
  // A folder whose lessons are all done closes, so what is left to learn comes first.
  const folders = [...LESSON_FOLDERS, { id: null, name: 'Outros' }].map(folder => ({ folder, lessons: tutor.lessons.filter(lesson => (lesson.folder ?? null) === folder.id) })).filter(entry => entry.lessons.length);
  const paths = LESSON_PATHS.map(path => {
    const steps = path.lessons.map(id => tutor.lessons.find(lesson => lesson.id === id)).filter(Boolean), next = steps.find(lesson => !progress[lesson.id]?.done), done = steps.length - steps.filter(lesson => !progress[lesson.id]?.done).length;
    return `<article class="lesson-path" data-lesson-path="${path.id}"><h3>${esc(path.name)}<small>${done} de ${steps.length} · ${esc(path.about)}</small></h3>
      <ol>${steps.map(lesson => `<li class="${progress[lesson.id]?.done ? 'done' : lesson === next ? 'next' : ''}">${esc(lesson.title)}</li>`).join('')}</ol>
      ${next ? `<button type="button" class="${done ? 'primary' : 'quiet'}" data-action="tutorial-start" data-id="${next.id}">${done ? 'Continuar' : 'Começar'}: ${esc(next.title)}</button>` : '<p class="microcopy">Trilha concluída.</p>'}</article>`;
  }).join('');
  return `<header><div><span class="eyebrow">APRENDER</span><h2>Tutoriais</h2></div><button type="button" class="quiet" data-action="tutorials" aria-label="Fechar tutoriais">Fechar</button></header>
    ${held ? `<p class="lesson-held">Sua cena <b>${esc(held)}</b> está guardada enquanto você treina.<button type="button" class="primary" data-action="tutorial-return">Voltar para ela</button></p>` : ''}
    <p class="microcopy">Cada tutorial acontece na própria cena: ele aponta, você faz, e o passo avança quando o resultado aparece. Travou? Depois de alguns segundos o cartão oferece ajuda. Dá para sair e voltar depois.</p>
    <div class="lesson-paths">${paths}</div>
    ${folders.map(({ folder, lessons }) => { const done = lessons.filter(lesson => progress[lesson.id]?.done).length; return `<details class="lesson-folder" data-lesson-folder="${folder.id ?? 'other'}" ${done < lessons.length && folder.id !== 'tips' ? 'open' : ''}>
      <summary><span>${esc(folder.name)}</span><small>${done} de ${lessons.length} concluídos${folder.about ? ` · ${esc(folder.about)}` : ''}</small></summary>
      ${lessons.map(lesson => card(lesson, folder)).join('')}</details>`; }).join('')}
    <p class="microcopy">Mais tutoriais virão, incluindo a reconstrução de outras cenas prontas. <button type="button" class="link" data-action="tutorial-report">Exportar relatório dos tutoriais</button> (onde você travou ou pulou, guardado só neste navegador).</p>`;
}

/** The tutorial for a task of the panel, by the task's key: the "?" beside its title. Tips first, they answer fastest. */
export function lessonForTask(key) {
  const found = LESSONS.filter(lesson => [lesson.task].flat().includes(key));
  return found.find(lesson => lesson.kind === 'tip') ?? found[0] ?? null;
}
