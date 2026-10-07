import * as THREE from 'three';
import { lightPhaseActive } from '../domain/dynamic-lighting.js';
import { createLightObject, updateLightEffects } from './lighting.js';
const emissionBases=new WeakMap();
export function applyBoundEmission(object,record,look){const config=record.illumination;
  object.traverse(mesh=>{if(!mesh.isMesh||mesh.userData.decorative)return;for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
    if(!m?.isMeshStandardMaterial)continue;const base=emissionBases.get(m);if(base){m.emissive.copy(base.color);m.emissiveIntensity=base.intensity;}
    const slot=m.name||mesh.userData.materialSlot||'base';
    if(config&&lightPhaseActive(config,look)&&config.emissionSlot!=='none'&&(config.emissionSlot==='base'||config.emissionSlot===slot)){
      if(!base)emissionBases.set(m,{color:m.emissive.clone(),intensity:m.emissiveIntensity});m.emissive.set(config.color);m.emissiveIntensity=config.emissionIntensity;
    }
  }});
}
export function updateBoundLights(document,objects,bindings,seconds,paused,isVisible=r=>objects.get(r.id)?.visible){const descriptors=[],look=document.look??document.defaultLook;
  for(const [id,b]of bindings)if(!document.layout.entities[id]?.illumination||!objects.has(id)){const host=objects.get(id);if(host)applyBoundEmission(host,document.layout.entities[id],look);b.wrapper.clear();bindings.delete(id);}
  for(const record of Object.values(document.layout.entities)){
    const config=record.illumination,host=objects.get(record.id);if(!host||!config)continue;applyBoundEmission(host,record,look);
    let b=bindings.get(record.id);const lightRecord={...config,id:record.id+':source',enabled:lightPhaseActive(config,look),shadowEnabled:config.shadowPolicy!=='off'};
    if(!b||b.wrapper.userData.lightRecord.type!==config.type){b?.wrapper.clear();const wrapper=createLightObject({...lightRecord,position:config.position},{helper:false});wrapper.userData.source.removeFromParent();b={wrapper};bindings.set(record.id,b);}
    const wrapper=b.wrapper,source=wrapper.userData.source;wrapper.userData.lightRecord=lightRecord;wrapper.position.fromArray(config.position);wrapper.quaternion.fromArray(config.rotation);wrapper.updateMatrix();host.updateWorldMatrix(true,false);wrapper.matrixWorld.multiplyMatrices(host.matrixWorld,wrapper.matrix);wrapper.matrixAutoUpdate=false;wrapper.matrixWorldAutoUpdate=false;wrapper.visible=isVisible(record);for(let p=host.parent;p;p=p.parent)if(!p.visible)wrapper.visible=false;
    source.color.set(config.color);updateLightEffects([wrapper],seconds,paused);descriptors.push({id:lightRecord.id,wrapper,source,record:lightRecord});
  }
  return descriptors;
}
