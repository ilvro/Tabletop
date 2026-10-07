import * as THREE from 'three';
import { disposeObject } from './asset-cache.js';
export function createReflectionEnvironment(renderer,scene) {
  let target,generator,key;
  return {
    configure(look,enabled=true){const r=look?.rendering;if(!enabled||!r?.reflections){scene.environment=null;target?.dispose();generator?.dispose();target=generator=null;key=null;return;}
      scene.environmentIntensity=r.reflectionIntensity??.35;const next=JSON.stringify([look.fill,look.sky?.topColor,look.sky?.horizonColor]);if(key===next)return;
      target?.dispose();generator??=new THREE.PMREMGenerator(renderer);const world=new THREE.Scene();
      const mat=new THREE.ShaderMaterial({side:THREE.BackSide,uniforms:{top:{value:new THREE.Color(look.fill.skyColor)},bottom:{value:new THREE.Color(look.fill.groundColor)}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 p;uniform vec3 top,bottom;void main(){gl_FragColor=vec4(mix(bottom,top,smoothstep(-.3,.5,normalize(p).y)),1.0);}'});
      world.add(new THREE.Mesh(new THREE.SphereGeometry(10,24,12),mat));
      for(const [x,y,z]of [[-3,4,-3],[4,2,2]]){const panel=new THREE.Mesh(new THREE.PlaneGeometry(3,2),new THREE.MeshBasicMaterial({color:new THREE.Color(3,3,3),side:THREE.DoubleSide}));panel.position.set(x,y,z);panel.lookAt(0,0,0);world.add(panel);}
      target=generator.fromScene(world,0,.1,30,{size:64});for(const o of [...world.children])disposeObject(o);scene.environment=target.texture;key=next;
    },
    dispose(){scene.environment=null;target?.dispose();generator?.dispose();},
  };
}
