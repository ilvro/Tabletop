import * as THREE from 'three';

export const MAX_ZONES=16;
const applied=new WeakSet();
/** Shared uniforms describe simultaneous spatial regions, independent of the viewer. */
export function createLightingZones() {
  // Flat typed arrays: every material carries these uniforms, and arrays of
  // Matrix4/Vector objects are copied element by element on each upload.
  const uniforms={zoneCount:{value:0},zoneInverse:{value:new Float32Array(MAX_ZONES*16)},zoneHalfSize:{value:new Float32Array(MAX_ZONES*3)},zoneFill:{value:new Float32Array(MAX_ZONES*4)},zoneFog:{value:new Float32Array(MAX_ZONES*4)},zoneBlend:{value:new Float32Array(MAX_ZONES).fill(.5)},
    // Reflected light: share of the captured probe per zone and its L0/L1 coefficients (zone-probes.js).
    zoneIndirect:{value:new Float32Array(MAX_ZONES)},zoneSH:{value:new Float32Array(MAX_ZONES*12)}};
  const functions=`uniform int zoneCount;uniform mat4 zoneInverse[16];uniform vec3 zoneHalfSize[16];uniform vec4 zoneFill[16],zoneFog[16];uniform float zoneBlend[16],zoneIndirect[16];uniform vec3 zoneSH[64];
    float zoneWeight(vec3 p,int i){vec3 local=(zoneInverse[i]*vec4(p,1.0)).xyz;vec3 d=zoneHalfSize[i]-abs(local);float border=min(d.x,min(d.y,d.z));return zoneBlend[i]>0.0?smoothstep(0.0,zoneBlend[i],border):step(0.0,border);}`;
  let collection, ordered=[], previous=[], regions=[];
  return {
    uniforms,functions,
    /** Active zones in uniform order, with the point their reflected light is captured from. */
    regions(){return regions;},
    /** True when any active zone carries local fog. */
    hasFog(){for(let i=0;i<uniforms.zoneCount.value;i++)if(uniforms.zoneFog.value[i*4+3]>0)return true;return false;},
    update(document,objects) {
      const entities=document?.layout.entities;if(collection!==entities||!Object.isFrozen(entities)){collection=entities;ordered=Object.values(entities??{}).filter(e=>e.lightingZone?.enabled).sort((a,b)=>a.lightingZone.priority-b.lightingZone.priority||a.id.localeCompare(b.id));}const zones=ordered;let n=0;
      for(const record of zones){const object=objects.get(record.id);if(!object)continue;let visible=true;for(let o=object;o;o=o.parent)if(!o.visible)visible=false;if(!visible)continue;
        object.updateWorldMatrix(true,false);const configKey=Object.isFrozen(record.lightingZone)?record.lightingZone:JSON.stringify(record.lightingZone),last=previous[n];if(last?.record===record&&last.configKey===configKey&&last.object===object&&last.matrix.equals(object.matrixWorld)){if(++n===MAX_ZONES)break;continue;}previous[n]={record,configKey,object,matrix:object.matrixWorld.clone()};const z=record.lightingZone,m=object.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(...z.position));
        // The probe looks from standing height rather than from the centre of whatever furniture sits mid-room.
        const centre=new THREE.Vector3().setFromMatrixPosition(m);regions[n]={id:record.id,indirect:z.indirect??0,key:JSON.stringify([z.position,z.size,m.elements.map(v=>Math.round(v*1e3)/1e3)]),radius:Math.max(...z.size)/2,probe:centre.clone().setY(centre.y-z.size[1]/2+Math.min(z.size[1]*.6,1.6))};
        m.invert().toArray(uniforms.zoneInverse.value,n*16);uniforms.zoneHalfSize.value.set(z.size.map(v=>v*.5),n*3);uniforms.zoneBlend.value[n]=z.blend;
        uniforms.zoneFill.value.set([...new THREE.Color(z.color).toArray(),z.intensity],n*4);uniforms.zoneFog.value.set([...new THREE.Color(z.fogColor).toArray(),z.fogDensity],n*4);if(++n===MAX_ZONES)break;
      }
      previous.length=regions.length=n;uniforms.zoneCount.value=n;
    },
    apply(object) {
      if(!uniforms.zoneCount.value)return;
      object.traverse(mesh=>{if(!mesh.isMesh||mesh.userData.decorative)return;for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
        if(!mat?.isMeshStandardMaterial||applied.has(mat))continue;applied.add(mat);const compile=mat.onBeforeCompile,key=mat.customProgramCacheKey();
        mat.onBeforeCompile=shader=>{compile.call(mat,shader);Object.assign(shader.uniforms,uniforms);
          shader.vertexShader='varying vec3 lightingWorldPosition;\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
            vec4 zoneWorld=vec4(transformed,1.0);
            #ifdef USE_BATCHING
              zoneWorld=batchingMatrix*zoneWorld;
            #endif
            #ifdef USE_INSTANCING
              zoneWorld=instanceMatrix*zoneWorld;
            #endif
            lightingWorldPosition=(modelMatrix*zoneWorld).xyz;`);
          shader.fragmentShader='varying vec3 lightingWorldPosition;\n'+functions+'\n'+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#if defined(RE_IndirectDiffuse)\nvec3 zoneNormal=inverseTransformDirection(geometryNormal,viewMatrix);for(int zi=0;zi<16;zi++){if(zi>=zoneCount)break;float zw=zoneWeight(lightingWorldPosition,zi);vec3 zoneLight=zoneFill[zi].rgb*zoneFill[zi].a*PI;if(zoneIndirect[zi]>0.0){vec3 reflected=max(vec3(0.0),zoneSH[zi*4]*0.886227+1.023328*(zoneSH[zi*4+1]*zoneNormal.y+zoneSH[zi*4+2]*zoneNormal.z+zoneSH[zi*4+3]*zoneNormal.x));zoneLight=mix(zoneLight,reflected,zoneIndirect[zi]);}irradiance=mix(irradiance,zoneLight,zw);iblIrradiance*=1.0-zw;}\n#endif\n#include <lights_fragment_end>`);
        };mat.customProgramCacheKey=()=>key+'|zones-v2';mat.needsUpdate=true;
      }});
    },
  };
}
