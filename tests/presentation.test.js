import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, createEntity, createToken, createLight, id, validateDocument, clone } from '../src/domain/documents.js';
import { projectPresentation, presentationAssets } from '../src/app/presentation.js';

const insertEntity = (scene, entity) => { scene.layout.entities[entity.id] = entity; return entity; };
const insertToken = (scene, options) => {
  const pair = createToken(options); scene.actors[pair.actor.id] = pair.actor; scene.tokens[pair.token.id] = pair.token; return pair;
};
const insertGroup = (scene, options = {}) => {
  const group = { id: id(), name: 'Grupo privado', parentId: null, locked: false, audience: 'all', ...options };
  scene.layout.groups[group.id] = group; return group;
};

test('presentation filters hidden floors and all hosted/support dependents before transfer', () => {
  const scene = createScene('Cena pública');
  const hiddenFloor = insertEntity(scene, createEntity('floor', { name: 'Porão secreto', audience: 'gm' }));
  const wall = insertEntity(scene, createEntity('wall', { surfaceId: hiddenFloor.id }));
  const door = insertEntity(scene, createEntity('door', { wallId: wall.id, surfaceId: hiddenFloor.id }));
  insertEntity(scene, createEntity('prop', { surfaceId: hiddenFloor.id, assetRef: { id: 'secret-model', revision: 1 } }));
  const privateToken = insertToken(scene, { name: 'Revelação privada', surfaceId: hiddenFloor.id, assetRef: { id: 'secret-portrait', revision: 1 } });
  const publicFloor = insertEntity(scene, createEntity('floor', { name: 'Sala pública' }));
  const publicToken = insertToken(scene, { name: 'Ana', surfaceId: publicFloor.id });
  scene.sessionState.doors[door.id] = 1.2;
  scene.look.materialAdjustments[hiddenFloor.id] = { base: { color: '#111122' } };
  scene.look.materialAdjustments[publicFloor.id] = { base: { color: '#778899' } };
  const original = clone(scene); validateDocument(scene);
  const projected = projectPresentation(scene);
  assert.deepEqual(Object.keys(projected.layout.entities), [publicFloor.id]);
  assert.deepEqual(Object.keys(projected.tokens), [publicToken.token.id]);
  assert.deepEqual(Object.keys(projected.actors), [publicToken.actor.id]);
  assert.equal(projected.actors[privateToken.actor.id], undefined);
  assert.deepEqual(projected.sessionState.doors, {});
  assert.deepEqual(Object.keys(projected.look.materialAdjustments), [publicFloor.id]);
  assert.doesNotThrow(() => validateDocument(projected)); assert.deepEqual(scene, original);
  assert.ok(!JSON.stringify(projected).includes('secret-portrait'));
  assert.ok(!JSON.stringify(projected).includes('Porão secreto'));
});

test('hidden ancestor groups exclude descendants and visible projection removes authoring metadata', () => {
  const scene = createScene();
  const hidden = insertGroup(scene, { audience: 'gm', name: 'Nome secreto de sala' });
  const descendant = insertGroup(scene, { parentId: hidden.id });
  insertEntity(scene, createEntity('prop', { groupId: descendant.id, assetRef: { id: 'secret-model', revision: 1 } }));
  const publicGroup = insertGroup(scene, { name: 'Grupo de edição' });
  const publicProp = insertEntity(scene, createEntity('prop', { groupId: publicGroup.id, assetRef: { id: 'public-model', revision: 1 } }));
  const area = { id: id(), name: 'Anotação geométrica', kind: 'rectangle', transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    width: 4, length: 4, surfaceId: null, groupId: publicGroup.id, memberIds: [publicProp.id] };
  scene.layout.areas[area.id] = area;
  const camera = { id: id(), name: 'Câmera da revelação secreta', projection: 'perspective', position: [4, 6, 5], target: [0, 0, 0], fov: 42, orthographicHeight: 12 };
  scene.cameraPresets[camera.id] = camera; scene.sourceMap = { id: 'secret-source-map', revision: 4 };
  scene.sourceEnvironment = { id: 'moonlight', revision: 1 }; validateDocument(scene);
  const projected = projectPresentation(scene);
  assert.deepEqual(Object.keys(projected.layout.entities), [publicProp.id]);
  assert.equal(projected.layout.entities[publicProp.id].groupId, null);
  assert.deepEqual(projected.layout.groups, {}); assert.deepEqual(projected.layout.areas, {}); assert.deepEqual(projected.cameraPresets, {});
  assert.equal(projected.sourceMap, null); assert.equal(projected.sourceEnvironment, null);
  assert.ok(!JSON.stringify(projected).includes('Nome secreto de sala'));
  assert.ok(!JSON.stringify(projected).includes('secret-model'));
  assert.doesNotThrow(() => validateDocument(projected));
});

test('private doors/walls and light records disappear without dangling public references', () => {
  const scene = createScene();
  const publicWall = insertEntity(scene, createEntity('wall'));
  const secretDoor = insertEntity(scene, createEntity('door', { wallId: publicWall.id, audience: 'gm' }));
  const secretWall = insertEntity(scene, createEntity('wall', { audience: 'gm' }));
  const dependentDoor = insertEntity(scene, createEntity('door', { wallId: secretWall.id }));
  scene.sessionState.doors[secretDoor.id] = 0.8; scene.sessionState.doors[dependentDoor.id] = 0.4;
  const secretLight = createLight({ audience: 'gm', name: 'Luz da entidade oculta' }); scene.look.lights[secretLight.id] = secretLight;
  const publicLight = createLight({ name: 'Luminária' }); scene.look.lights[publicLight.id] = publicLight;
  validateDocument(scene); const projected = projectPresentation(scene);
  assert.deepEqual(Object.keys(projected.layout.entities), [publicWall.id]);
  assert.equal(projected.look.lights[secretLight.id], undefined);
  assert.deepEqual(projected.look.lights[publicLight.id], publicLight);
  assert.deepEqual(projected.sessionState.doors, {}); assert.doesNotThrow(() => validateDocument(projected));
});

test('actors shared with public tokens survive, hidden-only actors and assets do not', () => {
  const scene = createScene();
  const shared = insertToken(scene, { name: 'Personagem público', assetRef: { id: 'public-portrait', revision: 1 } });
  const hiddenInstance = clone(shared.token); hiddenInstance.id = id(); hiddenInstance.audience = 'gm'; scene.tokens[hiddenInstance.id] = hiddenInstance;
  const privatePair = insertToken(scene, { name: 'Personagem secreto', audience: 'gm', assetRef: { id: 'secret-portrait', revision: 1 } });
  const unplaced = { id: id(), name: 'Ator sem token', color: '#112233', assetRef: { id: 'unplaced-portrait', revision: 1 } }; scene.actors[unplaced.id] = unplaced;
  validateDocument(scene); const projected = projectPresentation(scene);
  assert.deepEqual(Object.keys(projected.actors), [shared.actor.id]);
  assert.equal(projected.tokens[hiddenInstance.id], undefined); assert.equal(projected.actors[privatePair.actor.id], undefined);
  const assets = ['public-portrait', 'secret-portrait', 'unplaced-portrait'].map(assetId => ({ id: assetId, revision: 1, url: `/assets/${assetId}` }));
  assert.deepEqual(presentationAssets(projected, assets).map(asset => asset.id), ['public-portrait']);
  assert.doesNotThrow(() => validateDocument(projected));
});

test('asset projection includes only exact revisions and effective token appearances', () => {
  const scene = createScene();
  insertEntity(scene, createEntity('prop', { assetRef: { id: 'public-model', revision: 1 } }));
  const disguised = insertToken(scene, { name: 'Token com substituição visual', assetRef: { id: 'private-canonical-portrait', revision: 2 } });
  scene.tokens[disguised.token.id].visualOverride = { assetRef: { id: 'public-disguise', revision: 1 } };
  const plain = insertToken(scene, { assetRef: { id: 'private-unused-portrait', revision: 1 } });
  scene.tokens[plain.token.id].visualOverride = { assetRef: null };
  const normal = insertToken(scene, { assetRef: { id: 'public-portrait', revision: 1 } });
  scene.tokens[normal.token.id].visualOverride = { color: '#001122' };
  validateDocument(scene); const original = clone(scene), projected = projectPresentation(scene);
  assert.equal(projected.actors[disguised.actor.id].assetRef, null); assert.equal(projected.actors[plain.actor.id].assetRef, null);
  assert.deepEqual(projected.actors[normal.actor.id].assetRef, { id: 'public-portrait', revision: 1 });
  const assets = [
    { id: 'public-model', revision: 1, url: '/model-public-v1', tags: ['Identidade secreta'], contexts: ['Local do crime'], category: 'Pistas', era: 'Contemporânea', favorite: true, metadataRevision: 3, description: 'Notas do mestre', provenance: 'Biblioteca do mestre' }, { id: 'public-model', revision: 2, url: '/model-private-v2' },
    { id: 'public-disguise', revision: 1 }, { id: 'public-disguise', revision: 2 },
    { id: 'public-portrait', revision: 1 }, { id: 'private-canonical-portrait', revision: 2 }, { id: 'private-unused-portrait', revision: 1 },
  ];
  assert.deepEqual(presentationAssets(projected, assets).map(asset => `${asset.id}@${asset.revision}`),
    ['public-model@1', 'public-disguise@1', 'public-portrait@1']);
  assert.deepEqual(presentationAssets(projected, assets)[0], { id: 'public-model', revision: 1, url: '/model-public-v1' });
  assert.deepEqual(assets[0].tags, ['Identidade secreta']);
  assert.deepEqual(scene, original); assert.doesNotThrow(() => validateDocument(projected));
});
