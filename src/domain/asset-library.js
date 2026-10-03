/** Catalog metadata is independent of the immutable geometry revision used by scenes. */
export const normalizeSearch = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
export const splitLabels = value => String(value ?? '').split(',').map(label => label.trim()).filter(Boolean);

export function filterAssets(assets, { search = '', category = '', era = '', context = '', tags = [], favorites = false } = {}) {
  const words = normalizeSearch(search).split(/\s+/).filter(Boolean);
  return assets.filter(asset => {
    const assetTags = new Set((asset.tags ?? []).map(normalizeSearch));
    const text = normalizeSearch([asset.name, asset.description, asset.category, asset.era, ...(asset.contexts ?? []), ...(asset.tags ?? [])].join(' '));
    return words.every(word => text.includes(word))
      && (!category || asset.category === category || asset.category?.startsWith(`${category} / `))
      && (!era || asset.era === era)
      && (!context || asset.contexts?.includes(context))
      && tags.every(tag => assetTags.has(normalizeSearch(tag)))
      && (!favorites || asset.favorite === true);
  });
}

export function catalogFacets(assets) {
  const sorted = values => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return {
    categories: sorted(assets.flatMap(asset => (asset.category ?? '').split(' / ').map((_part, index, parts) => parts.slice(0, index + 1).join(' / ')))),
    eras: sorted(assets.map(asset => asset.era)),
    contexts: sorted(assets.flatMap(asset => asset.contexts ?? [])),
    tags: sorted(assets.flatMap(asset => asset.tags ?? [])),
  };
}

export function validateAssetMetadata(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Envie a classificação do asset.');
  const result = {};
  for (const [key, value] of Object.entries(patch)) {
    if (['category', 'era'].includes(key)) {
      if (typeof value !== 'string' || !value.trim() || value.length > 80) throw new Error('Categoria e época devem ter de 1 a 80 caracteres.');
      result[key] = key === 'category' ? value.split('/').map(part => part.trim()).join(' / ') : value.trim();
      if (key === 'category' && (result[key].length > 80 || value.split('/').some(part => !part.trim()))) throw new Error('Use categorias e subcategorias não vazias, separadas por /.');
    } else if (['tags', 'contexts'].includes(key)) {
      if (!Array.isArray(value) || value.length > 32 || value.some(label => typeof label !== 'string' || !label.trim() || label.length > 60)) throw new Error('Use até 32 tags ou cenários, com 1 a 60 caracteres cada.');
      const seen = new Set();
      result[key] = value.map(label => label.trim()).filter(label => {
        const normalized = normalizeSearch(label);
        if (seen.has(normalized)) return false;
        seen.add(normalized); return true;
      });
    } else if (key === 'favorite') {
      if (typeof value !== 'boolean') throw new Error('Favorito deve ser verdadeiro ou falso.');
      result.favorite = value;
    } else throw new Error(`Campo de classificação não permitido: ${key}.`);
  }
  if (!Object.keys(result).length) throw new Error('Informe pelo menos um campo de classificação.');
  return result;
}
