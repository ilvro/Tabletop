import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, createEntity, createToken, createLight, clone, duplicateDocument, validateDocument } from '../src/domain/documents.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { assemblyFor, assemblyMembers } from '../src/domain/assemblies.js';
import { projectPresentation } from '../src/app/presentation.js';

function fixture() {
  const store=createSceneStore(createScene());
  const table=createEntity('prop',{ name:'Mesa',position:[0,0,0],supportHeight:1 });
  const lamp=createEntity('prop',{ name:'Lamparina',position:[1,1,0],surfaceId:table.id });
  for(const entity of [table,lamp]) store.execute('entity.add',{ entity,snap:false });
  return { store,table,lamp };
}
const close=(actual,expected) => actual.forEach((value,i) => assert.ok(Math.abs(value-expected[i])<1e-8,`${actual} ≈ ${expected}`));
const bind=({store,table,lamp},key='unit') => store.execute('group.bind',{ id:key,ids:[table.id,lamp.id],name:'Mesa + lamparina' });

test('binding creates one selectable unit without moving props or replacing meshes; unbind preserves world poses and folder',()=>{
  const data=fixture(), before=clone(data.store.document); bind(data); const doc=data.store.document;
  assert.equal(assemblyFor(doc,data.table.id).id,'unit'); assert.equal(assemblyFor(doc,data.lamp.id).id,'unit'); assert.equal(assemblyMembers(doc,'unit').length,2);
  assert.deepEqual(doc.layout.entities[data.table.id].transform,before.layout.entities[data.table.id].transform); assert.deepEqual(doc.layout.entities[data.lamp.id].transform,before.layout.entities[data.lamp.id].transform);
  assert.equal(doc.layout.entities[data.lamp.id].surfaceId,data.table.id);
  data.store.undo(); assert.deepEqual(data.store.document,before); data.store.redo();
  data.store.execute('group.unbind',{ id:'unit' }); assert.equal(assemblyFor(data.store.document,data.table.id),null); assert.equal(data.store.document.layout.entities[data.table.id].groupId,'unit'); assert.equal(data.store.document.layout.groups.unit.transform,undefined);
  data.store.undo(); assert.equal(data.store.document.layout.groups.unit.anchored,true);
});

test('unit move/rotation/scale transform both members once, retaining support offsets and atomic undo',()=>{
  const data=fixture(); bind(data); const {store,table,lamp}=data; const before=clone(store.document), original=before.layout.groups.unit.transform;
  store.execute('group.transform',{ id:'unit',transform:{ ...original,position:original.position.map((v,i)=>v+[3,2,1][i]) },snap:false });
  close(store.document.layout.entities[table.id].transform.position,[3,2,1]); close(store.document.layout.entities[lamp.id].transform.position,[4,3,1]); store.undo(); assert.deepEqual(store.document,before);
  store.execute('group.transform',{ id:'unit',transform:{ ...original,rotation:quaternionFromYaw(90) },snap:false });
  close(store.document.layout.entities[table.id].transform.position,[.5,0,.5]); close(store.document.layout.entities[lamp.id].transform.position,[.5,1,-.5]); store.undo();
  store.execute('group.transform',{ id:'unit',transform:{ ...original,scale:[2,2,2] },snap:false });
  close(store.document.layout.entities[table.id].transform.position,[-.5,-.5,0]); close(store.document.layout.entities[lamp.id].transform.position,[1.5,1.5,0]); close(store.document.layout.entities[table.id].transform.scale,[2,2,2]);
  assert.equal(store.document.layout.entities[lamp.id].surfaceId,table.id); store.undo(); assert.deepEqual(store.document,before);
  assert.throws(()=>store.execute('group.transform',{ id:'unit',transform:{ ...original,scale:[2,1,1] } }),/uniforme/); assert.deepEqual(store.document,before);
});

test('supported items and lights are included without double carrying; nested units preserve selection and deletion',()=>{
  const data=fixture(),{store,table}=data;
  const pair=createToken({ surfaceId:table.id,position:[0,1,0] }); store.execute('token.add',{ ...pair,snap:false });
  const light=createLight({ surfaceId:table.id,position:[0,2,0] }); store.execute('light.add',{ light });
  bind(data); assert.equal(assemblyMembers(store.document,'unit').length,4);
  const extra=createEntity('prop',{ position:[3,0,0] }); store.execute('entity.add',{ entity:extra,snap:false });
  store.execute('group.bind',{ id:'outer',ids:['unit',extra.id] }); assert.equal(assemblyFor(store.document,table.id).id,'outer');
  const before=clone(store.document),transform=clone(before.layout.groups.outer.transform); transform.position[0]+=2;
  store.execute('group.transform',{ id:'outer',transform,snap:false });
  close(store.document.tokens[pair.token.id].transform.position,[2,1,0]); close(store.document.look.lights[light.id].position,[2,2,0]);
  close(store.document.layout.groups.unit.transform.position,[before.layout.groups.unit.transform.position[0]+2,...before.layout.groups.unit.transform.position.slice(1)]);
  store.execute('group.delete',{ id:'outer' }); assert.equal(Object.keys(store.document.layout.groups).length,0); assert.equal(Object.keys(store.document.layout.entities).length,0); assert.equal(store.document.tokens[pair.token.id],undefined); store.undo(); validateDocument(store.document);
});

test('locks prevent assembly creation or transforms atomically',()=>{
  const data=fixture(),{store,table,lamp}=data;
  store.execute('entity.update',{ id:lamp.id,patch:{ locked:true } }); const before=clone(store.document);
  assert.throws(()=>bind(data),/bloqueado/); assert.deepEqual(store.document,before);
  store.execute('entity.update',{ id:lamp.id,patch:{ locked:false } }); bind(data);
  store.execute('entity.update',{ id:table.id,patch:{ locked:true } }); const locked=clone(store.document), transform=clone(locked.layout.groups.unit.transform); transform.position[0]+=1;
  assert.throws(()=>store.execute('group.transform',{ id:'unit',transform }),/bloqueado/); assert.deepEqual(store.document,locked);
});

test('duplicating and pasting a deleted assembly preserve internal references with fresh IDs',()=>{
  const data=fixture(),{store,table,lamp}=data; bind(data); const copied=clone(store.document);
  store.execute('group.duplicate',{ id:'unit',offset:[3,0,0] }); const newGroup=Object.values(store.document.layout.groups).find(group=>group.id!=='unit');
  const members=assemblyMembers(store.document,newGroup.id), newTable=members.find(item=>item.supportHeight), newLamp=members.find(item=>item.surfaceId===newTable.id);
  assert.ok(newLamp); assert.notEqual(newTable.id,table.id); close(newTable.transform.position,[3,0,0]); close(newLamp.transform.position,[4,1,0]); assert.equal(store.document.layout.entities[lamp.id].surfaceId,table.id);
  store.execute('group.delete',{ id:'unit' }); store.execute('group.paste',{ id:'unit',document:copied,offset:[5,0,0] }); validateDocument(store.document);
  const imported=Object.values(store.document.layout.groups).find(group=>group.id!==newGroup.id); assert.equal(assemblyMembers(store.document,imported.id).length,2);
});

test('assemblies persist, duplicate with documents, and public projection retains only visible component geometry',()=>{
  const data=fixture(); bind(data); const json=JSON.parse(JSON.stringify(data.store.document)); validateDocument(json);
  const copy=duplicateDocument(json); const group=Object.values(copy.layout.groups)[0]; assert.equal(assemblyMembers(copy,group.id).length,2); assert.deepEqual(group.transform,json.layout.groups.unit.transform);
  const publicDoc=projectPresentation(json); assert.equal(Object.keys(publicDoc.layout.groups).length,0); assert.equal(Object.keys(publicDoc.layout.entities).length,2); validateDocument(publicDoc);
  data.store.execute('group.update',{ id:'unit',patch:{ visible:false } }); assert.equal(Object.keys(projectPresentation(data.store.document).layout.entities).length,0);
});

test('wall fixations remain independent and external sockets require inclusion of their host',()=>{
  const data=fixture(),{store,table,lamp}=data, wall=createEntity('wall'); store.execute('entity.add',{ entity:wall });
  store.execute('entity.update',{ id:lamp.id,patch:{ anchor:{ hostId:wall.id,socket:'wall',offset:[1,1,.15] },surfaceId:null } });
  assert.throws(()=>bind(data),/parede\/teto/); store.execute('group.bind',{ id:'unit',ids:[table.id,lamp.id,wall.id] });
  const t=clone(store.document.layout.groups.unit.transform); t.scale=[2,2,2]; store.execute('group.transform',{ id:'unit',transform:t,snap:false }); validateDocument(store.document);
  assert.equal(store.document.layout.entities[lamp.id].anchor.hostId,wall.id);
});
