import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, createToken } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { startInitiative, stepInitiative, setInitiativeValue, pruneInitiative } from '../src/domain/initiative.js';
import { projectPresentation } from '../src/app/presentation.js';

const scene = () => {
  const store = createSceneStore(createScene('Combate')), ids = [];
  for (const name of ['Lia', 'Zumbi', 'Kian']) { const { token, actor } = createToken({ name, position: [ids.length, 0, 0] }); store.execute('token.add', { token, actor, snap: false }); ids.push(token.id); }
  return { store, ids };
};

test('initiative orders from the highest value, steps through turns and counts rounds', () => {
  const [a, b, c] = ['a', 'b', 'c'];
  let initiative = startInitiative([{ tokenId: a, value: 12 }, { tokenId: b, value: 18 }, { tokenId: c, value: 12 }]);
  assert.deepEqual(initiative.order.map(entry => entry.tokenId), [b, a, c], 'ties keep the order they came in');
  initiative = stepInitiative(stepInitiative(stepInitiative(initiative)));
  assert.deepEqual([initiative.current, initiative.round], [0, 2]);
  assert.deepEqual([stepInitiative(initiative, -1).current, stepInitiative(initiative, -1).round], [2, 1]);
  assert.equal(setInitiativeValue(startInitiative([{ tokenId: a, value: 0 }, { tokenId: b, value: 0 }]), b, 9).order[0].tokenId, b, 'before anyone plays, the top starts');
  const moved = setInitiativeValue({ ...initiative, current: 1 }, c, 30);
  assert.equal(moved.order[0].tokenId, c); assert.equal(moved.order[moved.current].tokenId, a, 'the turn stays with its token');
  assert.equal(pruneInitiative(moved, key => key !== a).order.length, 2);
});

test('the turn order is validated scene state, follows removed tokens and hides tokens only the master sees', () => {
  const { store, ids } = scene();
  store.execute('initiative.update', { initiative: startInitiative(ids.map((tokenId, i) => ({ tokenId, value: 10 + i }))) });
  assert.equal(store.document.sessionState.initiative.order[0].tokenId, ids[2]);
  assert.throws(() => store.execute('initiative.update', { initiative: { order: [{ tokenId: ids[0], value: 1 }], current: 0, round: 0 } }), /Rodada/);
  store.execute('token.update', { id: ids[1], patch: { audience: 'gm' } });
  assert.deepEqual(projectPresentation(store.document).sessionState.initiative.order.map(entry => entry.tokenId), [ids[2], ids[0]]);
  store.execute('token.remove', { id: ids[2] });
  assert.equal(store.document.sessionState.initiative.order.length, 2);
  store.execute('initiative.update', { initiative: null });
  assert.equal(store.document.sessionState.initiative, undefined);
  store.undo(); assert.equal(store.document.sessionState.initiative.order.length, 2);
});
