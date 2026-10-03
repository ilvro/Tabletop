import { clone, id } from '../domain/documents.js';
import { worldFootprint, isLocked } from '../domain/geometry.js';
import { ValidationError } from '../domain/validation.js';
import { stableRandom } from './furnishing.js';

export function proposePolish(document, { ids, mode = 'align', axis = 'x', alignment = 'center', angle = 5, seed = 1 } = {}, expectedEditVersion = 0) {
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.length < 2 || ids.length > 256) throw new ValidationError('Selecione de 2 a 256 props/tokens.');
  if (!['align', 'distribute', 'rotation'].includes(mode) || !['x', 'z'].includes(axis) || !['center', 'min', 'max'].includes(alignment) || !Number.isFinite(angle) || angle < 0 || angle > 30 || !Number.isInteger(seed)) throw new ValidationError('Ajuste de polish inválido.');
  const index = axis === 'x' ? 0 : 2;
  const items = ids.map(key => document.layout.entities[key] ?? document.tokens?.[key]);
  if (items.some(item => !item?.transform || item.kind && item.kind !== 'prop' || isLocked(document, item))) throw new ValidationError('Polish aceita somente props/tokens desbloqueados.');
  const selected = new Set(ids);
  if (items.some(item => selected.has(item.surfaceId))) throw new ValidationError('Ajuste o apoio e seus dependentes separadamente.');
  const proposals = items.map(item => ({ kind: item.actorId ? 'token' : 'entity', id: item.id, patch: { transform: clone(item.transform) } }));
  const extent = item => { const bounds = worldFootprint(item).map(p => p[axis === 'x' ? 0 : 1]); return [Math.min(...bounds), Math.max(...bounds)]; };
  if (mode === 'align') {
    const anchor = items[0]; const target = alignment === 'center' ? anchor.transform.position[index] : extent(anchor)[alignment === 'min' ? 0 : 1];
    items.forEach((item, i) => { const current = alignment === 'center' ? item.transform.position[index] : extent(item)[alignment === 'min' ? 0 : 1]; proposals[i].patch.transform.position[index] += target - current; });
  } else if (mode === 'distribute') {
    if (items.length < 3) throw new ValidationError('Distribuição precisa de pelo menos três elementos.');
    const ordered = [...items].sort((a, b) => extent(a)[0] - extent(b)[0] || a.id.localeCompare(b.id));
    const first = extent(ordered[0])[0], last = extent(ordered.at(-1))[1];
    const sizes = ordered.map(item => { const [min, max] = extent(item); return max - min; });
    const gap = (last - first - sizes.reduce((sum, size) => sum + size, 0)) / (items.length - 1);
    if (gap < -1e-8) throw new ValidationError('Afaste as extremidades: não há espaço para distribuir sem sobreposição.');
    let cursor = first;
    ordered.forEach((item, i) => { const operation = proposals.find(p => p.id === item.id); operation.patch.transform.position[index] += cursor - extent(item)[0]; cursor += sizes[i] + gap; });
  } else items.forEach((item, i) => {
    const half = (stableRandom(seed, item.id) * 2 - 1) * angle * Math.PI / 360;
    const s = Math.sin(half), c = Math.cos(half), [x, y, z, w] = item.transform.rotation;
    // Rotate about world Y without erasing a manually tilted prop.
    proposals[i].patch.transform.rotation = [c * x + s * z, c * y + s * w, c * z - s * x, c * w - s * y];
  });
  return { id: id(), expectedEditVersion, label: { align: 'Alinhar seleção', distribute: 'Distribuir seleção', rotation: 'Variar rotação' }[mode], entities: [], lights: [], groups: [], areas: [], updates: proposals, removals: [], report: { kept: [], suppressed: [], omissions: [], conflicts: [] } };
}
