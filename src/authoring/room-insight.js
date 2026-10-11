import { worldFootprint, footprintsOverlap } from '../domain/geometry.js';
import { ROOM_RECIPES } from '../domain/room-recipes.js';
import { AMBIENCE_TAG, doorZones } from './furnishing.js';

/**
 * What the assistant understands of a room from what is in it: which kind of
 * room it resembles, what such a room usually has that this one lacks, and
 * practical problems worth pointing out. It reads the scene and changes nothing.
 */
const short = id => id.replace('builtin-', '');
// A model found in few recipes says more about the room than a chair does.
const rarity = new Map();
for (const recipe of ROOM_RECIPES) for (const asset of new Set(recipe.items.map(item => item.asset))) rarity.set(asset, (rarity.get(asset) ?? 0) + 1);
const weight = asset => Math.log(1 + ROOM_RECIPES.length / (rarity.get(asset) ?? ROOM_RECIPES.length));

export function roomContents(document, floorId) {
  const entities = Object.values(document.layout.entities), floor = document.layout.entities[floorId];
  const standing = entities.filter(e => e.kind === 'prop' && e.surfaceId === floorId), ids = new Set(standing.map(e => e.id));
  return { floor, standing, resting: entities.filter(e => e.kind === 'prop' && ids.has(e.surfaceId)),
    walls: entities.filter(e => e.kind === 'wall' && (e.surfaceId === floorId || e.floorIds?.includes(floorId))),
    lights: Object.values((document.look ?? document.defaultLook).lights).filter(light => light.surfaceId === floorId) };
}

export function describeRoom(document, floorId, catalog = []) {
  const { floor, standing, resting, lights } = roomContents(document, floorId);
  if (floor?.kind !== 'floor') return null;
  const furniture = [...standing, ...resting].filter(e => !e.tags?.includes(AMBIENCE_TAG)), present = new Set(furniture.map(e => short(e.assetRef?.id ?? '')));
  const ranked = ROOM_RECIPES.map(recipe => {
    const assets = [...new Set(recipe.items.map(item => item.asset))], matched = assets.filter(asset => present.has(asset));
    const essentials = [...new Set(recipe.items.filter(item => (item.level ?? 0) === 0).map(item => item.asset))];
    // Share of the room's identity already there, tempered by how much of what is there belongs to it.
    const score = matched.reduce((sum, asset) => sum + weight(asset), 0) / assets.reduce((sum, asset) => sum + weight(asset), 0) * (.5 + .5 * matched.length / Math.max(1, present.size));
    return { id: recipe.id, name: recipe.name, score, matched: matched.length, missing: essentials.filter(asset => !present.has(asset)) };
  }).filter(entry => entry.matched > 0).sort((a, b) => b.score - a.score);
  const inferred = ranked.filter((entry, i) => i < 3 && entry.score >= ranked[0].score * .55);
  const name = asset => catalog.find(a => a.id === `builtin-${asset}`)?.name ?? asset, notes = [];
  if (!furniture.length) notes.push({ kind: 'empty', text: 'Cômodo vazio. Escolha um tipo de cômodo ou comece colocando uma peça: o assistente completa em volta dela.' });
  else if (inferred[0]?.missing.length) notes.push({ kind: 'complete', template: inferred[0].id, text: `Para ${inferred[0].name.toLowerCase()} ainda falta: ${inferred[0].missing.slice(0, 4).map(name).join(', ').toLowerCase()}${inferred[0].missing.length > 4 ? '…' : ''}.` });
  const solid = standing.filter(e => (catalog.find(a => a.id === e.assetRef?.id)?.bounds?.[1] ?? 1) > .05), zones = doorZones(document, floor);
  for (const entity of solid) if (zones.some(zone => footprintsOverlap(worldFootprint(entity), zone))) notes.push({ kind: 'blocked', id: entity.id, text: `${entity.name} está na passagem de uma porta.` });
  const clashes = solid.filter((a, i) => solid.some((b, j) => j > i && footprintsOverlap(worldFootprint(a), worldFootprint(b))));
  if (clashes.length) notes.push({ kind: 'overlap', id: clashes[0].id, text: `${clashes.length === 1 ? `${clashes[0].name} atravessa outro objeto` : `${clashes.length} objetos atravessam outros`}.` });
  if (furniture.length && !lights.length && !furniture.some(e => e.illumination)) notes.push({ kind: 'dark', text: 'Não há luz neste cômodo.' });
  return { floor, count: furniture.length, ambience: standing.length + resting.length - furniture.length, inferred, notes };
}
