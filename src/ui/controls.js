import { escapeHTML as esc } from './icons.js';

/**
 * Control kit shared by every panel. Each control keeps one native form
 * element carrying `data-field`; sliders, segments and swatches are companions
 * that write into it, so field handling and undo stay in one place.
 */
const UNITS = { m: 'm', cm: 'cm', mm: 'mm', '%': '%', s: 's', graus: '°' };
const format = value => Number(value).toFixed(3).replace(/\.?0+$/, '') || '0';
/** "Brilho · 0 escuro / 2 claro" → name, optional unit suffix and a hint line. */
export function splitLabel(label) {
  const [name, ...rest] = String(label).split(' · ');
  let unit = '';
  const hints = rest.filter(part => {
    if (part === '0–1') return false;
    if (UNITS[part] && !unit) { unit = UNITS[part]; return false; }
    return true;
  });
  return { name, unit, hint: hints.join(' · ') };
}
const labelMarkup = ({ name, hint }) => `<span class="field-label">${name}${hint ? `<small>${hint}</small>` : ''}</span>`;
/** A bounded quantity is easier to explore than to type: it gets a slider. */
const isRange = (field, min, max, step) => min !== undefined && max !== undefined && (max - min) / step <= 400 && !/seed$/i.test(field);

export function numberField(field, label, value, { min, max, step = .1, disabled = false } = {}) {
  const parts = splitLabel(label), shown = format(value), state = disabled ? 'disabled' : '';
  const limits = `${min === undefined ? '' : `min="${min}"`} ${max === undefined ? '' : `max="${max}"`}`;
  const input = `<span class="value-box"><input type="number" data-field="${field}" value="${shown}" step="${step}" ${limits} ${state}/>${parts.unit ? `<i>${parts.unit}</i>` : ''}</span>`;
  if (!isRange(field, min, max, step)) return `<label class="field measure-field">${labelMarkup(parts)}${input}</label>`;
  return `<label class="field range-field">${labelMarkup(parts)}${input}<input type="range" data-range="${field}" value="${shown}" step="${step}" ${limits} ${state} tabindex="-1" aria-hidden="true"/></label>`;
}
/** A text box beside a colour picker: the code can be typed or pasted (#a1b2c3, a1b2c3 or #abc), whatever picker the system offers. */
export const hexBox = (field, value) => `<input type="text" class="hex-box" data-hex="${field}" value="${esc(String(value).toLowerCase())}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Código hexadecimal da cor"/>`;
export const colorField = (field, label, value) => `<label class="field color-field"><span class="field-label">${label}</span><span class="color-pair"><input type="color" data-field="${field}" value="${esc(value)}" />${hexBox(field, value)}</span></label>`;
/** '#ABC', 'a1b2c3' or '#a1b2c3' as '#a1b2c3'; null when it is not a colour. */
export function normalizeHex(text) {
  const code = String(text).trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(code)) return `#${[...code].map(digit => digit + digit).join('')}`;
  return /^[0-9a-f]{6}$/.test(code) ? `#${code}` : null;
}
export const checkField = (field, label, checked) => `<label class="check"><input type="checkbox" data-field="${field}" ${checked ? 'checked' : ''}/><span>${label}</span></label>`;

const optionName = name => String(name).split(' · ');
/**
 * One choice among few. `options` is a list of `[value, name, brief?]`; the
 * button shows `brief`, or the name up to its "· detail", and the tooltip the full name. `swatch(value)` returns the inline
 * markup of a preview, which turns the segments into an image grid.
 */
export function choiceField(field, label, value, options, { swatch, columns, disabled = false } = {}) {
  const native = `<select data-field="${field}" class="choice-native" tabindex="-1" aria-hidden="true" ${disabled ? 'disabled' : ''}>${options.map(([id, name]) => `<option value="${esc(id)}" ${value === id ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select>`;
  const buttons = options.map(([id, name, brief]) => {
    const short = brief ?? optionName(name)[0], active = value === id;
    return `<button type="button" role="radio" aria-checked="${active}" data-choice="${esc(id)}" class="${active ? 'active' : ''}" title="${esc(name)}" ${disabled ? 'disabled' : ''}>${swatch ? swatch(id) : ''}<span>${esc(swatch ? short.split(/ \/ | sobre /)[0] : short)}</span></button>`;
  }).join('');
  const kind = swatch ? 'swatches' : options.length <= 3 ? 'segments' : 'chips';
  return `<div class="field choice-field">${label ? `<span class="field-label">${label}</span>` : ''}${native}<div class="${kind}" role="radiogroup" aria-label="${esc(label || field)}" ${columns ? `style="--columns:${columns}"` : ''}>${buttons}</div></div>`;
}
/** Wires the companions of every control inside `root` to their native field. */
export function bindControls(root, commit) {
  const numberOf = range => range.closest('.range-field')?.querySelector(`[data-field="${range.dataset.range}"]`);
  const pickerOf = box => box.parentElement?.querySelector(`input[type="color"][data-field="${box.dataset.hex}"]`);
  root.addEventListener('input', event => {
    const target = event.target;
    if (target.type === 'color' && target.dataset?.field) { const box = target.parentElement?.querySelector(`[data-hex="${target.dataset.field}"]`); if (box) box.value = target.value; }
    else if (target.dataset?.range) { const number = numberOf(target); if (number) number.value = target.value; }
    else if (target.type === 'number' && target.closest?.('.range-field')) { const range = target.closest('.range-field').querySelector('[data-range]'); if (range) range.value = target.value; }
  });
  // A drag ends in a single change, so it is a single undo step.
  root.addEventListener('change', event => {
    // A typed code is committed through its picker, as if it had been picked there.
    if (event.target.dataset?.hex) {
      const box = event.target, picker = pickerOf(box), code = normalizeHex(box.value);
      if (!picker) return;
      if (!code) { box.value = picker.value; return; }
      box.value = code;
      if (picker.value !== code) { picker.value = code; commit(picker); }
      return;
    }
    if (!event.target.dataset?.range) return;
    const number = numberOf(event.target);
    if (number) { number.value = event.target.value; commit(number); }
  });
  root.addEventListener('click', event => {
    const choice = event.target.closest?.('[data-choice]'), select = choice?.closest('.choice-field')?.querySelector('select');
    if (!select || select.disabled || select.value === choice.dataset.choice) return;
    select.value = choice.dataset.choice;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
