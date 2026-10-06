import { escapeHTML as esc } from './icons.js';
import { catalogFacets, filterAssets } from '../domain/asset-library.js';

// A classification edit can remove the last matching option while a filter is active.
const options = (values, current, empty) => `<option value="">${empty}</option>${(current && !values.includes(current) ? [...values, current] : values).map(value => `<option value="${esc(value)}" ${current === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}`;

export function assetLibraryPanel(assets, filters, storage = 'server', repeatPlacement = true) {
  const facets = catalogFacets(assets);
  return `<div class="section-intro"><span class="eyebrow">BIBLIOTECA / INVESTIGAÇÃO PARANORMAL</span><h2>Prepare cada cenário.</h2><p class="muted">Objetos de diferentes épocas para sua mesa. Escolha um asset e clique no apoio para colocá-lo.</p></div>
    <input id="asset-search" type="search" aria-label="Buscar assets" placeholder="Nome, uso ou tema…" value="${esc(filters.search)}" />
    <label class="check"><input type="checkbox" data-field="asset-placement-repeat" ${repeatPlacement ? 'checked' : ''}/><span>Colocação repetida</span></label>
    <p class="microcopy">Continue clicando para colocar cópias do mesmo asset. Esc ou Q conclui. Desmarque para colocar uma única cópia.</p>
    <div class="asset-filters">
      <label class="field"><span>Categoria</span><select data-asset-filter="category" aria-label="Categoria de assets">${options(facets.categories, filters.category, 'Todas as categorias')}</select></label>
      <label class="field"><span>Época</span><select data-asset-filter="era" aria-label="Época dos assets">${options(facets.eras, filters.era, 'Todas as épocas')}</select></label>
      <label class="field"><span>Cenário</span><select data-asset-filter="context" aria-label="Cenário dos assets">${options(facets.contexts, filters.context, 'Todos os cenários')}</select></label>
      <label class="field"><span>Adicionar filtro de tag</span><select id="asset-tag-filter" aria-label="Filtrar por tag">${options(facets.tags.filter(tag => !filters.tags.includes(tag)), '', 'Escolha uma tag…')}</select></label>
      <div id="asset-active-tags" class="asset-tags"></div>
      <label class="check"><input id="asset-favorites" type="checkbox" ${filters.favorites ? 'checked' : ''} /><span>Somente favoritos</span></label>
      <button type="button" data-library-clear class="wide quiet">Limpar filtros</button>
    </div>
    <p id="asset-result-count" class="microcopy" role="status" aria-live="polite"></p>
    <div id="asset-cards" class="asset-grid"></div>
    <button type="button" data-library-more class="wide quiet" hidden>Mostrar mais assets</button>
    <button type="button" data-action="asset-import" class="wide accent-outline">Importar imagem ou GLB</button>
    <p class="microcopy">Use “Tags” para classificar objetos e ★ para salvar favoritos. A biblioteca fica ${storage==='browser'?'neste navegador':'no servidor local'}.</p>`;
}

export function assetCards(assets, filters, limit) {
  const matches = filterAssets(assets, filters);
  const cards = matches.slice(0, limit).map(asset => `<article class="asset-library-card">
    <button type="button" class="asset-card" data-asset="${esc(asset.id)}" title="Colocar ${esc(asset.name)}">
      <div class="asset-preview">${asset.previewUrl || asset.type === 'image' ? `<img loading="lazy" decoding="async" src="${esc(asset.previewUrl ?? asset.url)}" alt="" />` : '<span aria-hidden="true">◇</span>'}</div>
      <span>${esc(asset.name)}</span><small>${asset.type === 'image' ? 'Retrato de token' : esc(asset.category || 'Objeto')}</small>
    </button>
    ${asset.era ? `<small class="asset-era">${esc(asset.era)}</small>` : ''}
    <div class="asset-tags">${(asset.tags ?? []).slice(0, 3).map(tag => `<button type="button" class="asset-tag" data-library-tag="${esc(tag)}" title="Filtrar por ${esc(tag)}">${esc(tag)}</button>`).join('')}</div>
    <div class="asset-card-actions"><button type="button" data-library-favorite="${esc(asset.id)}" aria-label="${asset.favorite ? 'Remover' : 'Adicionar'} ${esc(asset.name)} ${asset.favorite ? 'dos' : 'aos'} favoritos" aria-pressed="${asset.favorite === true}">${asset.favorite ? '★' : '☆'}</button><button type="button" data-library-edit="${esc(asset.id)}" aria-label="Editar tags de ${esc(asset.name)}">Tags</button></div>
  </article>`).join('') || '<p class="microcopy asset-empty">Nenhum asset combina com os filtros. Remova uma tag ou limpe os filtros.</p>';
  return { cards, total: matches.length, shown: Math.min(limit, matches.length) };
}

export function metadataEditor(asset, assets) {
  const facets = catalogFacets(assets);
  const list = (id, values) => `<datalist id="${id}">${values.map(value => `<option value="${esc(value)}"></option>`).join('')}</datalist>`;
  return `<form id="asset-metadata-form">
    <div class="dialog-header"><div><span class="eyebrow">CLASSIFICAÇÃO DA BIBLIOTECA</span><h2>${esc(asset.name)}</h2></div><button type="button" data-library-close aria-label="Fechar classificação">×</button></div>
    <p>${esc(asset.description || 'Classifique este asset para encontrá-lo nas próximas sessões.')}</p>
    <label class="field"><span>Categoria · use / para subcategorias</span><input name="category" aria-label="Categoria do asset" required maxlength="80" list="asset-category-suggestions" value="${esc(asset.category || 'Importados')}" /></label>
    <label class="field"><span>Época</span><input name="era" aria-label="Época do asset" required maxlength="80" list="asset-era-suggestions" value="${esc(asset.era || 'Não definida')}" /></label>
    <label class="field"><span>Cenários · separados por vírgula</span><input name="contexts" aria-label="Cenários do asset" value="${esc((asset.contexts ?? []).join(', '))}" placeholder="Hospital, Ruínas, Fazenda" /></label>
    <label class="field"><span>Tags · separadas por vírgula</span><textarea name="tags" aria-label="Tags do asset" rows="3" placeholder="investigação, sangue, abandonado">${esc((asset.tags ?? []).join(', '))}</textarea></label>
    <p class="microcopy">Até 32 tags e 32 cenários, com 60 caracteres cada. Combine tema, material, uso e suas próprias coleções; todos os filtros de tag selecionados devem corresponder.</p>
    <label class="check"><input name="favorite" type="checkbox" ${asset.favorite ? 'checked' : ''} /><span>Favorito</span></label>
    <p id="asset-metadata-error" role="alert" class="asset-metadata-error"></p>
    <div class="dialog-actions"><button type="button" data-library-close>Cancelar</button><button type="submit" class="primary">Salvar classificação</button></div>
    ${list('asset-category-suggestions', facets.categories)}${list('asset-era-suggestions', facets.eras)}
  </form>`;
}
