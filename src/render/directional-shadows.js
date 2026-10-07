import * as THREE from 'three';
const previous=new WeakMap();
/** Fit sun/moon detail to the useful view, stabilized in light-space texels. */
export function focusDirectionalShadow(wrapper,bounds,camera,target,resolution){
  const light=wrapper.userData.source;if(!light?.isDirectionalLight)return false;
  const extent=bounds.isEmpty()?15:Math.max(8,bounds.getSize(new THREE.Vector3()).length()*.65);
  const view=camera.isOrthographicCamera?(camera.top-camera.bottom)/(2*camera.zoom):camera.position.distanceTo(target)*Math.tan(camera.fov*Math.PI/360);
  const radius=Math.min(extent,48,Math.max(12,Math.ceil(view*Math.max(1,camera.aspect??1)*1.3*2)/2));
  const center=bounds.isEmpty()?target.clone():bounds.clampPoint(target,new THREE.Vector3()),rotation=wrapper.getWorldQuaternion(new THREE.Quaternion());
  const local=center.clone().applyQuaternion(rotation.clone().invert()),texel=radius*2/resolution;
  local.x=Math.round(local.x/texel)*texel;local.z=Math.round(local.z/texel)*texel;center.copy(local).applyQuaternion(rotation);
  const key=JSON.stringify([center.toArray(),rotation.toArray(),radius,resolution]);if(previous.get(light)===key)return false;previous.set(light,key);
  if(light.shadow.mapSize.x!==resolution){light.shadow.map?.dispose();light.shadow.map=null;light.shadow.mapSize.set(resolution,resolution);}
  const direction=new THREE.Vector3(0,1,0).applyQuaternion(rotation);
  light.position.copy(wrapper.worldToLocal(center.clone().addScaledVector(direction,radius*2+20)));light.target.position.copy(wrapper.worldToLocal(center.clone()));
  light.shadow.camera.up.set(0,0,-1).applyQuaternion(rotation);
  Object.assign(light.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius,far:radius*4+60});light.shadow.camera.updateProjectionMatrix();
  light.shadow.normalBias=Math.min(.12,Math.max(.025,texel*.6));light.shadow.needsUpdate=true;wrapper.updateMatrixWorld(true);
  light.userData.shadowFocus={center:center.toArray(),radius,resolution};return true;
}
