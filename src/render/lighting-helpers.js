import * as THREE from 'three';
import {disposeObject} from './asset-cache.js';

/** Selected-only authoring guides; never published or included in thumbnail/depth shadows. */
export function createLightingHelpers(scene){
  const root=new THREE.Group();root.userData.editHelper=true;scene.add(root);let key='';
  const clear=()=>{for(const child of [...root.children])disposeObject(child);};
  return {
    update(record,host,visible){root.visible=!!visible&&!!host;if(!root.visible)return;
      host.updateWorldMatrix(true,false);const next=JSON.stringify([record?.illumination,record?.lightingZone,host.matrixWorld.toArray()]);if(next===key)return;key=next;clear();
      const lineMaterial=color=>new THREE.LineBasicMaterial({color,transparent:true,opacity:.4,depthTest:false,depthWrite:false,toneMapped:false});
      const source=record?.illumination;if(source){
        const world=host.matrixWorld.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...source.position),new THREE.Quaternion(...source.rotation),new THREE.Vector3(1,1,1))),position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3();world.decompose(position,quaternion,scale);
        const group=new THREE.Group();group.position.copy(position);group.quaternion.copy(quaternion);root.add(group);
        const marker=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),new THREE.MeshBasicMaterial({color:source.color,depthTest:false,depthWrite:false,toneMapped:false}));group.add(marker);
        if(source.type==='point'){
          // Three great circles keep the range readable without covering the scene in triangles.
          const points=[],r=source.distance;for(let plane=0;plane<3;plane++)for(let i=0;i<64;i++)for(const j of [i,i+1]){
            const a=j*Math.PI/32,x=Math.cos(a)*r,y=Math.sin(a)*r;points.push(...(plane===0?[x,0,y]:plane===1?[x,y,0]:[0,x,y]));
          }
          const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));group.add(new THREE.LineSegments(geometry,lineMaterial(source.color)));
        }
        else{const points=[],length=source.distance,radius=Math.tan(source.angle)*length;for(let i=0;i<32;i++){const a=i*Math.PI/16,b=(i+1)*Math.PI/16;points.push(Math.cos(a)*radius,-length,Math.sin(a)*radius,Math.cos(b)*radius,-length,Math.sin(b)*radius);if(i%8===0)points.push(0,0,0,Math.cos(a)*radius,-length,Math.sin(a)*radius);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));group.add(new THREE.LineSegments(geometry,lineMaterial(source.color)));}
      }
      const zone=record?.lightingZone;if(zone?.enabled){const geometry=new THREE.BoxGeometry(1,1,1),edges=new THREE.EdgesGeometry(geometry);geometry.dispose();const box=new THREE.LineSegments(edges,lineMaterial(zone.color));box.matrixAutoUpdate=false;box.matrix.copy(host.matrixWorld).multiply(new THREE.Matrix4().compose(new THREE.Vector3(...zone.position),new THREE.Quaternion(),new THREE.Vector3(...zone.size)));root.add(box);}
      root.traverse(o=>{o.userData.editHelper=true;o.renderOrder=7;});
    },
    dispose(){clear();root.removeFromParent();},
  };
}
