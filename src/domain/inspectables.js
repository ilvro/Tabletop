import { ValidationError } from './validation.js';

/**
 * What a prop shows when it is picked up and held in front of the camera: a document
 * with pages (front and back of each sheet) or an object to turn in the hands. The
 * model stays the asset; a model with a `page` material slot shows the first page on
 * the table, and the inspection shows whichever page and side is being read.
 */
export const INSPECT_KINDS = [['document', 'Documento · páginas para ler'], ['object', 'Objeto · girar e olhar de perto']];
export const PAPERS = [['plain', 'Papel comum'], ['aged', 'Papel envelhecido'], ['photo', 'Foto'], ['newspaper', 'Jornal'], ['notebook', 'Caderno pautado'], ['design', 'Documento do ateliê']];
export const INSPECT_LIMITS = { pages: 12, text: 3000, title: 80, distance: [.2, 2], pitch: [-60, 60], found: 500 };
export const PAGE_SLOT = 'page';
export const HOLD_DEFAULTS = Object.freeze({ distance: .45, pitch: 0 });
/** Props without the contract can still be picked up: they are held a little tilted, to show their top. */
export const OBJECT_HOLD = Object.freeze({ distance: .45, pitch: 18 });
export const blankSide = () => ({ imageRef: null, text: null, design: null, uvImageRef: null });
export const blankPage = () => ({ ...blankSide(), back: null });
export const inspectableDefaults = (patch = {}) => ({ kind: 'document', title: '', pages: [{ ...blankPage(), text: '' }], paper: 'plain', hold: { ...HOLD_DEFAULTS }, secretUntilRevealed: true, ...patch });

const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const reference = value => plain(value) && Object.keys(value).sort().join() === 'id,revision' && typeof value.id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(value.id) && Number.isInteger(value.revision) && value.revision >= 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validSourceUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

const isDesign = value => plain(value) && Object.keys(value).sort().join() === 'app,id,revision,source' && value.app === 'atelie' && UUID.test(value.id) && Number.isInteger(value.revision) && value.revision >= 0 && validSourceUrl(value.source);

function validateSide(side, path) {
  const fail = message => { throw new ValidationError(`${message} (${path})`); };
  if (!plain(side)) fail('Lado de página inválido.');
  for (const key of Object.keys(side)) if (!['imageRef', 'text', 'back', 'design', 'uvImageRef'].includes(key)) fail(`Campo de página desconhecido: ${key}.`);
  if (!('imageRef' in side) || !('text' in side)) fail('A página precisa de imageRef e text (use null quando vazio).');
  if (side.imageRef !== null && !reference(side.imageRef)) fail('Imagem da página inválida.');
  if (side.uvImageRef !== undefined && side.uvImageRef !== null && !reference(side.uvImageRef)) fail('Imagem UV da página inválida.');
  if (side.design !== undefined && side.design !== null && !isDesign(side.design)) fail('Design do Ateliê inválido.');
  if (side.text !== null && (typeof side.text !== 'string' || side.text.length > INSPECT_LIMITS.text)) fail(`O texto de uma página aceita até ${INSPECT_LIMITS.text} caracteres.`);
}

export function validateInspectable(value, path = 'inspectable') {
  const fail = message => { throw new ValidationError(`${message} (${path})`); };
  if (!plain(value)) fail('Inspecionável inválido.');
  const fields = ['kind', 'title', 'pages', 'paper', 'hold', 'secretUntilRevealed'];
  for (const key of Object.keys(value)) if (!fields.includes(key)) fail(`Campo desconhecido: ${key}.`);
  for (const key of fields) if (!(key in value)) fail(`Falta o campo: ${key}.`);
  if (!INSPECT_KINDS.some(([id]) => id === value.kind)) fail('Tipo de inspeção inválido; opções: document, object.');
  if (typeof value.title !== 'string' || value.title.length > INSPECT_LIMITS.title) fail(`O título aceita até ${INSPECT_LIMITS.title} caracteres.`);
  if (!PAPERS.some(([id]) => id === value.paper)) fail('Tipo de papel inválido.');
  if (!Array.isArray(value.pages) || value.pages.length > INSPECT_LIMITS.pages) fail(`Um documento tem até ${INSPECT_LIMITS.pages} páginas.`);
  if (value.kind === 'document' && !value.pages.length) fail('Um documento precisa de ao menos uma página.');
  if (value.kind === 'object' && value.pages.length) fail('Um objeto 3D não tem páginas; use o tipo documento.');
  value.pages.forEach((page, i) => {
    validateSide(page, `${path}.pages[${i}]`);
    if (!('back' in page)) fail(`Falta o verso da página ${i + 1} (use null).`);
    if (page.back !== null) { validateSide(page.back, `${path}.pages[${i}].back`); if ('back' in page.back) fail('O verso não tem verso.'); }
  });
  const hold = value.hold;
  if (!plain(hold) || Object.keys(hold).sort().join() !== 'distance,pitch') fail('Enquadramento inválido: use distance e pitch.');
  const inside = (v, [min, max]) => Number.isFinite(v) && v >= min && v <= max;
  if (!inside(hold.distance, INSPECT_LIMITS.distance)) fail('Distância de leitura fora do intervalo (0,2 a 2 m).');
  if (!inside(hold.pitch, INSPECT_LIMITS.pitch)) fail('Inclinação fora do intervalo (−60° a 60°).');
  if (typeof value.secretUntilRevealed !== 'boolean') fail('secretUntilRevealed deve ser booleano.');
}

/** What the players may see of a prop: with the content secret and the clue not found yet, a blank sheet with no title. */
export function publicInspectable(inspectable, revealed) {
  if (!inspectable || revealed || !inspectable.secretUntilRevealed) return inspectable;
  return { ...inspectable, title: '', pages: inspectable.kind === 'document' ? [blankPage()] : [] };
}

/** A side of a page, `side` 'front' or 'back'; a missing back reads as a blank side. */
export const pageSide = (inspectable, page, side = 'front') => {
  const entry = inspectable?.pages?.[page];
  if (!entry) return blankSide();
  return side === 'back' ? entry.back ?? blankSide() : entry;
};
export const sideHasContent = side => Boolean(side?.imageRef || side?.text?.trim());
export const pageImages = inspectable => (inspectable?.pages ?? []).flatMap(page => [page.imageRef, page.uvImageRef, page.back?.imageRef, page.back?.uvImageRef]).filter(Boolean);
/** Identity of what a side draws: the same key draws the same canvas. */
export const sideKey = (side, paper) => JSON.stringify([paper, side?.imageRef ?? null, side?.text ?? null, side?.design ?? null, side?.uvImageRef ?? null]);

/**
 * Breaks text into the lines of a page. `measure(text)` gives the width of a string in the
 * units of `width`. Explicit line breaks are kept, a blank line is a paragraph, and a word
 * longer than the line is split by letters. Returns the lines and whether text was left over
 * after `maxLines`.
 */
export function wrapText(text, measure, width, maxLines = Infinity) {
  const lines = [];
  for (const paragraph of String(text ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(''); continue; }
    let line = '';
    for (let word of words) {
      while (measure(word) > width && word.length > 1) {
        // A word wider than the page: as many letters as fit, then the rest on the next line.
        if (line) { lines.push(line); line = ''; }
        let cut = word.length - 1; while (cut > 1 && measure(word.slice(0, cut)) > width) cut--;
        lines.push(word.slice(0, cut)); word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next) > width) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  while (lines.length && lines.at(-1) === '') lines.pop();
  return lines.length > maxLines ? { lines: lines.slice(0, maxLines), overflow: true } : { lines, overflow: false };
}

/**
 * The text block of a page: font size in pixels for a page `height` pixels tall, with
 * the size stepping down (to a floor) until the whole text fits, as a typist would choose
 * a smaller type for a long letter.
 */
export function layoutPageText(text, { measureAt, width, height, size, minSize = size * .55, lineHeight = 1.42 }) {
  for (let px = size; ; px = Math.max(minSize, px * .9)) {
    const rows = Math.max(1, Math.floor(height / (px * lineHeight)));
    const result = wrapText(text, value => measureAt(value, px), width, rows);
    if (!result.overflow || px <= minSize) return { ...result, size: px, lineHeight: px * lineHeight };
  }
}

/** The inspector patch for a field of the Inspecionável section. Returns the whole `inspectable` (null removes it). */
export function inspectableFieldPatch(record, field, value, { imageAssets = [], page = 0 } = {}) {
  if (field === 'enabled') return { inspectable: value ? inspectableDefaults({ title: record.name?.slice(0, INSPECT_LIMITS.title) ?? '' }) : null };
  const current = record.inspectable ? structuredClone(record.inspectable) : null;
  if (!current) throw new ValidationError('Ative Inspecionável antes de editar.');
  const image = id => { if (!id) return null; const [key, revision] = String(id).split('@'); const asset = imageAssets.find(item => item.id === key); return { id: key, revision: Number(revision) || asset?.revision || 1 }; };
  const side = /^page-(\d+)-(front|back)-(text|imageRef)$/.exec(field);
  if (side) {
    const entry = current.pages[Number(side[1])]; if (!entry) throw new ValidationError('Página inexistente.');
    const target = side[2] === 'back' ? (entry.back ??= blankSide()) : entry;
    target[side[3]] = side[3] === 'text' ? String(value).slice(0, INSPECT_LIMITS.text) : image(value);
    return { inspectable: current };
  }
  if (field === 'kind') { current.kind = value; current.pages = value === 'object' ? [] : current.pages.length ? current.pages : [{ ...blankPage(), text: '' }]; }
  else if (field === 'title') current.title = String(value).slice(0, INSPECT_LIMITS.title);
  else if (field === 'paper') current.paper = value;
  else if (field === 'secret') current.secretUntilRevealed = Boolean(value);
  else if (field === 'distance') current.hold.distance = Math.min(INSPECT_LIMITS.distance[1], Math.max(INSPECT_LIMITS.distance[0], Number(value)));
  else if (field === 'pitch') current.hold.pitch = Math.min(INSPECT_LIMITS.pitch[1], Math.max(INSPECT_LIMITS.pitch[0], Number(value)));
  else if (field === 'page-add') {
    if (current.pages.length >= INSPECT_LIMITS.pages) throw new ValidationError(`Um documento tem até ${INSPECT_LIMITS.pages} páginas.`);
    current.pages.splice(page + 1, 0, { ...blankPage(), text: '' });
  } else if (field === 'page-remove') {
    if (current.pages.length <= 1) throw new ValidationError('Um documento precisa de ao menos uma página.');
    current.pages.splice(page, 1);
  } else if (field === 'back-add') { const entry = current.pages[page]; if (entry) entry.back ??= { ...blankSide(), text: '' }; }
  else if (field === 'back-remove') { const entry = current.pages[page]; if (entry) entry.back = null; }
  else throw new ValidationError(`Campo de inspeção desconhecido: ${field}.`);
  return { inspectable: current };
}

/** Clues found in this session, in the order they were revealed. */
export const foundClues = document => document?.sessionState?.found ?? [];
export const isRevealed = (document, id) => foundClues(document).includes(id);
