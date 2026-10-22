import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, createEntity, createLight } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { illuminationDefaults } from '../src/domain/dynamic-lighting.js';
import { switchState, switchTargets, recordLightOn } from '../src/domain/light-switch.js';

// A room folder with a lamp and a nested folder holding a free light, and a candle outside every folder.
function scene() {
  const store = createSceneStore(createScene('Interruptores'));
  store.execute('group.add', { group: { id: 'room', name: 'Sala' } });
  store.execute('group.add', { group: { id: 'corner', name: 'Canto', parentId: 'room' } });
  const prop = (id, groupId) => { const entity = createEntity('prop', { id, name: id, groupId, position: [0, 0, 0] }); store.execute('entity.add', { entity, snap: false }); store.execute('entity.update', { id, patch: { illumination: illuminationDefaults('lamp', entity) }, snap: false }); };
  prop('lamp', 'room'); prop('candle', null);
  store.execute('light.add', { light: createLight({ id: 'spot', name: 'Spot', groupId: 'corner' }) });
  return store;
}
const look = store => store.document.look ?? store.document.defaultLook;

test('a folder switch reaches the lights of its objects and of its subfolders, and nothing else', () => {
  const store = scene();
  assert.deepEqual(switchTargets(store.document, { groupId: 'room' }), { entities: ['lamp'], lights: ['spot'] });
  assert.equal(switchState(store.document, { groupId: 'room' }), 'on');
  store.execute('lights.switch', { groupId: 'room', enabled: false });
  assert.equal(store.document.layout.entities.lamp.illumination.enabled, false); assert.equal(look(store).lights.spot.enabled, false);
  assert.equal(store.document.layout.entities.candle.illumination.enabled, true, 'outside the folder');
  for (const light of Object.values(look(store).lights)) if (light.id !== 'spot') assert.notEqual(light.enabled, false, `${light.name} is in no folder`);
  assert.equal(switchState(store.document, { groupId: 'room' }), 'off'); assert.equal(switchState(store.document, { groupId: 'corner' }), 'off');
  // Only the switch changed: the rest of the light is kept for when it comes back on.
  assert.equal(store.document.layout.entities.lamp.illumination.intensity, illuminationDefaults('lamp').intensity);
  store.undo(); assert.equal(switchState(store.document, { groupId: 'room' }), 'on', 'one step in the history');
});

test('one light by id; a folder with both states is mixed; locks do not stop a switch', () => {
  const store = scene();
  store.execute('lights.switch', { ids: ['spot'], enabled: false });
  assert.equal(switchState(store.document, { groupId: 'room' }), 'mixed'); assert.equal(recordLightOn(look(store).lights.spot), false); assert.equal(recordLightOn(store.document.layout.entities.lamp), true);
  store.execute('group.update', { id: 'room', patch: { locked: true } });
  store.execute('lights.switch', { groupId: 'room', enabled: true });
  assert.equal(switchState(store.document, { groupId: 'room' }), 'on');
});

test('a switch needs a state and something to switch', () => {
  const store = scene();
  store.execute('group.add', { group: { id: 'empty', name: 'Vazia' } });
  assert.throws(() => store.execute('lights.switch', { groupId: 'room' }), /ligadas ou desligadas/);
  assert.throws(() => store.execute('lights.switch', { groupId: 'empty', enabled: false }), /Não há luzes/);
  assert.equal(switchState(store.document, { groupId: 'empty' }), 'none'); assert.equal(recordLightOn(createEntity('wall', {})), null);
});
