import { SCREEN_KINDS, SCREEN_ALIGN, SCREEN_ANIMS, SCREEN_PROGRESS_MODES, SCREEN_LIMITS } from '../domain/screens.js';
import { escapeHTML as esc } from './icons.js';

/**
 * What a screen shows. Only models that have a `screen` material slot get this section,
 * which is known once the model has loaded; before a screen exists it is a single switch.
 */
export function screenPanel(record, slots, imageAssets, { numberField, colorField, checkField, choiceField }) {
  if (!slots.includes('screen') || record.cable || record.decal) return '';
  const screen = record.screen;
  if (!screen) return `<section><span class="eyebrow">TELA</span>${checkField('screen-enabled', 'Tela acesa', false)}<p class="microcopy">Este modelo tem uma tela. Acenda para mostrar texto, uma barra de progresso, uma imagem ou chuvisco; a tela ilumina o que está à frente.</p></section>`;
  const progress = screen.progress ?? { enabled: false, mode: 'loop', value: .4, speed: .25 };
  const lines = screen.kind === 'text' ? `<div class="control-group"><span class="eyebrow">LINHAS · ATÉ ${SCREEN_LIMITS.lines}</span>${screen.lines.map((line, i) => `
      <div class="screen-line"><label class="field"><span class="field-label">Linha ${i + 1}</span><input type="text" maxlength="${SCREEN_LIMITS.chars}" data-field="screen-line-${i}-text" value="${esc(line.text)}" /></label>
      ${numberField(`screen-line-${i}-size`, 'Tamanho · % da altura', Math.round(line.size * 100), { min: 5, max: 50, step: 1 })}
      ${choiceField(`screen-line-${i}-align`, 'Alinhamento', line.align, SCREEN_ALIGN)}
      ${choiceField(`screen-line-${i}-anim`, 'Animação', line.anim, SCREEN_ANIMS)}
      <button data-action="screen-line-remove" data-index="${i}" class="quiet">Remover linha ${i + 1}</button></div>`).join('')}
      ${screen.lines.length < SCREEN_LIMITS.lines ? '<button data-action="screen-line-add" class="wide">Adicionar linha</button>' : ''}</div>` : '';
  const image = screen.kind === 'image' ? `<label class="field"><span class="field-label">Imagem da biblioteca</span><select data-field="screen-imageRef">${imageAssets.length ? '' : '<option value="">Nenhuma imagem importada</option>'}${imageAssets.map(asset => { const value = `${asset.id}@${asset.revision ?? 1}`; return `<option value="${esc(value)}" ${screen.imageRef && `${screen.imageRef.id}@${screen.imageRef.revision}` === value ? 'selected' : ''}>${esc(asset.name)}</option>`; }).join('')}</select></label>` : '';
  return `<section><span class="eyebrow">TELA</span>${checkField('screen-enabled', 'Tela acesa', screen.enabled)}
    ${screen.enabled ? `${choiceField('screen-kind', 'Conteúdo', screen.kind, SCREEN_KINDS)}${lines}${image}
    <div class="control-group"><span class="eyebrow">CORES</span>${colorField('screen-color', 'Cor do texto e da barra', screen.color)}${colorField('screen-background', 'Fundo', screen.background)}</div>
    <div class="control-group"><span class="eyebrow">BARRA DE PROGRESSO</span>${checkField('screen-progress-enabled', 'Mostrar barra', progress.enabled)}
      ${progress.enabled ? `${choiceField('screen-progress-mode', 'Comportamento', progress.mode, SCREEN_PROGRESS_MODES)}
      ${progress.mode === 'fixed' ? numberField('screen-progress-value', 'Preenchimento · %', Math.round(progress.value * 100), { min: 0, max: 100, step: 5 }) : numberField('screen-progress-speed', 'Velocidade · ciclos por segundo', progress.speed, { min: SCREEN_LIMITS.speed[0], max: SCREEN_LIMITS.speed[1], step: .01 })}` : ''}</div>
    <div class="control-group"><span class="eyebrow">EFEITO DE TUBO</span>${numberField('screen-scanlines', 'Efeito de tubo · %', Math.round(screen.scanlines * 100), { min: 0, max: 100, step: 5 })}${numberField('screen-flicker', 'Cintilação · %', Math.round(screen.flicker * 100), { min: 0, max: 100, step: 5 })}
      ${numberField('screen-seed', 'Variação do ruído · semente', screen.seed, { min: 0, max: 65535, step: 1 })}</div>
    <p class="microcopy">A tela acesa liga a luz própria do modelo, com a cor média do que mostra. "Pausar efeitos animados", em Ambiente, congela o conteúdo animado e o chuvisco.</p>` : '<p class="microcopy">Tela apagada: o conteúdo fica guardado e volta ao acender.</p>'}</section>`;
}
