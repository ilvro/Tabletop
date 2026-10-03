import { clone, id, createEntity } from '../domain/documents.js';
import { worldFootprint, isLocked, footprintOnFloor, footprintsOverlap, worldPoint, floorContour } from '../domain/geometry.js';
import { quaternionFromYaw } from '../domain/coords.js';
import { ValidationError } from '../domain/validation.js';
import { stableRandom } from './furnishing.js';

export const MATERIAL_PALETTES = {
  natural: { name: 'Natural', colors: ['#a78d68', '#8b795e', '#b5aa8a'], roughness: .85, metalness: 0 },
  industrial: { name: 'Industrial', colors: ['#687078', '#8b9298', '#596469'], roughness: .45, metalness: .6 },
  worn: { name: 'Envelhecido', colors: ['#726753', '#817766', '#625e51'], roughness: .98, metalness: 0 },
};

const proposalFor = (label, expectedEditVersion) => ({ id: id(), expectedEditVersion, label, entities: [], lights: [], groups: [], areas: [], updates: [], removals: [], report: { kept: [], suppressed: [], omissions: [], conflicts: [], reasons: [] } });

export function passageZones(document, floorId, clearance = .8) {
  const zones = [];
  for (const entity of Object.values(document.layout.entities)) {
    if (entity.kind === 'door') {
      const wall = document.layout.entities[entity.wallId];
      if (wall.surfaceId !== floorId && !wall.floorIds?.includes(floorId)) continue;
      const t = { position: worldPoint(wall, [entity.offset, 0, 0]), rotation: wall.transform.rotation, scale: [1, 1, 1] };
      zones.push({ name: entity.name, polygon: worldFootprint({ transform: t, footprint: [entity.width + clearance, clearance * 2] }) });
    } else if (['stairs', 'ramp'].includes(entity.kind) && entity.surfaceId === floorId) zones.push({ name: entity.name, polygon: worldFootprint(entity, clearance / 2) });
  }
  return zones;
}

function extendedPolish(document, options, version, catalog) {
  const { ids, mode, seed = 1, palette = 'natural', clearance = .8, referenceId } = options;
  if (!Array.isArray(ids) || !ids.length || ids.length > 256 || new Set(ids).size !== ids.length || !Number.isInteger(seed) || !Number.isFinite(clearance) || clearance <= 0 || clearance > 5) throw new ValidationError('Seleção ou parâmetros de polish inválidos.');
  const items = ids.map(key => document.layout.entities[key] ?? (document.look ?? document.defaultLook).lights[key]);
  if (items.some(item => !item)) throw new ValidationError('Elemento de polish ausente.');
  const proposal = proposalFor({ material: 'Variar materiais', passage: 'Liberar passagens', facing: 'Orientar para referência', corner: 'Decorar canto', lighting: 'Uniformizar iluminação' }[mode], version);
  const editableItems = items.filter(item => {
    if (isLocked(document, item) || item.anchor) { proposal.report.kept.push(item.id); proposal.report.reasons.push(`${item.name}: protegido ou ancorado.`); return false; } return true;
  });
  if (mode === 'material') {
    const variant = MATERIAL_PALETTES[palette]; if (!variant) throw new ValidationError('Paleta desconhecida.');
    for (const item of editableItems) {
      if (!item.material) { proposal.report.omissions.push(`${item.name}: não tem material editável.`); continue; }
      const color = variant.colors[Math.floor(stableRandom(seed, item.id) * variant.colors.length)];
      proposal.updates.push({ kind: 'entity', id: item.id, patch: { material: { color, roughness: variant.roughness, metalness: variant.metalness } } });
      proposal.report.reasons.push(`${item.name}: variante ${variant.name}, dimensões preservadas.`);
    }
    proposal.materialPreview = true;
  } else if (mode === 'facing') {
    const reference = document.layout.entities[referenceId]; if (!reference?.transform) throw new ValidationError('Escolha a mesa ou objeto de referência.');
    for (const item of editableItems.filter(e => e.kind === 'prop' && e.id !== reference.id)) {
      const [x, , z] = item.transform.position, [tx, , tz] = reference.transform.position;
      proposal.updates.push({ kind: 'entity', id: item.id, patch: { transform: { ...clone(item.transform), rotation: quaternionFromYaw(Math.atan2(tx - x, tz - z) * 180 / Math.PI) } } });
      proposal.report.reasons.push(`${item.name}: frente orientada para ${reference.name}.`);
    }
  } else if (mode === 'lighting') {
    const points = editableItems.filter(item => item.type === 'point');
    if (!points.length) throw new ValidationError('Selecione luzes locais na árvore.');
    const intensity = points.reduce((sum, item) => sum + item.intensity, 0) / points.length;
    for (const light of points) proposal.updates.push({ kind: 'light', id: light.id, patch: { intensity, color: points[0].color } });
    proposal.report.reasons.push('Cor da primeira fonte e intensidade média; posições preservadas.');
  } else if (mode === 'passage') {
    const occupancy = Object.values(document.layout.entities).filter(e => e.kind === 'prop').map(e => ({ id: e.id, floorId: e.surfaceId, polygon: worldFootprint(e, .05) }));
    for (const item of editableItems) {
      if (item.kind !== 'prop') continue;
      const floor = document.layout.entities[item.surfaceId]; if (floor?.kind !== 'floor') { proposal.report.omissions.push(`${item.name}: escolha um piso de apoio.`); continue; }
      const zones = passageZones(document, floor.id, clearance), blocked = zones.filter(zone => footprintsOverlap(worldFootprint(item), zone.polygon));
      if (!blocked.length) { proposal.report.kept.push(item.id); continue; }
      let candidate;
      // Small bounded search; proposed displacement is visible and always reversible.
      for (let step = 1; step <= 12 && !candidate; step++) for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
        const test = clone(item); test.transform.position[0] += dx * step * .25; test.transform.position[2] += dz * step * .25;
        const polygon = worldFootprint(test, .05);
        if (footprintOnFloor(floor, polygon) && !zones.some(zone => footprintsOverlap(polygon, zone.polygon)) && !occupancy.some(o => o.id !== item.id && o.floorId === floor.id && footprintsOverlap(polygon, o.polygon))) { candidate = test; break; }
      }
      if (!candidate) { proposal.report.conflicts.push(`${item.name}: bloqueia ${blocked.map(z => z.name).join(', ')}; não há posição livre próxima.`); continue; }
      proposal.updates.push({ kind: 'entity', id: item.id, patch: { transform: candidate.transform } });
      occupancy.find(o => o.id === item.id).polygon = worldFootprint(candidate, .05);
      proposal.report.reasons.push(`${item.name}: afastar de ${blocked.map(z => z.name).join(', ')} com folga de ${clearance} m.`);
    }
  } else if (mode === 'corner') {
    const floor = document.layout.entities[referenceId] ?? items.find(e => e.kind === 'floor');
    if (floor?.kind !== 'floor' || isLocked(document, floor)) throw new ValidationError('Escolha um piso desbloqueado para decorar.');
    const asset = catalog.find(a => a.id === 'builtin-lamp'); if (!asset) throw new ValidationError('Luminária ausente no catálogo.');
    const zones = passageZones(document, floor.id, clearance), occupied = Object.values(document.layout.entities).filter(e => e.kind === 'prop' && e.surfaceId === floor.id).map(e => worldFootprint(e, .05));
    const vertices = floorContour(floor), center = vertices.reduce((s, p) => [s[0] + p[0] / vertices.length, s[1] + p[1] / vertices.length], [0,0]);
    for (const vertex of vertices) {
      const distance = Math.hypot(center[0] - vertex[0], center[1] - vertex[1]);
      if (distance < 1e-6) continue;
      const position = worldPoint(floor, [vertex[0] + (center[0] - vertex[0]) / distance * .65, 0, vertex[1] + (center[1] - vertex[1]) / distance * .65]);
      const prop = createEntity('prop', { name: 'Luminária de canto', position, footprint: asset.footprint, assetRef: { id: asset.id, revision: asset.revision }, surfaceId: floor.id, levelId: floor.levelId ?? null, tags: ['decoration'] });
      const polygon = worldFootprint(prop, .05);
      if (!footprintOnFloor(floor, polygon) || zones.some(z => footprintsOverlap(polygon, z.polygon)) || occupied.some(o => footprintsOverlap(polygon, o))) continue;
      proposal.entities.push(prop); proposal.report.reasons.push(`${floor.name}: preencher canto livre, preservando passagens.`); break;
    }
    if (!proposal.entities.length) proposal.report.omissions.push('Nenhum canto livre encontrado com as folgas solicitadas.');
  }
  return proposal;
}

export function proposePolish(document, options = {}, expectedEditVersion = 0, catalog = []) {
  const { ids, mode = 'align', axis = 'x', alignment = 'center', angle = 5, seed = 1 } = options;
  if (['material', 'passage', 'facing', 'corner', 'lighting'].includes(mode)) return extendedPolish(document, options, expectedEditVersion, catalog);
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.length < 2 || ids.length > 256) throw new ValidationError('Selecione de 2 a 256 props/tokens.');
  if (!['align', 'distribute', 'rotation'].includes(mode) || !['x', 'z'].includes(axis) || !['center', 'min', 'max'].includes(alignment) || !Number.isFinite(angle) || angle < 0 || angle > 30 || !Number.isInteger(seed)) throw new ValidationError('Ajuste de polish inválido.');
  const index = axis === 'x' ? 0 : 2;
  const items = ids.map(key => document.layout.entities[key] ?? document.tokens?.[key] ?? (document.look ?? document.defaultLook).lights[key]).map(item => item?.type === 'point' ? { ...item, transform: { position: item.position, rotation: item.rotation, scale: [1,1,1] }, footprint: [.2,.2] } : item);
  if (items.some(item => !item?.transform || item.kind && item.kind !== 'prop' || item.anchor || isLocked(document, item))) throw new ValidationError('Polish aceita props, tokens e luzes locais desbloqueados e sem âncora.');
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
  proposals.forEach((operation, i) => { if (items[i].type === 'point') { operation.kind = 'light'; operation.patch = { position: operation.patch.transform.position, rotation: operation.patch.transform.rotation }; } });
  return { id: id(), expectedEditVersion, label: { align: 'Alinhar seleção', distribute: 'Distribuir seleção', rotation: 'Variar rotação' }[mode], entities: [], lights: [], groups: [], areas: [], updates: proposals, removals: [], report: { kept: [], suppressed: [], omissions: [], conflicts: [], reasons: [`${proposals.length} elementos: ${mode === 'align' ? 'alinhar à primeira referência' : mode === 'distribute' ? 'uniformizar intervalos sem mover as extremidades' : 'aplicar rotação limitada pela variação escolhida'}.`] } };
}
