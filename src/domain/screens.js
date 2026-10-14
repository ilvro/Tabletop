import { ValidationError } from './validation.js';
import { illuminationDefaults } from './dynamic-lighting.js';

/**
 * What a screen shows: a few lines of text, a progress bar, a library image or
 * snow. It belongs to any model with a `screen` material slot and is drawn on a
 * small canvas used as that slot's emission map, so it also lights the room.
 * Every animation is a pure function of time: the same instant draws the same frame.
 */
export const SCREEN_KINDS = [['text', 'Texto'], ['image', 'Imagem'], ['static', 'Chuvisco']];
export const SCREEN_ALIGN = [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']];
export const SCREEN_ANIMS = [['none', 'Fixo'], ['dots', 'Reticências'], ['cursor', 'Cursor piscando']];
export const SCREEN_PROGRESS_MODES = [['loop', 'Enche e recomeça'], ['fixed', 'Valor fixo']];
export const SCREEN_LIMITS = { lines: 6, chars: 40, size: [.05, .5], speed: [.02, 2], seed: [0, 65535] };
export const SCREEN_DEFAULTS = Object.freeze({
  enabled: true,
  kind: 'text',
  lines: [{ text: 'BOOTING', size: .2, align: 'left', anim: 'dots' }, { text: 'SYS 4.2', size: .12, align: 'left', anim: 'cursor' }],
  color: '#7dffb0',
  background: '#031008',
  progress: { enabled: true, mode: 'loop', value: .4, speed: .25 },
  imageRef: null,
  scanlines: .5,
  flicker: .15,
  seed: 1,
});
export const SCREEN_LINE_DEFAULT = Object.freeze({ text: '', size: .12, align: 'left', anim: 'none' });
export const SCREEN_LIGHT_PROFILE = 'screen';

export const screenDefaults = (patch = {}) => ({ ...structuredClone(SCREEN_DEFAULTS), ...patch });
export const isScreen = record => Boolean(record?.screen);

export function validateScreen(screen, path = 'screen') {
  const fail = message => { throw new ValidationError(`${message} (${path})`); };
  const plain = value => value && typeof value === 'object' && !Array.isArray(value);
  const hex = value => typeof value === 'string' && /^#[a-fA-F0-9]{6}$/.test(value);
  const inside = (value, [min, max]) => Number.isFinite(value) && value >= min && value <= max;
  if (!plain(screen)) fail('Tela inválida.');
  for (const key of Object.keys(screen)) if (!(key in SCREEN_DEFAULTS)) fail(`Campo de tela desconhecido: ${key}.`);
  for (const key of Object.keys(SCREEN_DEFAULTS)) if (!(key in screen)) fail(`Falta o campo de tela: ${key}.`);
  if (typeof screen.enabled !== 'boolean') fail('A tela acesa deve ser booleana.');
  if (!SCREEN_KINDS.some(([id]) => id === screen.kind)) fail('Tipo de conteúdo da tela inválido.');
  if (!Array.isArray(screen.lines) || screen.lines.length > SCREEN_LIMITS.lines) fail(`A tela aceita até ${SCREEN_LIMITS.lines} linhas.`);
  screen.lines.forEach(line => {
    if (!plain(line)) fail('Linha de tela inválida.');
    const keys = Object.keys(SCREEN_LINE_DEFAULT);
    if (Object.keys(line).length !== keys.length || keys.some(key => !(key in line))) fail('Linha de tela com campos diferentes de texto, tamanho, alinhamento e animação.');
    if (typeof line.text !== 'string' || line.text.length > SCREEN_LIMITS.chars) fail(`Cada linha aceita até ${SCREEN_LIMITS.chars} caracteres.`);
    if (!inside(line.size, SCREEN_LIMITS.size)) fail('Tamanho de linha fora do intervalo.');
    if (!SCREEN_ALIGN.some(([id]) => id === line.align)) fail('Alinhamento de linha inválido.');
    if (!SCREEN_ANIMS.some(([id]) => id === line.anim)) fail('Animação de linha inválida.');
  });
  if (!hex(screen.color) || !hex(screen.background)) fail('Use cores hexadecimais #RRGGBB.');
  const progress = screen.progress;
  if (progress !== null) {
    if (!plain(progress) || Object.keys(progress).sort().join() !== 'enabled,mode,speed,value') fail('Barra de progresso inválida.');
    if (typeof progress.enabled !== 'boolean' || !SCREEN_PROGRESS_MODES.some(([id]) => id === progress.mode)) fail('Barra de progresso inválida.');
    if (!inside(progress.value, [0, 1]) || !inside(progress.speed, SCREEN_LIMITS.speed)) fail('Valor ou velocidade da barra fora do intervalo.');
  }
  const ref = screen.imageRef;
  if (ref !== null) {
    if (!plain(ref) || Object.keys(ref).sort().join() !== 'id,revision' || typeof ref.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(ref.id) || !Number.isInteger(ref.revision) || ref.revision < 1) fail('Imagem da tela inválida.');
  }
  if (screen.kind === 'image' && ref === null) fail('Escolha uma imagem da biblioteca para a tela.');
  if (!inside(screen.scanlines, [0, 1]) || !inside(screen.flicker, [0, 1])) fail('Efeito de tubo e cintilação devem estar entre 0 e 1.');
  if (!Number.isInteger(screen.seed) || !inside(screen.seed, SCREEN_LIMITS.seed)) fail('A variação da tela deve ser um inteiro entre 0 e 65535.');
}

/** What is drawn on the canvas. The tube effect and the flicker are shader uniforms and stay out. */
export const screenContentKey = s => JSON.stringify([s.kind, s.lines, s.color, s.background, s.progress, s.imageRef, s.seed]);
export const screenAnimated = s => Boolean(s.enabled && (s.kind === 'static' || s.progress?.enabled && s.progress.mode === 'loop' || s.kind === 'text' && s.lines.some(line => line.anim !== 'none')));
/** Discrete state of the picture at `t` seconds: the same `t` always gives the same frame, and it changes at most ten times a second. */
export const screenFrame = (s, t) => screenAnimated(s) ? Math.floor(t * 10) : 0;
export const dotsAt = t => Math.floor(t * 2.5) % 4;
export const cursorAt = t => (t * 1.6) % 1 < .5;
/** Share of the bar that is full, or null with no bar. In a loop it holds full for the last ~13% of the cycle. */
export const progressAt = (progress, t) => !progress?.enabled ? null : progress.mode === 'fixed' ? progress.value : Math.min(1, ((t * progress.speed) % 1) * 1.15);

export function screenLineAdd(screen) {
  if (screen.lines.length >= SCREEN_LIMITS.lines) throw new ValidationError(`A tela aceita até ${SCREEN_LIMITS.lines} linhas.`);
  return { ...screen, lines: [...screen.lines.map(line => ({ ...line })), { ...SCREEN_LINE_DEFAULT }] };
}
export function screenLineRemove(screen, index) {
  if (!Number.isInteger(index) || index < 0 || index >= screen.lines.length) throw new ValidationError('Linha da tela inexistente.');
  return { ...screen, lines: screen.lines.filter((_, i) => i !== index).map(line => ({ ...line })) };
}

const PERCENT = new Set(['scanlines', 'flicker', 'progress-value']);
/**
 * The patch an inspector field makes: the whole `screen` (a patch replaces it), and the
 * light that comes with a lit screen. `slotFrame` is where the screen is on the model
 * (`getSlotFrame`), which decides where its light hangs; `imageAssets` are the library images.
 */
export function screenFieldPatch(record, field, value, slotFrame = null, imageAssets = []) {
  const current = record.screen ? structuredClone(record.screen) : null;
  const lightAt = () => slotFrame?.lightPosition ? { position: [...slotFrame.lightPosition] } : {};
  if (field === 'enabled') {
    const screen = { ...(current ?? screenDefaults()), enabled: Boolean(value) };
    if (screen.enabled) {
      if (!record.illumination) return { screen, illumination: { ...illuminationDefaults(SCREEN_LIGHT_PROFILE, record), ...lightAt(), shadowPolicy: 'off', emissionSlot: 'none' } };
      if (record.illumination.profile === SCREEN_LIGHT_PROFILE && record.illumination.enabled === false) return { screen, illumination: { ...structuredClone(record.illumination), enabled: true } };
      return { screen };
    }
    if (record.illumination?.profile === SCREEN_LIGHT_PROFILE) return { screen, illumination: { ...structuredClone(record.illumination), enabled: false } };
    return { screen };
  }
  if (!current) throw new ValidationError('Acenda a tela antes de editar o conteúdo.');
  const amount = PERCENT.has(field) ? Number(value) / 100 : value;
  const line = /^line-(\d+)-(text|size|align|anim)$/.exec(field);
  if (line) {
    const entry = current.lines[Number(line[1])]; if (!entry) throw new ValidationError('Linha da tela inexistente.');
    entry[line[2]] = line[2] === 'size' ? Number(value) / 100 : value;
  } else if (field.startsWith('progress-')) {
    const key = field.slice(9);
    current.progress = { ...(current.progress ?? SCREEN_DEFAULTS.progress), enabled: current.progress?.enabled ?? false, [key]: amount };
  } else if (field === 'imageRef') {
    const [id, revision] = String(value).split('@');
    current.imageRef = value ? { id, revision: Number(revision) } : null;
  } else if (field === 'kind') {
    current.kind = value;
    if (value === 'image' && !current.imageRef) {
      const image = imageAssets[0];
      if (!image) throw new ValidationError('Importe uma imagem na biblioteca de assets para mostrá-la na tela.');
      current.imageRef = { id: image.id, revision: image.revision ?? 1 };
    }
  } else if (['color', 'background', 'scanlines', 'flicker', 'seed'].includes(field)) current[field] = amount;
  else throw new ValidationError(`Campo de tela desconhecido: ${field}.`);
  return { screen: current };
}
