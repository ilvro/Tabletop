import * as THREE from 'three';
import { QUALITY, selectLightBudget } from '../domain/dynamic-lighting.js';
import { createProjectionLibrary } from './light-projections.js';

/** Fixed local-light cardinality per quality; authored sources remain lightweight descriptors. */
export function createLightManager(scene) {
  let quality={...QUALITY.balanced},tier='balanced',pool=[],previous=new Set(),diagnostics={tier:'balanced',quality:{...QUALITY.balanced},authored:0,active:0,omitted:0,shadowViews:0,shadowed:[],sources:[],projectionTextures:0,pool:0};const projections=createProjectionLibrary();let dirty=null;
  const disposeSlot=s=>{projections.release(s.cookie);s.light.shadow.dispose();s.light.removeFromParent();s.target?.removeFromParent();};
  function reset(){for(const s of pool)disposeSlot(s);pool=[];previous.clear();}
  function allocate(){if(pool.length)return;for(const type of ['point','spot'])for(let i=0;i<quality.locals;i++){
    const light=type==='point'?new THREE.PointLight(0xffffff,0,1,2):new THREE.SpotLight(0xffffff,0,1,Math.PI/4,.5,2);let target;
    if(type==='spot'){target=new THREE.Object3D();scene.add(target);light.target=target;}
    light.shadow.autoUpdate=false;light.shadow.camera.layers.enable(31);light.shadow.normalBias=.035;light.shadow.bias=-.00008;scene.add(light);pool.push({type,light,target,id:null,cookie:null,key:null});
  }}
  const active=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
  return {
    setQuality(value,custom={}) {if(!QUALITY[value])throw new Error('Qualidade inválida.');const q={...QUALITY[value],...(value==='custom'?custom:{})};if(!Number.isInteger(q.locals)||q.locals<1||q.locals>24||!Number.isInteger(q.shadowViews)||q.shadowViews<0||q.shadowViews>24||![512,1024,2048].includes(q.mapSize))throw new Error('Orçamento de iluminação inválido.');tier=value;quality=q;reset();},
    invalidate(bounds=null){if(bounds===null)dirty=null;else if(dirty!==null)dirty.push(...bounds);},
    update(descriptors,camera,target){if(descriptors.length)allocate();const positions=new Map(),frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      const candidates=descriptors.map(d=>{const r=d.record,position=d.source.position.clone().applyMatrix4(d.wrapper.matrixWorld);positions.set(d.id,position);const radius=r.distance||200;
        return {...d,type:r.type,priority:r.priority??10,shadowPolicy:r.shadowPolicy??(r.shadowEnabled?'auto':'off'),shadowEnabled:r.shadowEnabled,active:active(d.wrapper)&&d.source.intensity>0,score:frustum.intersectsSphere(new THREE.Sphere(position,radius))?d.source.intensity/(1+position.distanceToSquared(target)):0};});
      const result=selectLightBudget(candidates,quality,previous),wanted=new Set(result.selected.map(c=>c.id));
      // Keep assignments to avoid swapping shadow caches as camera contribution changes.
      for(const s of pool)if(!wanted.has(s.id)||result.selected.find(d=>d.id===s.id)?.type!==s.type){s.id=null;s.key=null;s.light.intensity=0;s.light.castShadow=false;projections.release(s.cookie);s.cookie=null;s.light.map=null;}
      for(const d of result.selected){let s=pool.find(s=>s.id===d.id)??pool.find(s=>!s.id&&s.type===d.type);if(!s)continue;s.id=d.id;const l=s.light,r=d.record,p=positions.get(d.id),shadow=result.shadows.has(d.id),resolution=Math.min(r.mapSize??quality.mapSize,quality.mapSize);
        const end=d.wrapper.localToWorld(new THREE.Vector3(0,-1,0));const key=JSON.stringify([d.id,p.toArray(),end.toArray(),r.distance,r.angle,resolution,shadow]);
        const moved=s.key!==key;const affected=dirty===null||dirty.some(b=>b.intersectsSphere(new THREE.Sphere(p,r.distance||200)));
        if(l.shadow.mapSize.x!==resolution){l.shadow.map?.dispose();l.shadow.map=null;l.shadow.mapSize.set(resolution,resolution);}
        l.position.copy(p);l.color.copy(d.source.color);l.intensity=d.source.intensity;l.distance=r.distance;l.decay=2;l.castShadow=shadow;l.shadow.camera.near=.1;l.shadow.camera.far=Math.max(.2,r.distance||30);l.shadow.needsUpdate=shadow&&(moved||affected||!l.shadow.map);
        if(s.target){s.target.position.copy(end);l.angle=r.angle??Math.PI/4;l.penumbra=r.penumbra??.5;const pattern=shadow?r.projection??'none':'none',cookieKey=[pattern,r.projectionSeed??42,r.projectionRotation??0].join(':');
          if(s.cookie?.key!==cookieKey){projections.release(s.cookie);s.cookie=projections.acquire(pattern,r.projectionSeed,r.projectionRotation);l.map=s.cookie?.texture??null;}
        }s.key=key;
      }
      previous=wanted;dirty=[];diagnostics={tier,quality:{...quality},authored:descriptors.length,active:result.selected.length,omitted:result.omitted,shadowViews:result.views,shadowed:[...result.shadows],sources:result.selected.map(d=>d.id),projectionTextures:projections.size,pool:pool.length};
    },
    volumeLights(){return pool.filter(s=>s.id&&s.light.intensity>0).sort((a,b)=>Number(b.light.castShadow)-Number(a.light.castShadow)).slice(0,4).map(s=>s.light);},
    needsShadowUpdate(){return pool.some(s=>s.light.castShadow&&s.light.shadow.needsUpdate);},
    get quality(){return quality;},info(){return diagnostics;},dispose(){reset();projections.dispose();},
  };
}
