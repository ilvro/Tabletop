import * as THREE from 'three';

export const MAX_ZONES=16;
const applied=new WeakSet();
/** Shared uniforms describe simultaneous spatial regions, independent of the viewer. */
export function createLightingZones() {
  const uniforms={zoneCount:{value:0},zoneInverse:{value:Array.from({length:MAX_ZONES},()=>new THREE.Matrix4())},zoneHalfSize:{value:Array.from({length:MAX_ZONES},()=>new THREE.Vector3())},zoneFill:{value:Array.from({length:MAX_ZONES},()=>new THREE.Vector4())},zoneFog:{value:Array.from({length:MAX_ZONES},()=>new THREE.Vector4())},zoneBlend:{value:Array(MAX_ZONES).fill(.5)}};
  const functions=`uniform int zoneCount;uniform mat4 zoneInverse[16];uniform vec3 zoneHalfSize[16];uniform vec4 zoneFill[16],zoneFog[16];uniform float zoneBlend[16];
    float zoneWeight(vec3 p,int i){vec3 local=(zoneInverse[i]*vec4(p,1.0)).xyz;vec3 d=zoneHalfSize[i]-abs(local);float border=min(d.x,min(d.y,d.z));return zoneBlend[i]>0.0?smoothstep(0.0,zoneBlend[i],border):step(0.0,border);}`;
  return {
    uniforms,functions,
    update(document,objects) {
      const zones=Object.values(document?.layout.entities??{}).filter(e=>e.lightingZone?.enabled&&objects.has(e.id)).sort((a,b)=>a.lightingZone.priority-b.lightingZone.priority||a.id.localeCompare(b.id));let n=0;
      for(const record of zones){const object=objects.get(record.id);let visible=true;for(let o=object;o;o=o.parent)if(!o.visible)visible=false;if(!visible)continue;
        object.updateWorldMatrix(true,false);const z=record.lightingZone,m=object.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(...z.position));
        uniforms.zoneInverse.value[n].copy(m).invert();uniforms.zoneHalfSize.value[n].set(...z.size).multiplyScalar(.5);uniforms.zoneBlend.value[n]=z.blend;
        uniforms.zoneFill.value[n].set(...new THREE.Color(z.color).toArray(),z.intensity);uniforms.zoneFog.value[n].set(...new THREE.Color(z.fogColor).toArray(),z.fogDensity);if(++n===MAX_ZONES)break;
      }
      uniforms.zoneCount.value=n;
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
          shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#if defined(RE_IndirectDiffuse)\nfor(int zi=0;zi<16;zi++){if(zi>=zoneCount)break;float zw=zoneWeight(lightingWorldPosition,zi);irradiance=mix(irradiance,zoneFill[zi].rgb*zoneFill[zi].a*PI,zw);iblIrradiance*=1.0-zw;}\n#endif\n#include <lights_fragment_end>`);
        };mat.customProgramCacheKey=()=>key+'|zones-v1';mat.needsUpdate=true;
      }});
    },
  };
}
