# Galpão industrial — microplano de implementação

Detalha, para execução, tudo o que falta do [plano](GALPAO_INDUSTRIAL_PLANO.md): resíduos do item 3, itens 1, 2, 4, 5, 6 e 7. Escrito em 14 de outubro de 2026 a partir da leitura do código. Números de linha são aproximados (estado da árvore nessa data); confirme com busca antes de editar.

## Como usar este documento

- Execute na ordem da seção **Ordem de execução**. Cada etapa termina com testes verdes e registro em `progress.md`.
- **Nenhum critério de aceite pode ser omitido.** Cada item tem uma tabela "critério → solução → prova". Se algo não puder ser feito como descrito, não simplifique em silêncio: registre na subseção **Diferenças em relação ao plano** de `docs/GALPAO_INDUSTRIAL_PLANO.md`, com o motivo, como foi feito no item 3.
- Toda funcionalidade é geral (Propriedades, Ambiente, Construir); nenhum código específico desta cena.
- Rotina de cada etapa: unitários (`npm test`), E2E da interface tocada (`node --test --test-concurrency=1 tests/e2e/<arquivo>.test.js`), conferência em imagem na GPU (`npm run build && node scripts/capture-industrial.js <dir>`), registro em `progress.md` no formato da seção "Kit industrial e cabos pendentes".

## Ordem de execução

1. **Item 1** (tela) e **item 2** (decalques + listras de alerta). Infraestrutura comum: `imageRef` no servidor, no navegador e na apresentação (feita uma vez, no item que vier primeiro).
2. **Resíduos do item 3** (sombra só em alta, encaixe das pontas, cabos no estado abandonado/futurista).
3. **Item 4, degrau 1** (molhado no material), **item 5** (risco anamórfico), **item 6** (faíscas e gotejamento).
4. **Item 4, degrau 2** (reflexo de tela). Ponto de decisão: medir antes de manter (ver 4.2).
5. **Item 7** (cena pronta e tutorial).

## Decisões transversais

| Decisão | Por quê (verificado no código) |
|---|---|
| Tela e decalque são **campos opcionais de `prop`**, como `cable`. | `cable` já segue esse caminho (`src/domain/validation.js:176`, `:207`); herda seleção, desfazer, grupos, camadas, duplicação e apresentação. |
| O `hostId` do decalque fica em **`anchor.hostId`**, com o novo socket `'surface'`. | `refreshAnchors` (`src/state/commands.js:266`) roda depois de todo comando que mexe em posição (`commands.js:618-619`); `anchor.hostId` já é remapeado ao duplicar (`commands.js:148`, `src/domain/documents.js:201`), removido em cascata (`dependentIds`, `commands.js:91`) e filtrado na apresentação (`src/app/presentation.js:29`). "Acompanha a parede" sai do mecanismo existente. |
| Imagem referenciada por **`imageRef: {id, revision}`** (asset `type:'image'`). | Só `assetRef` é varrido hoje. Três lugares passam a conhecer `imageRef`: `server/app.js:28`, `src/data/browser-repository.js:68` e `presentationAssets` em `src/app/presentation.js:65-72`. Sem o último, **a imagem não chega à apresentação**. |
| Migração: **nenhuma mudança** em `src/domain/migrations.js`. | Campos novos são opcionais; schema continua 2. Documentos antigos validam iguais (testar). |
| Tempo de toda animação nova = **`effectTime`** do renderer (`src/render/renderer.js:307-309`). | Já para com `look.effectsPaused` ("Pausar efeitos animados", `src/ui/lighting-panels.js:9`), `prefers-reduced-motion` e aba oculta. |
| Configurações de renderização novas vão em **`look.rendering`** / **`look.bloom`**. | `RENDERING_DEFAULTS` (`src/domain/dynamic-lighting.js:18`) e o validador genérico (`validation.js:382-387`) já cobrem; o painel está em `src/ui/dynamic-lighting-panel.js:29-36`. |

---

# ITEM 1 — Tela com conteúdo

## 1.A Arquivos

**Criar**: `src/domain/screens.js` (schema, defaults, validação, funções puras de tempo), `src/render/screens.js` (pool de `CanvasTexture`, desenho, shader de tubo, cor média, limite de 10 FPS), `src/ui/screen-panel.js`, `tests/screens.test.js`, `tests/e2e/screens-decals.test.js` (compartilhado com o item 2).

**Modificar**

| Arquivo | Onde | O quê |
|---|---|---|
| `src/domain/validation.js` | l.1 imports; l.176 campos de `prop`; após l.207 | `'screen'` nos campos; `validateScreen`; recusar em cabo/decalque |
| `src/domain/documents.js` | `createEntity` ~l.72 | `...(options.screen ? { screen: clone(options.screen) } : {})` |
| `src/domain/dynamic-lighting.js` | `LIGHT_PROFILES` l.3-10 | `{ id:'screen', name:'Tela / monitor', color:'#9cc3ff', intensity:8, distance:3.5, type:'point' }` |
| `src/render/bound-light.js` | `applyBoundEmission` l.8-13; `updateBoundLights` l.16, l.25 | pular slot `screen` quando `record.screen?.enabled`; parâmetro `screenLight` |
| `src/render/renderer.js` | l.155 criação; ~l.700-701 `shapeFields`/`shapeKey`; l.307-317 loop; l.354-355 reagendar; ~l.1452 `getInfo`; API ~l.1441 | runtime; tirar `screen` da chave de reconstrução; `screens.update`; temporizador de 100 ms; diagnóstico; `getSlotFrame` |
| `src/app/presentation.js` | `presentationAssets` l.65-72 | incluir `entity.screen?.imageRef` (e `entity.decal?.imageRef`) |
| `server/app.js` l.28; `src/data/browser-repository.js` l.68 | `visit` | `if (value.imageRef) references.set(\`${value.imageRef.id}:${value.imageRef.revision}\`, value.imageRef);` |
| `src/app/application.js` | l.26 imports; l.923 inspector; ~l.1699 handler; ações ~l.2003 | `screenPanel`; campos `screen-*`; `screen-line-add` / `screen-line-remove` |

## 1.B Dados

```js
// src/domain/screens.js
export const SCREEN_KINDS = [['text','Texto'],['image','Imagem'],['static','Chuvisco']];
export const SCREEN_ALIGN = ['left','center','right'];
export const SCREEN_ANIMS = [['none','Fixo'],['dots','Reticências'],['cursor','Cursor piscando']];
export const SCREEN_DEFAULTS = Object.freeze({
  enabled: true, kind: 'text',
  lines: [ { text: 'BOOTING', size: .2, align: 'left', anim: 'dots' },
           { text: 'SYS 4.2', size: .12, align: 'left', anim: 'cursor' } ],
  color: '#7dffb0', background: '#031008',
  progress: { enabled: true, mode: 'loop', value: .4, speed: .25 },  // loop: ciclos/s; fixed: usa value
  imageRef: null,                                                     // { id, revision } de asset type 'image'
  scanlines: .5,   // intensidade do efeito de tubo (linhas + curvatura + ruído), 0–1
  flicker: .15,    // 0–1
  seed: 1,
});
export const screenDefaults = (patch = {}) => ({ ...structuredClone(SCREEN_DEFAULTS), ...patch });
```

**`validateScreen(screen, path)`**, chaves estritas no padrão de `validateCable` (`src/domain/cables.js:18`):
- `enabled` booleano; `kind` ∈ ids de `SCREEN_KINDS`.
- `lines`: array de 0 a 6; cada item com chaves exatas `{text,size,align,anim}`; `text` string de 0 a 40 caracteres; `size` ∈ [.05,.5]; `align` ∈ `SCREEN_ALIGN`; `anim` ∈ ids de `SCREEN_ANIMS`.
- `color`, `background` `#RRGGBB`.
- `progress`: `null` ou `{enabled, mode:'loop'|'fixed', value:[0,1], speed:[.02,2]}`.
- `imageRef`: `null` ou `{id, revision}` (mesma regra de `assetRef`, `validation.js:115`); **obrigatório se `kind==='image'`**.
- `scanlines`, `flicker` ∈ [0,1]; `seed` inteiro em [0,65535].

Em `validation.js`, após l.207:
```js
if (value.screen !== undefined) {
  fail(value.kind === 'prop' && !value.cable && !value.decal, 'Só modelos com tela aceitam conteúdo de tela.', `${path}.screen`);
  validateScreen(value.screen, `${path}.screen`);
}
```
A presença do slot `screen` não está no catálogo; é verificada em tempo de execução: a UI só mostra a seção quando o slot existe e o renderer ignora a tela (com diagnóstico) num modelo sem slot.

**Funções puras** (testáveis sem GPU):
```js
export const screenContentKey = s => JSON.stringify([s.kind, s.lines, s.color, s.background, s.progress, s.imageRef]); // tubo e cintilação ficam fora: são uniforms
export const screenAnimated = s => s.enabled && (s.kind === 'static' || s.progress?.enabled && s.progress.mode === 'loop' || s.lines.some(l => l.anim !== 'none'));
export const screenFrame = (s, t) => screenAnimated(s) ? Math.floor(t * 10) : 0;      // muda no máximo 10×/s
export const dotsAt = t => Math.floor(t * 2.5) % 4;
export const cursorAt = t => (t * 1.6) % 1 < .5;
export const progressAt = (p, t) => !p?.enabled ? null : p.mode === 'fixed' ? p.value : Math.min(1, ((t * p.speed) % 1) * 1.15);
```

**`screenFieldPatch(record, field, value, slotFrame)`** → `{ screen, illumination? }`:
- `enabled` → `true` com `record.illumination == null`: `illumination = { ...illuminationDefaults('screen', record), position: slotFrame.lightPosition, shadowPolicy: 'off', emissionSlot: 'none' }`. Sombra desligada: uma pontual custa 6 vistas do orçamento (`selectLightBudget`).
- `enabled` → `false`: se `illumination?.profile === 'screen'`, `illumination: { ...record.illumination, enabled: false }`.
- `line-${i}-${key}`, `progress-${key}`, `imageRef` (valor `id@revision`), `kind`, `color`, `background`, `scanlines`, `flicker`: atualização imutável. Percentuais da UI divididos por 100 aqui.

## 1.C Motor

**Onde a tela está.** Todos os modelos de tela têm o slot `screen` como caixa chanfrada (`craftedBox` → `chamferBox`, `src/render/crafted-geometry.js:37-55`), com UV `(x/size.x+.5, y/size.y+.5)`: a face frontal +Z já tem UV planar 0–1 na orientação certa. Com `mergeParts` (`src/render/asset-cache.js:99-122`) várias telas viram uma malha, cada uma com seu 0–1 (o mesmo conteúdo aparece em todas, como nos três monitores do console). Se a malha não tiver `uv` ou ele for todo zero (`asset-cache.js:105` cria zeros), gerar UV planar pela `boundingBox`, projetando nos dois eixos de maior extensão.

**Runtime** `src/render/screens.js`:
```js
export const screenClock = { value: 0 };   // UM uniform compartilhado por todas as telas
export function createScreenRuntime({ loadImage, createCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }) }) {
  const pool = new Map();   // contentKey → { key, screen, canvas, ctx, texture, refs, frame:-1, lastDraw:-Infinity, draws:0, average:THREE.Color, luma, image, animated }
  const bound = new Map();  // entityId → { object, key, screen, materials:[{ material, saved }] }
  return { update, lightFor, slotFrame, info, dispose };
}
```
- **Pool**: `acquire(screen)` procura `screenContentKey`; se existe `refs++`; senão canvas **512×384** (256×192 quando `softwareRenderer`), `THREE.CanvasTexture` (`colorSpace = SRGBColorSpace`, `minFilter = LinearFilter`, `generateMipmaps = false`, `userData.tabletopShared = true` para `disposeObject` não destruí-la). `release` → `refs--`; em 0, `texture.dispose()` e `pool.delete`. Conteúdo idêntico = um canvas e uma textura.
- **Vínculo** `bind(id, object, screen)`: malhas com `(material.name || userData.materialSlot) === 'screen'`; guardar `saved = { color, emissive, emissiveIntensity, emissiveMap, roughness, metalness, onBeforeCompile, customProgramCacheKey }`; aplicar:
  ```js
  m.emissiveMap = entry.texture; m.emissive.set('#ffffff'); m.emissiveIntensity = 1.6;
  m.color.set('#06090a'); m.roughness = .18; m.metalness = 0;
  m.userData.screen = `${key}|${s.scanlines}|${s.flicker}|${s.seed}`;   // entra na chave do material-sharing
  installTubeShader(m, s); m.needsUpdate = true;
  ```
  `unbind` restaura `saved`. Em `update`, se `m.emissiveMap !== entry.texture` (outro passe sobrescreveu), reaplicar.
- **Sem reconstruir o modelo**: em `setDocument`, tirar `screen` de `shapeFields`/`shapeKey` (~l.700-701, a mesma lista que exclui `illumination`). O runtime sincroniza por quadro no estilo de `updateBoundLights` (cache pela identidade congelada de `document.layout.entities`; chave mudou → `unbind`/`bind`).

**Desenho (sem estado) e limite de 10 FPS**:
```js
function draw(entry, t) {
  const { ctx } = entry, W = entry.canvas.width, H = entry.canvas.height, s = entry.screen;
  ctx.fillStyle = s.background; ctx.fillRect(0, 0, W, H);
  if (s.kind === 'static') {             // chuvisco: célula de 4 px, semente = quadro
    const f = Math.floor(t * 10), img = ctx.createImageData(W / 4, H / 4);
    for (let i = 0; i < img.data.length; i += 4) { const v = hash(i, f, s.seed) * 255; img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = 255; }
    ctx.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(entry.canvas, 0, 0, W/4, H/4, 0, 0, W, H);
  } else if (s.kind === 'image' && entry.image) {      // letterbox
    const k = Math.min(W / entry.image.width, H / entry.image.height);
    ctx.drawImage(entry.image, (W - entry.image.width*k)/2, (H - entry.image.height*k)/2, entry.image.width*k, entry.image.height*k);
  }
  if (s.kind === 'text') {
    let y = H * .12; ctx.fillStyle = s.color; ctx.textBaseline = 'top';
    for (const line of s.lines) {
      const px = Math.round(line.size * H); ctx.font = `bold ${px}px "Courier New", monospace`; ctx.textAlign = line.align;
      const text = line.text + (line.anim === 'dots' ? '.'.repeat(dotsAt(t)) : '') + (line.anim === 'cursor' && cursorAt(t) ? '_' : '');
      ctx.fillText(text, { left: W*.08, center: W/2, right: W*.92 }[line.align], y, W*.84); y += px * 1.25;
    }
  }
  const p = progressAt(s.progress, t);
  if (p != null) { const x = W*.08, w = W*.84, h = H*.07, y = H*.8; ctx.strokeStyle = ctx.fillStyle = s.color; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h); ctx.fillRect(x+5, y+5, (w-10)*p, h-10); }
  sampleAverage(entry); entry.texture.needsUpdate = true; entry.draws++;
}
function update(document, objects, t, paused, now) {
  screenClock.value = t; syncBindings(document, objects);
  let animated = false;
  for (const entry of pool.values()) {
    const frame = screenFrame(entry.screen, t);
    if (frame !== entry.frame && now - entry.lastDraw >= 100) { draw(entry, t); entry.frame = frame; entry.lastDraw = now; }
    animated ||= entry.animated && !paused;
  }
  return animated;
}
```
Limite duplo: `screenFrame` muda no máximo 10×/s, e a guarda `now - lastDraw >= 100` vale **por conteúdo** (não por tela).

**Loop** (`renderer.js:310-312`): `const animatedScreens = diagnostics.measure('screens', () => screens.update(sceneDocument, objects, effectTime, paused, now));`. No fim de `render()` (l.354-355) **não zerar `lastFrameTime`** quando só as telas animam (zeraria o `elapsed` e o tempo pararia):
```js
if ((moving || orbitChanged || animatedLights || animatedAtmosphere || animatedLocalEffects || animatedWater) && !document.hidden) invalidate();
else if (animatedScreens && !document.hidden) screenTimer ??= setTimeout(() => { screenTimer = null; invalidate(); }, 100);
else lastFrameTime = null;
```
Limpar `screenTimer` em `destroy()` (~l.1462, junto de `clearTimeout(probeTimer)`).

**Pausa**: com `paused`, `effectTime` não avança → `screenFrame` constante → sem redesenho; `screenClock` fixo (ruído e cintilação param); `animated=false` e o loop deixa de agendar.

**Shader de tubo** (substitui o chunk `emissivemap_fragment` do three r186):
```js
function installTubeShader(m, s) {
  const prior = m.onBeforeCompile;
  m.onBeforeCompile = (shader, r) => {
    prior?.call(m, shader, r);
    Object.assign(shader.uniforms, { screenTime: screenClock, screenTube: { value: s.scanlines }, screenFlicker: { value: s.flicker }, screenSeed: { value: s.seed } });
    shader.fragmentShader = 'uniform float screenTime, screenTube, screenFlicker, screenSeed;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', `
#ifdef USE_EMISSIVEMAP
  vec2 cc = vEmissiveMapUv * 2.0 - 1.0;
  cc *= 1.0 + screenTube * 0.10 * dot(cc, cc);                         // curvatura leve (barril)
  vec2 suv = cc * 0.5 + 0.5;
  float inside = step(0.0, suv.x) * step(suv.x, 1.0) * step(0.0, suv.y) * step(suv.y, 1.0);
  vec3 tube = texture2D(emissiveMap, suv).rgb * inside;
  tube *= mix(1.0, 0.6 + 0.4 * (0.5 + 0.5 * sin(suv.y * 240.0 * 6.2831853)), screenTube);   // ~240 linhas
  float grain = fract(sin(dot(floor(suv * vec2(320.0, 240.0)) + floor(screenTime * 24.0) + screenSeed, vec2(12.9898, 78.233))) * 43758.5453);
  tube += (grain - 0.5) * 0.10 * screenTube;
  float vignette = smoothstep(0.0, 0.18, min(min(suv.x, 1.0 - suv.x), min(suv.y, 1.0 - suv.y)));
  float dip = step(0.92, fract(sin(floor(screenTime * 8.0) * 91.3 + screenSeed) * 4375.85));
  float flick = 1.0 - screenFlicker * (0.06 + 0.06 * sin(screenTime * 60.0) + 0.35 * dip);
  totalEmissiveRadiance *= max(tube, 0.0) * mix(1.0, vignette, screenTube) * flick;
#endif`);
  };
  m.customProgramCacheKey = () => `screen-v1:${prior ? 'chained' : ''}`;
}
```
`screenClock` é o mesmo objeto em todos os materiais: o `material-sharing` (`src/render/material-sharing.js:24`), que troca materiais equivalentes durante o quadro, não congela o tempo de ninguém; só funde materiais com o mesmo `userData.screen`.

**Cor média → luz própria**:
```js
const probe = createCanvas(8, 6), pctx = probe.getContext('2d', { willReadFrequently: true });
function sampleAverage(entry) {
  pctx.drawImage(entry.canvas, 0, 0, 8, 6); const d = pctx.getImageData(0, 0, 8, 6).data;
  const lin = c => (c/255) <= .04045 ? c/255/12.92 : ((c/255 + .055)/1.055) ** 2.4;
  let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += lin(d[i]); g += lin(d[i+1]); b += lin(d[i+2]); }
  const n = d.length / 4; r /= n; g /= n; b /= n; entry.luma = .2126*r + .7152*g + .0722*b;
  const peak = Math.max(r, g, b, 1e-4); entry.average.setRGB(r/peak, g/peak, b/peak, THREE.LinearSRGBColorSpace);
}
const lightFor = id => { const b = bound.get(id); if (!b) return null; const e = pool.get(b.key);
  return b.screen.enabled && e ? { color: e.average, scale: THREE.MathUtils.clamp(e.luma / .12, .25, 1) } : { color: null, scale: 0 }; };
```
- `src/render/bound-light.js:16`: assinatura `updateBoundLights(document, objects, bindings, seconds, paused, isVisible, generation, screenLight = () => null)`. Na l.25:
  ```js
  const tint = screenLight(record.id); if (tint?.color) source.color.copy(tint.color); else source.color.set(config.color);
  updateLightEffects([wrapper], seconds, paused); if (tint) source.intensity *= tint.scale;
  ```
- `applyBoundEmission` l.10-11, após `const slot=…`: `if (record?.screen?.enabled && slot === 'screen') continue;` (senão a luz própria pinta a tela de `config.color`).
- `renderer.js:315`: passar `screens.lightFor`.
- **Posição da luz**: API nova `viewport.getSlotFrame(id, 'screen')` → `Box3` das malhas `screen` no espaço local do objeto da entidade (`object.worldToLocal`); normal = eixo de menor extensão do box, sinal `sign(center[axis] - objectBox.center[axis])`; `lightPosition = center + normal * .3` (espaço local do host, como `bound-light.js:24` espera).

**Apresentação**: o projetor usa o mesmo `createViewport` com `projectPresentation` + `presentationAssets`; `screen` atravessa o `structuredClone`. Ajuste obrigatório:
```js
for (const entity of Object.values(document.layout.entities)) { include(entity.assetRef); include(entity.screen?.imageRef); include(entity.decal?.imageRef); }
```
A fase da animação no projetor parte do `effectTime` dele (como o flicker das luzes): mesmo conteúdo e estilo, quadro instantâneo pode diferir. Registrar como diferença.

## 1.D Interface

- `src/ui/screen-panel.js`: `export function screenPanel(record, slots, imageAssets, { numberField, colorField, checkField, choiceField })`. Retorna `''` se `!slots.includes('screen')` ou `record.cable || record.decal`. Sem `record.screen`: só checkbox **"Tela acesa"** (`screen-enabled`). Com tela: `choiceField('screen-kind')`; por linha `<input type="text" maxlength="40" data-field="screen-line-${i}-text">`, `numberField('screen-line-${i}-size','Tamanho · % da altura',size*100,{min:5,max:50,step:1})`, `choiceField` de alinhamento e animação; botões `screen-line-add` (até 6) e `screen-line-remove`; `colorField('screen-color')`, `colorField('screen-background')`; barra: `screen-progress-enabled`, `-mode`, `-value`, `-speed`; imagem: `<select data-field="screen-imageRef">` de `imageAssets`; "Efeito de tubo · %" (`screen-scanlines`), "Cintilação · %" (`screen-flicker`).
- Injeção em `application.js:923`: `+ screenPanel(record, viewport.getMaterialSlots(record.id), assets.filter(a => a.type === 'image'), {...})`. O slot só existe após o modelo carregar; o re-render já ocorre via `onMaterialSlots` (`application.js:310`).
- Handler junto de `cable-` (~l.1699): `else if (field.startsWith('screen-')) Object.assign(patch, screenFieldPatch(record, field.slice(7), value, viewport.getSlotFrame(record.id, 'screen')));`. Campos de texto: seguir o caminho de `object-name` (l.1680).

## 1.E Aceite e testes

| Critério | Solução | Prova |
|---|---|---|
| Duas linhas e uma barra, legível a 2 m | canvas 512×384, linhas de 20 % e 12 % da altura, fonte bold mono | captura `screen-2m.png` revisada |
| Ilumina a mesa | perfil `screen`, posição no normal do slot, cor média | E2E: `illumination.profile==='screen'`; `stats().screens[0].average` não preto |
| Pausa congela | `effectTime` parado → quadro constante | E2E: `draws` estável 1,5 s com `effects-paused` |
| Salvar e reabrir preserva | campo validado + `imageRef` no servidor | unitário de ida e volta + E2E com reload |
| Apresentação mostra igual | mesmo renderer + `imageRef` em `presentationAssets` | unitário + E2E `action('present')` |
| Custo por tela | pool por conteúdo + 10 FPS | unitário: 2 telas iguais → `pool.size===1`; t de 0 a 1 s em passos de 16 ms → `draws ≤ 11` |

**`tests/screens.test.js`** (modelo `tests/cables.test.js`): (1) defaults passam; recusa chave extra, 7 linhas, 41 caracteres, `size:.9`, `#fff`, `image` sem `imageRef`, `speed:0`; (2) `entity.add` de `crt-tv` com `screen` valida, em `builtin-industrial-cable` lança; (3) `screenFrame` pura, `dotsAt` 0→3, `progressAt` em [0,1], `fixed` devolve `value`; (4) `screenContentKey` ignora `scanlines`; (5) `screenFieldPatch` liga/desliga luz `profile:'screen'` com `shadowPolicy:'off'`; (6) `presentationAssets` inclui `imageRef`; documento antigo valida; (7) runtime com `createCanvas` falso (stub 2D que conta `fillRect`; `getImageData` fixo), importado em Node como `tests/material-sharing.test.js` faz: pool compartilhado e limite de 10/s.

**`tests/server.test.js`**: salvar documento com `screen.imageRef` inexistente → `422 MISSING_ASSET`.

**E2E `tests/e2e/screens-decals.test.js`** (esqueleto de `tests/e2e/cables.test.js`): sala rápida; `crt-tv` pela biblioteca; seção Tela presente (ausente num `builtin-crate`); ligar; editar linhas; esperar `stats().screens[0].draws` crescer; `effects-paused` → `draws` igual após 1,5 s, desligar → volta a crescer; Ctrl+Z; salvar, recarregar, comparar `screen`; `action('present')` sem `pageerror`.

**Diagnóstico** em `getInfo()` (`renderer.js:1452`): `screens: [{ id, key, frame, draws, average:'#hex', luma, pool }]`.

---

# ITEM 2 — Decalques e material "Listras de alerta"

## 2.A Arquivos

**Criar**: `src/domain/decals.js` (`DECAL_ASSET='builtin-decal'`, defaults, `validateDecal`, `decalPlacement`, `decalAnchorFromWorld`, `decalFieldPatch`), `src/render/decals.js` (`createDecalInstance`, pool de textura de texto, shader de desgaste), `src/ui/decal-panel.js`, `tests/decals.test.js`; casos de listras em `tests/surface-families.test.js`.

**Modificar**

| Arquivo | Onde | O quê |
|---|---|---|
| `src/domain/validation.js` | l.145-161 `semanticReferences`; l.176; após l.207; l.94-105 `surfaceFields` | socket `'surface'`; campo `decal`; cores das listras |
| `src/state/commands.js` | `semanticPlacement` l.74-79 | ramo `socket==='surface'` com matriz completa do host |
| `src/domain/documents.js` | `createEntity` ~l.72 | `...(options.decal ? { decal: clone(options.decal) } : {})` |
| `src/domain/materials.js` | l.2-23, 25-59 | preset `hazard` + campos da família |
| `src/render/surface-pixels.js` | `switch`, antes de `case 'snow'` (~l.221) | `case 'hazard'` |
| `src/render/surface-materials.js` | `customization` l.118-128; `applySurfaceMaterial` l.139, l.147 | ângulo somado à rotação; `surfaceSize = 2*hazardWidth` |
| `src/ui/material-panels.js` | após bloco `paint` (~l.44) | controles das listras |
| `src/render/renderer.js` | l.182 `instanceOf`; l.111 opções; l.626-645 `updateCutaway`; ~l.1158 `onPointerUp`; `setTool`; `getInfo` | instância; `onSurfacePlace`; esconder com a parede; ferramenta `decal` |
| `src/app/application.js` | l.546 `setTool`; l.686 Peças avulsas; l.316-322 `onTransform`; l.617 biblioteca; l.909, 913, 920-923 inspector; ~l.1699 handler; ~l.2003 ações | ferramenta, botão, arrasto, painel |
| `src/app/presentation.js`, `server/app.js`, `src/data/browser-repository.js` | | `decal.imageRef` (mesmo ajuste do item 1) |
| `scripts/library-industrial.js` | perto de l.139 `model('cable'…)`; l.91 `hazard-band` | `model('decal','Decalque','Sinalização',…)` como placa fina (miniatura e reserva); `hazard-band` com `surface:{texture:'hazard'}` nas peças listradas. Rodar `node scripts/generate-library.js` |

## 2.B Dados

```js
export const DECAL_ASSET = 'builtin-decal';
export const DECAL_KINDS = [['text','Texto'],['image','Imagem'],['surface','Faixa de material']];
export const DECAL_FONTS = [['stencil','Estêncil'],['sans','Sem serifa'],['mono','Terminal']];
export const DECAL_DEFAULTS = Object.freeze({
  kind: 'text', size: [1.6, .4],                 // metros no plano
  text: 'SETOR 7', font: 'stencil', textColor: '#e9e2cf', background: null,   // null = transparente
  imageRef: null, opacity: 1,
  wear: { faded: .2, scratched: .15, seed: 1 },
});
```
Entidade: `{ kind:'prop', assetRef:{id:'builtin-decal',revision:1}, footprint:[size[0], .02], transform:{…, scale:[1,1,1]}, decal:{…}, anchor:{ hostId, socket:'surface', offset:[x,y,z], rotation:[qx,qy,qz,qw] }, material:{…} }`. O `hostId` do plano **é** `anchor.hostId`.

**`validateDecal`**: chaves estritas; `kind` ∈ ids; `size` 2 números em [.02,30]; `text` 0–80 caracteres; `font` ∈ ids; `textColor` hex; `background` `null`|hex; `imageRef` `null`|`{id,revision}` (**obrigatório em `image`**); `opacity` [0,1]; `wear` chaves exatas, `faded`/`scratched` [0,1], `seed` inteiro [0,65535].

Após l.207:
```js
if (value.decal !== undefined) {
  fail(value.kind === 'prop' && value.assetRef?.id === DECAL_ASSET, 'Só o objeto Decalque aceita ajustes de decalque.', `${path}.decal`);
  validateDecal(value.decal, `${path}.decal`);
  fail(value.anchor?.socket === 'surface', 'O decalque precisa estar colado numa superfície.', path);
  fail(value.transform.scale.every(v => Math.abs(v - 1) < 1e-8), 'O tamanho do decalque fica em decal.size.', path);
}
```
Socket em `semanticReferences` (l.147-161):
```js
choice(value.anchor.socket, ['wall', 'ceiling', 'surface'], `${path}.anchor.socket`);
if (value.anchor.socket === 'surface') {
  fail(value.decal !== undefined, 'Somente decalques usam fixação em superfície.', path);
  fail(['wall', 'floor', 'prop'].includes(host.kind) && !host.decal, 'Decalque cola em parede, piso ou objeto (não em outro decalque).', path);
  fail(value.anchor.rotation !== undefined, 'Fixação em superfície exige orientação.', path);
  value.anchor.offset.forEach(v => number(v, path, -1000, 1000));
} else { /* l.154-161 atuais, inalteradas */ }
```

## 2.C Motor

**Captura do clique** (renderer, ferramenta nova `'decal'`, em `onPointerUp` ~l.1158 ao lado de `tool === 'place'`):
```js
} else if (tool === 'decal') {
  rayFromEvent(event);
  const hit = raycaster.intersectObjects(pickCandidates(), true).find(h => h.object.userData.entityId && !h.object.userData.decorative && !h.object.userData.decal && visibleInHierarchy(h.object));
  const host = records.get(hit?.object.userData.entityId);
  if (!hit || !host || !['wall', 'floor', 'prop'].includes(host.kind) || host.decal) { report('Clique numa parede, piso ou objeto visível.'); return; }
  const n = new THREE.Vector3(...surfaceNormal(hit));                // surfaceNormal existe (l.1193)
  if (n.dot(raycaster.ray.direction) > 0) n.negate();                // DoubleSide: face de trás → vira para a câmera
  onSurfacePlace({ hostId: host.id, point: hit.point.toArray(), normal: n.toArray() });
}
```
Adicionar `onSurfacePlace = () => {}` às opções de `createViewport` (l.111); cursor `crosshair` em `setTool`.

**Matemática** (`src/domain/decals.js`; o domínio já importa three em `src/domain/assemblies.js:1`):
```js
import { Matrix4, Quaternion, Vector3 } from 'three';
import { transformMatrix } from './assemblies.js';
/** +Z do decalque = normal; +Y = "cima" legível; +X = Y × Z. */
export function decalFrame(normal, hostRotation) {
  const z = new Vector3(...normal).normalize();
  const up = Math.abs(z.y) > .95 ? new Vector3(0, 0, -1).applyQuaternion(new Quaternion(...hostRotation)) : new Vector3(0, 1, 0); // piso/teto: alinha ao cômodo
  const x = new Vector3().crossVectors(up, z).normalize(), y = new Vector3().crossVectors(z, x);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z)).normalize();
}
export function decalPlacement(host, point, normal) {
  const hostQ = new Quaternion(...host.transform.rotation), world = decalFrame(normal, host.transform.rotation);
  const offset = new Vector3(...point).applyMatrix4(transformMatrix(host.transform).invert()).toArray();
  const rotation = hostQ.clone().invert().multiply(world).normalize().toArray();
  return { position: [...point], rotation: world.toArray(), anchor: { hostId: host.id, socket: 'surface', offset, rotation } };
}
```
Funciona nos três tipos de host: **parede** (gira só em Y, escala 1, origem no início — redimensionar o comprimento não desloca o decalque); **piso** (origem na face de cima; ponto na face de baixo fica com y negativo → decalque de teto); **modelo** (matriz completa com escala não uniforme; faces de caixa continuam alinhadas aos eixos locais).

**Seguir o host** — `semanticPlacement` (`commands.js:74`), antes do cálculo atual de `offset`:
```js
if (record.anchor.socket === 'surface') {
  const p = new Vector3(...record.anchor.offset).applyMatrix4(transformMatrix(anchorHost.transform));
  record.transform.position = p.toArray();
  record.transform.rotation = multiplyQuaternions(anchorHost.transform.rotation, record.anchor.rotation);
  return;
}
```
(`transformMatrix` já é importado de `../domain/assemblies.js` na l.3; importar `Vector3` de `three`.) `refreshAnchors` resolve o host antes do dependente (`commands.js:273`): vale para `entity.update`, `assembly.transform`, `level.move` e cadeias parede → prop → decalque.

**Arrastar o decalque**: hoje o gizmo de objeto ancorado volta ao lugar. Em `onTransform` (`application.js:316`), antes do `execute`:
```js
if (found.record.decal && found.record.anchor?.socket === 'surface') {
  const host = store.document.layout.entities[found.record.anchor.hostId];
  execute('entity.update', { id: objectId, patch: { anchor: decalAnchorFromWorld(host, found.record.anchor, transform) }, snap: false }); return;
}
```
```js
export function decalAnchorFromWorld(host, anchor, transform) {   // desliza no plano e gira em torno da normal
  const local = new Vector3(...transform.position).applyMatrix4(transformMatrix(host.transform).invert());
  const nLocal = new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...anchor.rotation)), base = new Vector3(...anchor.offset);
  local.sub(nLocal.clone().multiplyScalar(local.clone().sub(base).dot(nLocal)));
  const relative = new Quaternion(...host.transform.rotation).invert().multiply(new Quaternion(...transform.rotation));
  const twist = new Quaternion(...anchor.rotation).invert().multiply(relative), angle = 2 * Math.atan2(twist.z, twist.w);
  return { ...anchor, offset: local.toArray(), rotation: new Quaternion(...anchor.rotation).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), angle)).normalize().toArray() };
}
```

**Renderização sem cintilar** (`src/render/decals.js`):
```js
export const DECAL_LIFT = .002;   // 2 mm no +Z do decalque (espaço do decalque: imune à escala do host)
export function createDecalInstance(entity, { textTexture, imageTexture }) {
  const d = entity.decal, group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff', map: d.kind === 'text' ? textTexture(d) : d.kind === 'image' ? imageTexture(d.imageRef) : null,
    roughness: .82, metalness: 0, transparent: true, opacity: d.opacity,
    depthWrite: false, depthTest: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4, side: THREE.FrontSide,
  });
  installDecalWear(material, d);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.size[0], d.size[1]), material);
  mesh.position.z = DECAL_LIFT; mesh.renderOrder = 2; mesh.castShadow = false; mesh.receiveShadow = true;
  mesh.userData.materialSlot = 'base'; mesh.userData.decal = true;
  group.add(mesh); return group;
}
```
Por que não cintila: depth de 24 bits com `near=.03` (`renderer.js:217`) resolve ≈ `z²/(near·2²⁴)`: 0,2 mm a 10 m, 1,8 mm a 30 m. Os 2 mm sozinhos ficam no limite a 30 m; `polygonOffset(-1,-4)` cobre o resto. `depthWrite:false` + `renderOrder 2` desenha depois da parede opaca. `FrontSide` mantém o material elegível ao `material-sharing` (ver `volatile`, `material-sharing.js:14`).

Integração (`renderer.js:182`): `entity.decal ? Promise.resolve(createDecalInstance(entity, decalTextures)) : …`. `decalTextures.imageTexture(ref)` usa `cache.texture(assetRecord(ref))`. Depois o `installAsset` chama `applySurfaceTextures(instance, entity, surfaces)` (l.603): é isso que faz `kind:'surface'` + `material.texture:'hazard'` desenhar listras no decalque.

**Vista de corte** (`updateCutaway`, `renderer.js:626`), após o laço das paredes:
```js
for (const [id, object] of objects) { const r = records.get(id); if (!r?.decal) continue; const host = objects.get(r.anchor.hostId);
  const visible = visibleRecord(r) && (!host || host.visible); if (object.visible !== visible) { object.visible = visible; invalidate(true); } }
```

**Texto em canvas**: pool `Map` com chave `JSON.stringify([text,font,textColor,background,size])` e contagem de referências. Canvas 1024 × `round(1024·h/w)` limitado a [64,1024]; fonte ajustada para 88 % da largura e 80 % da altura (`measureText` + busca binária). Famílias locais: `stencil` → `'"Stencil Std", Impact, "Arial Black", sans-serif'` com `letterSpacing` .08em; `sans` → `'Arial, sans-serif'`; `mono` → `'"Courier New", monospace'`. Fundo `null` → `clearRect`. Textura `SRGBColorSpace`, `anisotropy = min(8, renderer.capabilities.getMaxAnisotropy())`, mipmaps.

**Desgaste** (`installDecalWear`, encadeável: `applySurfaceMaterial` chama o `previous`, `surface-materials.js:143-146`):
```js
material.onBeforeCompile = shader => {
  Object.assign(shader.uniforms, { decalWear: { value: new THREE.Vector3(d.wear.faded, d.wear.scratched, d.wear.seed) }, decalAspect: { value: new THREE.Vector2(...d.size) } });
  shader.vertexShader = 'varying vec2 vDecalUv;\n' + shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvDecalUv = uv;');
  shader.fragmentShader = 'uniform vec3 decalWear; uniform vec2 decalAspect; varying vec2 vDecalUv;\n' +
    'float dh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float dn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(dh(i),dh(i+vec2(1,0)),f.x),mix(dh(i+vec2(0,1)),dh(i+vec2(1,1)),f.x),f.y);}\n' +
    shader.fragmentShader.replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
    { vec2 p = vDecalUv * decalAspect + decalWear.z * 7.13;            // metros: não estica com o tamanho
      float n = dn(p * 3.0) * .6 + dn(p * 11.0) * .4;
      diffuseColor.a *= 1.0 - smoothstep(1.0 - decalWear.x, 1.0 - decalWear.x + .25, n) * .95;          // apagado
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(.3333))), decalWear.x * .5);
      float a = dh(floor(p * 2.0)) * 3.1416; vec2 r = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
      diffuseColor.a *= 1.0 - step(1.0 - decalWear.y * .3, dh(floor(vec2(r.x * 1.5, r.y * 90.0)))); } // riscado
    `);
};
material.customProgramCacheKey = () => 'decal-v1';
```

**Material "Listras de alerta"** — `src/domain/materials.js`:
```js
{ id: 'hazard', name: 'Listras de alerta', roughness: .62, metalness: 0, size: .4, relief: .006 },   // SURFACE_MATERIALS, após 'paint'
hazardAngle: 45, hazardWidth: .1, hazardColorA: '#e5b21c', hazardColorB: '#17160f', hazardWear: .2,  // TEXTURE_DEFAULTS
hazardAngle: [0, 180], hazardWidth: [.02, 1], hazardWear: [0, 1],                                     // TEXTURE_RANGES
hazard: ['hazardColorA', 'hazardColorB', 'hazardWear'],                                               // TEXTURE_PATTERN_FIELDS (só o que muda pixels)
```
`hazardAngle`/`hazardWidth` ficam fora de `TEXTURE_PATTERN_FIELDS` (são uniforms). `patternDefaults('hazard')` já grava os campos da família (`materials.js:70-71`). Validação em `surfaceFields`: `for (const key of ['hazardColorA','hazardColorB']) if (value[key] !== undefined) color(value[key], \`${path}.${key}\`);`.

Pixels (`surface-pixels.js`), um período (duas listras) por tile, sem emenda:
```js
case 'hazard': {
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = hex(options.hazardColorA), B = hex(options.hazardColorB), band = u < .5 ? A : B;
  const soft = THREE.MathUtils.smoothstep(Math.min(Math.abs(u - .5), u, 1 - u) * SIZE, 0, 1.5);
  const wear = noise(u, v, frequency(4), 701 + seed) * .6 + noise(u, v, frequency(19), 709 + seed) * .3 + fine * .1, limit = 1 - options.hazardWear * .8;
  const chip = THREE.MathUtils.smoothstep(wear, limit - .02, limit + .02), substrate = [118 + fine * 20, 116 + fine * 20, 110 + fine * 20], dirt = 1 - n * .12 * options.hazardWear;
  rgb = band.map((c, i) => THREE.MathUtils.lerp(THREE.MathUtils.lerp((A[i] + B[i]) / 2, c, soft) * dirt, substrate[i], chip));
  height = .55 + fine * .03 - chip * .2; rough = THREE.MathUtils.lerp(.5 + fine * .1, .92, chip); metal = 0; tintable = 0; break;
}
```
Shader (`surface-materials.js`): em `customization` l.120 somar `(settings.texture === 'hazard' ? o.hazardAngle : 0)` ao ângulo (o `tileSample` gira antes do `fract`, l.80-91: qualquer ângulo continua sem emenda). Em `applySurfaceMaterial` (l.139, l.147): `const tileSize = settings.texture === 'hazard' ? 2 * textureOptions(settings).hazardWidth : settings.textureSize ?? preset?.size ?? 2;` em `userData.surface.size` e no uniform `surfaceSize` — cada listra mede `hazardWidth` m. A amostragem triplanar no mundo funciona igual em parede, piso, slot de modelo e no plano do decalque.

**Faixa de parede**, três caminhos com o mesmo material: (1) decalque comprido `kind:'surface'`, `size:[comprimentoDaParede, .3]`, `material: surfacePatch('hazard')` — o do aceite, porque acompanha a parede; (2) material da parede inteira; (3) o modelo `industrial-hazard-band` com `surface:{texture:'hazard'}` (`recipeInstance` já suporta `part.surface`, `asset-cache.js:89`).

## 2.D Interface

- Peças avulsas (`application.js:686`), após `button('cable-place', …)`: `${button('decal-place', 'Decalque', 'ruler', '', 'title="Clique numa parede, piso ou objeto"')}`.
- Ação (~l.2003): `case 'decal-place': placing = { type: 'decal' }; clearProposal(); setTool('decal'); notify('Clique numa parede, piso ou objeto para colar o decalque. Esc cancela.'); break;`
- `setTool` da aplicação (l.546): `if (!['place', 'decal'].includes(next)) placing = null;` e dica em `gesture-hint`/`context` (l.548/560): `'Decalque · clique na superfície · Esc cancela'`.
- Callback em `createViewport({...})` (~l.323):
```js
onSurfacePlace: ({ hostId, point, normal }) => {
  const host = store.document.layout.entities[hostId]; if (isLocked(store.document, host)) { notify('A superfície está bloqueada.', true); return; }
  const asset = assets.find(a => a.id === DECAL_ASSET), decal = decalDefaults(), { position, rotation, anchor } = decalPlacement(host, point, normal);
  const entity = createEntity('prop', { name: 'Decalque', assetRef: { id: asset.id, revision: asset.revision }, footprint: [decal.size[0], .02], position, rotation, anchor, decal, ...constructionSemantics() });
  if (execute('entity.add', { entity, snap: false })) { setTool('move'); selectObject(entity.id, false, { revealInspector: true }); }
},
```
- Biblioteca (l.617, junto da regra do cabo): `asset.id === DECAL_ASSET` → `placing = { type:'decal' }; setTool('decal'); return;`.
- `src/ui/decal-panel.js` (`decalPanel(record, imageAssets, helpers)`): `decal-kind`, `decal-text`, `decal-font`, `decal-textColor`, `decal-background-on` + `decal-background`, `decal-imageRef`, `decal-size-0/1`, "Giro no plano · graus" (`decal-spin`: `anchor.rotation · Rz(Δ)`), opacidade %, "Apagado %" (`decal-wear-faded`), "Riscado %" (`decal-wear-scratched`), `decal-wear-seed`. Injetar em l.923. Para `record.decal` **esconder** "FIXAR EM PAREDE / TETO" (l.913), "SUPERFÍCIE DE APOIO" (l.909) e "ESCALA VISUAL" (l.920); painel de Material (l.921) só com `kind:'surface'`.
- Handler (~l.1699): `else if (field.startsWith('decal-') && record.decal) Object.assign(patch, decalFieldPatch(record, field.slice(6), value));` (`size` também atualiza `footprint[0]`).
- Material (`material-panels.js`, após `paint`): `number('hazardAngle','Ângulo · graus',0,180,5)`, `number('hazardWidth','Largura de cada listra · m',.02,1,.01)`, cor 1 e cor 2 (`hazardColorA/B`), `number('hazardWear','Desgaste · 0–1',0,1,.05)`; esconder "Tamanho da textura" em `hazard`. Os campos `material-hazard*` já passam por `textureFieldPatch` (`application.js:1697`).

## 2.E Aceite e testes

| Critério | Solução | Prova |
|---|---|---|
| Letreiro de texto na parede do fundo | `kind:'text'` + `decalPlacement` em parede | E2E: clique na parede → `anchor.socket==='surface'`, `hostId` = parede |
| Marca na carcaça do monitor | host `prop` com matriz completa | unitário com host girado 30° e escala [1.2,1,.8]; E2E clicando no `crt-tv` |
| Faixa de alerta ao longo de duas paredes | 2 decalques `surface` + `hazard` | captura do galpão |
| Nada cintila ao mover a câmera | 2 mm + `polygonOffset(-1,-4)` + `depthWrite:false` | `stats().decals[i]` com as flags; duas capturas com câmera girada 0,5° e contagem de pixels da parede dentro do decalque ≈ 0 |
| Acompanha a parede | socket `surface` + `refreshAnchors` | unitário mover/girar parede; E2E mover parede por `position-0` |
| Listras em faixa de parede e decalque | preset `hazard` | unitários de tile/validação; `stats().surfaceMaterials` com `hazard` em parede e decalque |

**`tests/decals.test.js`**: (1) parede girada 90°: `rotation`×(0,0,1) = normal, `worldPoint(offset)` = ponto; (2) `entity.update` da parede (posição + `quaternionFromYaw(45)`) → decalque segue (1e-6); (3) prop host girado e escalado → segue; (4) remover parede remove decalque; duplicar parede duplica decalque com `hostId` remapeado; (5) recusas: `surface` sem `decal`, `decal` sem `anchor`, host decalque, `scale≠1`, `image` sem `imageRef`, `decal` em `builtin-crate`; (6) `projectPresentation` com host `gm` → decalque some; `presentationAssets` inclui `decal.imageRef`; (7) `decalAnchorFromWorld` projeta de volta no plano (< 1e-6).

**`tests/surface-families.test.js`**: tile `hazard` tem cor A na coluna 0 e B na 200; continuidade entre x=0 e x=255; `hazardWear:1` aumenta substrato; `surfaceStyleKey` muda com `hazardColorA` e não com `hazardAngle`; `hazardColorA:'#fff'` recusado.

**E2E** (mesmo arquivo do item 1): `decal-place`; clicar no centro da parede do fundo (`window.__tabletop.project`); editar texto; trocar para `surface` + `hazard`; mover a parede e conferir o delta; Ctrl+Z; salvar/recarregar; `action('present')`.

**Diagnóstico**: `decals: [{ id, hostId, kind, polygonOffset, depthWrite, receiveShadow, castShadow, visible }]`.

---

# ITEM 3 — Resíduos (pendências declaradas)

`progress.md` e o Andamento do plano registram três desvios: sombra de cabos em qualquer qualidade, pontas sem encaixe em viga/objeto, e o assistente não liga cabos ao estado abandonado/futurista.

## 3.1 Sombra de cabos só na qualidade alta

- `src/render/renderer.js`: guardar `let qualityTier = 'balanced'`; em `setLightingQuality(tier, custom)` (~l.1444) atribuir e, para cada objeto cujo record tem `cable`, `object.traverse(m => { if (m.isMesh) m.castShadow = tier === 'high'; })` e `invalidate(true)`.
- Em `installAsset` (l.597), quando `entity.cable`: mesma regra após `parent.add(instance)`.
- `src/render/cutaway-shadows.js` não pode religar a sombra de cabo: conferir que só atua em paredes.
- **Prova**: unitário/E2E lendo `stats()` com novo diagnóstico `cableShadows: [{ id, castShadow }]` em `balanced` (false) e `high` (true).

## 3.2 Pontas do cabo em viga, teto e topo de objetos

Hoje (`application.js:599-605`) as pontas vêm do chão (`supportPoint`) e sobem para a altura das paredes.
- Ferramenta de cabo passa a usar o mesmo raycast de superfície do decalque: novo modo do viewport `tool === 'cable'` que, no clique, chama `onSurfacePlace({ hostId, point, normal, purpose:'cable' })`.
- Regra da ponta, em função pura `cableEndpoint({ hit, hostKind, normal, wallHeight })` em `src/domain/cables.js`:
  - acertou **prop** (viga, duto, eletrocalha, topo de objeto) ou **face de baixo de piso** (teto): ponta = ponto atingido;
  - acertou **parede**: ponto atingido, recuado 2 cm na normal;
  - acertou **piso por cima** ou nada: comportamento atual (sobe para a altura das paredes).
- A prévia entre o primeiro e o segundo clique usa `viewport.setPreview` com um `cableRecipe` temporário.
- Não ancorar o cabo no host (seria outra feature): registrar que mover a viga depois **não** carrega a ponta. Diferença declarada.
- **Prova**: E2E clicando no `industrial-duct` (ponta y ≈ altura do duto), na parede e no piso.

## 3.3 "Cabos no teto" nos estados abandonado e futurista

- `src/authoring/room-state.js` `proposeRoomState` (l.23): para `state === 'abandoned'` (e para a era futurista, se `roomEra(...) === 'future'`), anexar à proposta as entidades e remoções de `proposeRoomCables(document, { floorId, amount: .3 + .5 * intensity, seed }, expectedEditVersion, catalog)` (`room-ambience.js:215`), juntando `entities`, `removals` e `report.reasons`. Continua sendo proposta: nada entra sem aceitar.
- O estado anterior retira os cabos com `CABLE_TAG` que ele mesmo pôs (a remoção já existe em `proposeRoomCables`, l.221).
- **Prova**: em `tests/room-state.test.js`, estado abandonado num cômodo de 10×8 propõe ≥ 4 cabos com `CABLE_TAG`; estado "arrumado" retira-os.

---

# ITEM 4 — Piso molhado e reflexo das luzes

## 4.1 Degrau 1: umidade no material

**Dados** (`material.wet`, opcional, em qualquer entidade com material):
```js
// src/domain/wetness.js
export const WET_DEFAULTS = Object.freeze({ enabled: true, amount: .6, puddles: .4, puddleSize: 1.2, seed: 1 });
export const WET_RANGES = { amount: [0, 1], puddles: [0, 1], puddleSize: [.1, 10], seed: [0, 65535] };
export function validateWet(wet, path) { /* chaves estritas, enabled booleano, ranges, seed inteiro */ }
```
- `validation.js:54` (`material()`): incluir `'wet'` na lista **somente quando `!partial`** (como `wear`), e `if (value.wet != null) validateWet(value.wet, \`${path}.wet\`)`.
- `src/state/commands.js` `merge` (l.25): `material` já é mesclado raso; `wet` é substituído inteiro (igual a `wear`).

**Shader** (`src/render/wetness.js`, `applyWetness(material, wet)`), chamado em `applySurfaceTextures` (`surface-materials.js:217-240`) para cada material selecionado, **depois** de `applySurfaceMaterial` e `applyMaterialWear`, mesmo sem textura (`applySurfaceMaterial` retorna cedo sem preset; a umidade não pode depender disso):
```js
export function applyWetness(material, wet) {
  if (!wet?.enabled || wet.amount <= 0) return;
  const prior = material.onBeforeCompile, priorKey = material.customProgramCacheKey();
  material.userData.wet = { ...wet };                          // entra na chave do material-sharing
  material.onBeforeCompile = (shader, r) => {
    prior?.call(material, shader, r);
    Object.assign(shader.uniforms, { wetParams: { value: new THREE.Vector4(wet.amount, wet.puddles, wet.puddleSize, wet.seed) } });
    shader.vertexShader = 'varying vec3 wetPosition, wetNormal;\n' + shader.vertexShader
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nwetNormal = normalize(mat3(modelMatrix) * objectNormal);')
      .replace('#include <project_vertex>', '#include <project_vertex>\nwetPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = 'uniform vec4 wetParams; varying vec3 wetPosition, wetNormal;\n' + WET_FUNCTIONS + shader.fragmentShader
      // cor: escurece o poroso (antes do alfa, depois de map/color, onde a superfície já multiplicou)
      .replace('#include <alphamap_fragment>', `float wetUp = smoothstep(.6, .9, normalize(wetNormal).y);
        float wetPuddle = wetUp * smoothstep(1.0 - wetParams.y, 1.0 - wetParams.y + .06, wetNoise(wetPosition.xz / wetParams.z + wetParams.w));
        float wetness = clamp(wetParams.x * (wetUp > 0.0 ? .6 + .4 * wetNoise(wetPosition.xz * 1.7) : .35 + .3 * smoothstep(.2, .8, wetNoise(vec2(wetPosition.x + wetPosition.z, wetPosition.y * .25)))) + wetPuddle, 0.0, 1.0);
        diffuseColor.rgb *= mix(1.0, .55, wetness) * mix(1.0, .9, wetPuddle);
        #include <alphamap_fragment>`)
      // rugosidade: depois das modificações da superfície (que entram após roughnessmap_fragment)
      .replace('#include <metalnessmap_fragment>', `roughnessFactor = mix(roughnessFactor, .08, wetness); roughnessFactor = mix(roughnessFactor, .02, wetPuddle);
        #include <metalnessmap_fragment>`)
      // dentro da poça o relevo some: normal volta à geométrica
      .replace('#include <emissivemap_fragment>', `normal = normalize(mix(normal, normalize(cross(dFdx(-vViewPosition), dFdy(-vViewPosition))), wetPuddle));
        #include <emissivemap_fragment>`);
  };
  material.customProgramCacheKey = () => `wet-v1:${priorKey}`;
  material.needsUpdate = true;
}
```
`WET_FUNCTIONS` = hash/value-noise 2D (como `surfaceNoise` em `surface-materials.js:62-67`, em 2D). Paredes recebem só escurecimento em escorridos verticais (`wetUp = 0`); poças só em faces voltadas para cima. O brilho especular alongado das luzes pontuais vem do GGX com rugosidade baixa em ângulo rasante, sem código extra.

Material-sharing: `userData.wet` + `customProgramCacheKey` diferenciam; os uniforms são por material (o sharing só funde materiais com a mesma chave).

**Interface**: `src/ui/material-panels.js`, bloco novo **Molhado** depois dos campos de textura: `checkField('wet-enabled','Molhado')`, `number('wet-amount','Umidade · 0–1',0,1,.05)`, `number('wet-puddles','Poças · 0–1',0,1,.05)`, `number('wet-puddleSize','Tamanho das poças · m',.1,10,.1)`, `number('wet-seed','Variação',0,65535,1)`. Handler em `application.js` (~l.1696, perto de `wear-`): `else if (field.startsWith('wet-')) patch.material = { wet: wetFieldPatch(record.material.wet, field.slice(4), value) };` (`wetFieldPatch` em `src/domain/wetness.js`: ligar cria `WET_DEFAULTS`).

**Aceite do degrau 1**: "desligar o reflexo de tela mantém a cena aceitável só com o degrau 1" → captura `wet-only.png` com `surfaceReflections:false`, conferida a olho e registrada.

**Testes**: `tests/wetness.test.js` (validação, recusa em `materialAdjustments` parcial, `wetFieldPatch`); E2E em `tests/e2e/materials-effects.test.js`: ligar Molhado num piso → `stats().surfaceMaterials`/novo `wetMaterials` lista o piso; salvar/recarregar.

## 4.2 Degrau 2: reflexo de tela (SSR)

**Ponto de decisão**: implementar, medir (`node scripts/benchmark-frames.js` / `scripts/profile-frames.js` na cena do galpão, qualidade equilibrada, máquina de referência). Se não chegar a 60 FPS ou os defeitos (bordas, vista de corte) não fecharem, ir para o **plano B** abaixo e registrar.

**Dados**: `RENDERING_DEFAULTS` (`dynamic-lighting.js:18`) ganha `surfaceReflections:false, surfaceReflectionIntensity:1`. Validação (`validation.js:385`): limite superior `key==='surfaceReflectionIntensity' ? 2 : …`.

**Máscara de superfícies molhadas** (sem segundo desenho da cena inteira):
- `applyWetness` marca `mesh.layers.enable(30)` e cria `mesh.userData.wetMask` = `ShaderMaterial` que recalcula `wetness`/`wetPuddle` com as mesmas funções e escreve `vec4(viewNormal*.5+.5, reflectivity)` com `reflectivity = wetPuddle + .35*wetness*(1.0-wetPuddle)`. O fragmento compara `gl_FragCoord.z` com `sceneDepth` e descarta se estiver atrás (+1e-4): ocultação correta sem buffer de profundidade próprio.
- Registro: `Set` de malhas molhadas mantido pelo renderer (inserir em `installAsset`/criação de piso, remover em `disposeObject`).

**Passe** `src/render/screen-reflections.js` → `class ScreenReflectionPass extends Pass`:
1. Render de máscara em alvo de **meia resolução** (`HalfFloatType`): trocar `mesh.material ↔ mesh.userData.wetMask` nas malhas registradas e visíveis, `camera.layers.set(30)`, desenhar, restaurar materiais e camadas. Pular tudo se o registro estiver vazio.
2. Ray march em meia resolução (fragment):
```glsl
// entradas: tColor (readBuffer.texture), tDepth (sceneDepth), tMask, projection, inverseProjection, resolution
vec4 m = texture2D(tMask, vUv); if (m.a <= 0.001) { gl_FragColor = vec4(0.0); return; }
vec3 P = viewPoint(vUv, texture2D(tDepth, vUv).x);           // espaço de vista
vec3 N = normalize(m.xyz * 2.0 - 1.0), V = normalize(P), R = normalize(reflect(V, N));
if (R.z > 0.2) { gl_FragColor = vec4(0.0); return; }          // indo para a câmera: sem informação
float stepLen = .08; vec3 Q = P; vec2 hitUv = vec2(-1.0);
for (int i = 0; i < 32; i++) {                                 // passo crescente até ~12 m
  Q += R * stepLen; stepLen *= 1.12;
  vec4 c = projection * vec4(Q, 1.0); vec2 uv = c.xy / c.w * .5 + .5;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) break;
  float sceneZ = viewPoint(uv, texture2D(tDepth, uv).x).z, diff = sceneZ - Q.z;
  if (diff > 0.0 && diff < .25 + stepLen) {                    // cruzou a superfície: refina 5×
    vec3 lo = Q - R * stepLen, hi = Q;
    for (int j = 0; j < 5; j++) { vec3 mid = (lo + hi) * .5; vec4 cm = projection * vec4(mid, 1.0); vec2 um = cm.xy / cm.w * .5 + .5;
      if (viewPoint(um, texture2D(tDepth, um).x).z > mid.z) hi = mid; else lo = mid; }
    vec4 ch = projection * vec4(hi, 1.0); hitUv = ch.xy / ch.w * .5 + .5; break;
  }
}
if (hitUv.x < 0.0) { gl_FragColor = vec4(0.0); return; }
float edge = smoothstep(0.0, .12, min(min(hitUv.x, 1.0 - hitUv.x), min(hitUv.y, 1.0 - hitUv.y)));
float facing = 1.0 - smoothstep(-.2, .2, R.z);
float fresnel = .02 + .98 * pow(1.0 - max(dot(-V, N), 0.0), 5.0);
gl_FragColor = vec4(texture2D(tColor, hitUv).rgb, m.a * edge * facing * fresnel * intensity);
```
3. Desfoque separável de 2 passes, raio = `(1 - puddle) * 6` px (meia resolução), para o molhado sem poça borrar e a poça ficar nítida (guardar `puddle` no canal `b` de outro alvo ou empacotar no alfa da máscara em dois níveis).
4. Composição em resolução cheia: `color.rgb += reflection.rgb * reflection.a` (aditivo: é luz refletida).

**Posição no pipeline** (`src/render/effects.js`): hoje os passes são `[render, fog(volume), ao, bloom?, output]` (`effects.js:160`, `:177`, `:182`). Inserir o SSR **logo após o RenderPass** (índice 1): antes da névoa e do bloom, como pede o plano. O AO continua onde está (depois da névoa). Diferença em relação ao plano ("depois do GTAO"): declarar; mover o AO mudaria o visual de todas as cenas.
- `configure()` (l.142-187): `const ssr = enabled && look.rendering?.surfaceReflections && ['balanced','high'].includes(tier);` entra na condição de criar o composer (l.147); criar/remover o passe como o `aoPass` (l.172-179); `ssrPass.intensity = look.rendering.surfaceReflectionIntensity ?? 1`.
- `render()` (l.198-209): passar `camera`, `sceneDepth` e o registro de malhas ao passe antes de `composer.render`.
- Economia: desligado. Projetor: cada viewport tem seu pipeline e qualidade (já é assim).

**Vista de corte**: paredes ocultas não estão no depth, então não aparecem no reflexo; um raio que passaria por elas segue até a parede seguinte ou sai da tela (desvanece pela borda). Registrar como comportamento esperado; conferir na captura `eye.png` com corte ligado.

**Interface**: `renderingPanel` (`dynamic-lighting-panel.js:33`): `b('rendering-surfaceReflections','Reflexos de superfície · pisos molhados',r.surfaceReflections)` + `n('rendering-surfaceReflectionIntensity','Força dos reflexos de superfície',…,{min:0,max:2,step:.05})` com microcopy "Só nas qualidades equilibrada e alta; reflete apenas o que está na imagem". O handler genérico `rendering-` (`application.js:1525`) já grava.

**Plano B (reflexo plano)**: se o SSR não fechar, `three/addons/objects/Reflector.js` só para o piso marcado (`material.wet.mirror: true`, um por cena), textura de reflexo em meia resolução misturada no shader do piso pela máscara de poça. Mais previsível, custa um desenho extra da cena.

**Aceite e provas**

| Critério | Solução | Prova |
|---|---|---|
| Luz vermelha ao fundo deixa risco no piso até perto da câmera | degrau 1 (especular rasante) + SSR do emissor e do halo | captura `eye.png` comparada à referência; anotar em `progress.md` |
| Monitor refletido na mesa | mesa de metal com `wet` (ou só rugosidade baixa) entra na máscara | captura `screen-2m.png` mostrando o reflexo |
| Desligar o reflexo de tela mantém a cena aceitável | degrau 1 independente | captura `wet-only.png` |
| 60 FPS na qualidade equilibrada | meia resolução, 32 passos, só pisos molhados | `scripts/benchmark-frames.js` no galpão: p95 ≤ 16,7 ms; registrar números |
| Ligado só em equilibrada/alta | condição em `configure()` | unitário/E2E: `effects.info().surfaceReflections` false em economia |

Testes: `tests/e2e/effects-sharpness.test.js` como modelo para ligar/desligar e ler `effects.info()`; adicionar `surfaceReflections` a `info()` (l.210).

---

# ITEM 5 — Brilho de lente (risco anamórfico)

**Dados**: `look.bloom` aceita opcionais `streak` [0,1] (padrão ausente = 0, desligado) e `streakLength` [0,1] (padrão .5). `validation.js:402-406`: chaves `['enabled','strength','radius','threshold','streak','streakLength']`, validar quando definidos. Ambientes (`validateEnvironmentDocument`) herdam pelo `look()`.

**Passe** `src/render/anamorphic.js` (`class AnamorphicStreakPass extends Pass`), inserido **logo depois do `bloomPass`** em `effects.js:181-182`, só quando `look.bloom.enabled && look.bloom.streak > 0`:
1. Fonte: `bloomPass.renderTargetBright.texture` (o high-pass do `UnrealBloomPass` do three r186, já com o `threshold` do bloom → **fontes fracas não geram risco**).
2. Reduzir para 1/4 da largura e 1/8 da altura (alvo `HalfFloat`).
3. Três passes de desfoque **só horizontal** com núcleo de 9 taps e espaçamento crescente (1, 4, 16 texels × `1 + 3*streakLength`), estilo Kawase:
   ```glsl
   vec3 sum = vec3(0.0); float w = 0.0;
   for (int i = -4; i <= 4; i++) { float k = exp(-float(i*i) / 8.0); sum += texture2D(tSource, vUv + vec2(float(i) * spacing / resolution.x, 0.0)).rgb * k; w += k; }
   gl_FragColor = vec4(sum / w, 1.0);
   ```
4. Composição: `color.rgb += streak * tint * mix(streakTex.rgb, vec3(dot(streakTex.rgb, vec3(.333))), .3)` com `tint = vec3(.9, .95, 1.1)` (leve azul, sem fantasmas de lente).
- Remover/criar o passe junto com o bloom (l.183-185); `dispose` dos alvos.

**Interface**: na seção "Halo luminoso · bloom" de `src/ui/lighting-panels.js:14`: `n('bloom-streak','Risco horizontal · lente',…,{min:0,max:1,step:.05})` e `n('bloom-streakLength','Comprimento do risco',…)`. O handler genérico `bloom-` (`application.js:1623`, com `BLOOM_DEFAULTS`) grava as chaves novas; incluir `streak:0, streakLength:.5` em `BLOOM_DEFAULTS` só se isso não alterar documentos existentes (preferir ler com `?? 0`).

| Critério | Solução | Prova |
|---|---|---|
| A luz vermelha ganha o risco | high-pass do bloom + desfoque horizontal | captura `eye.png` com `streak:.6` |
| Fontes fracas não | usa o `threshold` do bloom | unitário do shader não é viável: captura com uma luz fraca (intensidade 5) sem risco visível; registrar |
| Desligado por padrão | ausência = 0; passe nem é criado | unitário: `validateDocument` sem `streak`; `effects.info().streak === false` |

---

# ITEM 6 — Faíscas e gotejamento

**Dados**: `localEffect.type` ∈ `['fire','smoke','sparks','drip']` (`validation.js:108`). Mesmos campos (`count, size, offset, speed, opacity, color, seed, lightIntensity, hideModel, enabled`). Defaults em `src/domain/materials.js` ao lado de `smokeDefaults` (l.96):
```js
export const sparksDefaults = () => ({ ...structuredClone(LOCAL_EFFECT_DEFAULTS), type: 'sparks', count: 48, size: [.8, .8, .8], offset: [0, 0, 0], speed: 1, opacity: 1, color: '#ffc46b', lightIntensity: 18, hideModel: true });
export const dripDefaults = () => ({ ...structuredClone(LOCAL_EFFECT_DEFAULTS), type: 'drip', count: 6, size: [.3, 3, .3], offset: [0, 0, 0], speed: 1, opacity: .8, color: '#a9c4d6', lightIntensity: 0, hideModel: true });
```
Para `drip`, `size[1]` = altura da queda (até o piso).

**Tempo sem estado**, compartilhado entre JS e GLSL (`src/domain/local-effects.js`):
```js
// Rajadas em intervalos irregulares: o tempo é dividido em janelas de L s; cada janela tem rajada com prob. .7, num instante sorteado.
export function sparkBurst(seed, speed, t) {
  const L = 1.6 / Math.max(.05, speed), s = Math.floor(t / L), h1 = hash(seed, s * 2), h2 = hash(seed, s * 2 + 1);
  const age = t - s * L - h2 * L * .5;
  return { index: s, active: h1 < .7 && age >= 0 && age < .6, age };
}
// Gota i: período próprio; cresce pendurada, cai com g e some ao tocar o piso (y = -height).
export function dropState(seed, i, speed, height, t) {
  const P = (.8 + hash(seed, i) * 1.6) / Math.max(.05, speed), phase = hash(seed, i + 97) * P, local = ((t + phase) % P);
  const fall = Math.sqrt(2 * height / 9.8), hang = P - fall;
  return local < hang ? { y: 0, scale: local / hang } : { y: -.5 * 9.8 * (local - hang) ** 2, scale: 1 };
}
```

**Render** (`src/render/local-effects.js`):
- `createLocalEffect` (l.46): `smoke` vira um uniform `mode` (0 fogo, 1 fumaça, 2 faíscas, 3 gotas). Vertex shader com ramos:
  - **faíscas**: replica `sparkBurst` (uniforms `seedU`, `speed`, `time`); se inativa, `gl_Position = vec4(2.0)` (fora do recorte). Velocidade inicial por partícula: `v0 = normalize(vec3(effectSeed.x-.5, .4+effectSeed.y*.8, effectSeed.z-.5)) * (1.5 + effectSeed.w*2.5) * regionSize.x`; posição `p = v0*age + .5*vec3(0,-9.8,0)*age*age`; o quad é esticado ao longo da velocidade projetada em espaço de vista (`len = |v|*.025`, largura .012 m); fragment branco-laranja, alfa `1 - age/.6`, `blending = AdditiveBlending` neste modo.
  - **gotas**: `instanceCount = count`; replica `dropState`; quad pequeno (.015 m) esticado em y durante a queda; some quando `y <= -regionSize.y`.
- Luz: hoje só fogo cria `PointLight` (l.62); estender para `sparks` quando `lightIntensity > 0`. Em `updateLocalEffect` (l.66-73): para faíscas `light.intensity = burst.active ? lightIntensity * Math.exp(-burst.age * 12) : 0` usando `sparkBurst(config.seed, config.speed, seconds)`; retorno `animated` como hoje (pausa → `seconds` congelado → mesma rajada; luz congela também).
- O descritor de luz no loop (`renderer.js:316`, id `:fire`) é genérico e passa a valer para faíscas.

**Interface**:
- `localEffectPanel` (`src/ui/material-panels.js:99-101`): eyebrow "EFEITO LOCAL"; opções `[['none','Sem efeito'],['fire','Fogo'],['smoke','Fumaça'],['sparks','Faíscas'],['drip','Gotejamento']]`; para `drip` o rótulo de `size-1` vira "Altura da queda · m".
- Handler (`application.js:1712-1715`): `type` escolhe `sparksDefaults()`/`dripDefaults()`.
- Peças avulsas (l.686): botões `sparks-place` e `drip-place`; ações como `fire-place` (l.2049-2052) usando o modelo `builtin-campfire` oculto (`hideModel:true`). `drip-place`: posição no clique no piso, elevada para a altura das paredes do cômodo (mesma regra do cabo, `application.js:601`), e `size[1]` = essa altura.

| Critério | Solução | Prova |
|---|---|---|
| Faísca intermitente num cabo rompido iluminando o entorno por um instante | rajadas por janela + `PointLight` com decaimento exponencial | unitário `sparkBurst` (intervalos irregulares, determinístico); E2E: `stats()` novo `localEffects:[{id,type,lightIntensity}]` alterna entre 0 e > 0 ao longo de 4 s |
| Goteira do teto sobre uma poça | `dropState` + altura da queda até o piso; poça = `material.wet` (item 4) | unitário `dropState` (y nunca abaixo de `-height`); captura na cena |
| Mesmos controles dos efeitos atuais | mesmos campos e painel | E2E abre o painel e muda `count`/`speed` |
| Pausa | `effectTime` | E2E: com `effects-paused`, intensidade da luz das faíscas não muda em 1 s |

Validação: limite atual de 32 emissores / 4096 partículas (`validation.js:224-225`) continua valendo.

---

# ITEM 7 — Montagem, cena pronta e tutorial

## 7.1 Montagem "só com o editor"

- Extrair a montagem de `scripts/capture-industrial.js` (l.18-36) para `scripts/industrial-scene.js` → `export function buildIndustrialScene(catalog)` que devolve o documento. **Só pode usar** o que a interface usa: `store.execute(...)` com comandos públicos, `createEntity`, propostas do assistente (`proposeRoom`, `proposeRoomCables`, `proposeRoomState`), `decalPlacement`, `screenDefaults`, `surfacePatch`, presets de ambiente. Nada de mexer em JSON à mão nem campos que o inspetor não expõe.
- Conteúdo mínimo (fecha as pendências do item 3 e a referência `docs/references/scenes/galpao-industrial.png`): galpão 16 × 12 × 4,6 m **com teto** (piso do andar de cima ou laje `industrial-*` de cobertura — conferir catálogo; o `progress.md` registra que faltava); monitor `crt-tv` com tela `BOOTING..` + barra e luz própria; letreiro decalque na parede do fundo; marca na carcaça do monitor; faixas de alerta como decalques `surface`/`hazard` em duas paredes; portão com luz vermelha `ritual` e `bloom.streak`; piso de ladrilho com `wet` (poças) e `surfaceReflections` ligado; cabos do assistente; faísca num cabo solto (`sparks` no `drop`); goteira sobre uma poça; névoa volumétrica.
- `scripts/capture-industrial.js` passa a importar `buildIndustrialScene` e capturar `outside.png`, `eye.png`, `screen-2m.png`, `wet-only.png`, `jitter-a/b.png`.

## 7.2 Comparação com a referência

- Câmera "Olhos" com o enquadramento da referência (posição/alvo/fov ajustados até a silhueta coincidir).
- Gerar `docs/references/scenes/galpao-industrial-comparacao.png` lado a lado: o projeto não tem biblioteca de imagens, então montar uma página HTML local com as duas `<img>` e fazer `page.screenshot` com Playwright no fim de `capture-industrial.js`.
- Listar diferenças em `docs/GALPAO_INDUSTRIAL_ANALISE.md` (seção nova "Comparação"), corrigir até restarem só diferenças de estilo; cada correção é ajuste de parâmetro, não código de cena.

## 7.3 Cena de exemplo com miniatura

- `scripts/generate-industrial-scene.js` (modelo: `scripts/generate-church-scene.js`): grava `public/scenes/galpao-industrial.json` com `JSON.stringify(scene, null, 2)`, `validateDocument` antes; cinco câmeras (Olhos, Monitor, Portão, Planta superior, Entrada).
- `src/data/example-scenes.js:5-18`: nova entrada `{ id:'galpao-industrial', name:'Galpão industrial · abandonado', description:'Galpão de 16 × 12 m com cabos, tela acesa, letreiros, faixas de alerta, piso molhado, faíscas e goteira. Cinco câmeras e cópia editável.', file:'scenes/galpao-industrial.json' }`.
- Miniatura: as capas são geradas em tempo de execução (`src/app/scene-previews.js`, `src/data/example-preview-cache.js`; `docs/EXAMPLE_SCENES.md`): nada a gravar, mas conferir no E2E `tests/e2e/example-previews.test.js` que a capa aparece; se a cena demorar a capturar no SwiftShader, ajustar o enquadramento de capa como nas outras.
- `tests/example-scenes.test.js`: caso novo (contagem de entidades, 5 câmeras, presença de `screen`, ≥ 3 `decal`, ≥ 1 `wet`, ≥ 8 `cable`, efeitos `sparks` e `drip`; `loadExampleScene` gera cópia com IDs novos e `anchor.hostId` remapeados).
- `docs/EXAMPLE_SCENES.md`: seção "Galpão industrial".

## 7.4 Tutorial de recriação

- `src/tutorial/lessons.js`: nova lição `{ id:'industrial', title:'Galpão industrial', minutes:12, needs:'empty', summary:'…', steps:[…] }`, do contorno ao enquadramento final, usando cada recurso novo no momento em que aparece: sala → cabos no teto (assistente) → `crt-tv` → **Tela** (ligar, escrever `BOOTING`, barra) → **Decalque** na parede (texto) → decalque **Faixa de material** com **Listras de alerta** → piso **Molhado** → Ambiente: **Reflexos de superfície** e **risco** do bloom → **Faíscas** e **Gotejamento** em Peças avulsas → salvar câmera → Apresentar → Salvar.
- `src/tutorial/conditions.js`: condições novas, todas lendo o estado (nunca o botão): `screenLit: state => entities(state).some(e => e.screen?.enabled)`, `screenText: (state, text) => entities(state).some(e => e.screen?.lines.some(l => l.text.includes(text)))`, `decals: (state, n, kind) => entities(state).filter(e => e.decal && (!kind || e.decal.kind === kind)).length >= n`, `hazardOn: state => entities(state).some(e => e.material?.texture === 'hazard')`, `wetFloor: state => entities(state).some(e => e.kind === 'floor' && e.material?.wet?.enabled)`, `rendering: (state, key) => !!(state.document.look ?? state.document.defaultLook).rendering?.[key]`, `bloomStreak: state => ((state.document.look ?? {}).bloom?.streak ?? 0) > 0`, `effectType: (state, type) => entities(state).some(e => e.localEffect?.enabled && e.localEffect.type === type)`.
- Passos com `act` executável pelo teste (`['world',[x,y,z]]` para clicar na parede/monitor; `['fill', selector, texto]` para a tela).
- `tests/e2e/tutorials.test.js` já roda **toda** lição de `LESSONS`: a lição nova precisa passar nele do primeiro ao último passo. Esse teste é a prova de que a cena se recria só com o editor.

| Critério do item 7 | Prova |
|---|---|
| Montada só com o editor | `buildIndustrialScene` usa só comandos públicos (revisão de código) + lição completa no `tutorials.test.js` |
| Comparação lado a lado com lista de diferenças | `galpao-industrial-comparacao.png` + seção na análise |
| Publicada com miniatura | entrada em `EXAMPLE_SCENES`, `example-scenes.test.js`, capa no E2E de previews |
| Tutorial usa cada recurso novo | condições novas aparecem nos `done` da lição |

---

## Registro final

Ao fim de cada etapa (regra do `AGENTS.md`):
- `progress.md`: seção nova com **Feito**, **Validação** (unitários com contagem, E2E rodados pelo nome, conferência em imagem), **Encontrado na validação**, **Pendências reais**.
- Sincronizar os resumos afetados em `PROGRESSO.md` e `docs/PROGRESSO.md`.
- A câmera de trabalho e a câmera publicada continuam separadas: nada destas etapas publica no projetor sozinho.
- `docs/GALPAO_INDUSTRIAL_PLANO.md` → **Andamento**: data, o que fechou, e **Diferenças em relação ao plano**. Diferenças já previstas neste microplano (registrar quando acontecerem):
  1. `hostId` do decalque em `decal.anchor.hostId`.
  2. Decalque reaproveita o campo `anchor` (socket `'surface'`), mas não passa pelo painel "Fixar em parede / teto"; a colagem é pela ferramenta de clique.
  3. `screen.scanlines` controla o efeito de tubo inteiro (linhas, curvatura, ruído) com uma intensidade.
  4. Fase da animação no projetor pode diferir da do editor.
  5. Decalque é plano (sem projeção em curvas), como o plano já previa.
  6. Emissão aparece de leve nas bordas chanfradas da tela (UV planar do chanfro).
  7. Pontas de cabo encaixam em viga/objeto, mas não ficam ancoradas: mover a viga depois não carrega o cabo.
  8. Reflexo de tela entra antes da névoa e do bloom, mas o AO continua depois da névoa (não foi movido).
