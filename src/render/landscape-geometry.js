import * as THREE from 'three';

/** A true extruded voussoir/arch sector, with an open passage between its radii. */
export function createArchGeometry({innerRadius=1,outerRadius=1.4,start=0,end=Math.PI,depth=.6,segments=8}={}) {
  if(![innerRadius,outerRadius,start,end,depth].every(Number.isFinite)||innerRadius<=0||outerRadius<=innerRadius||depth<=0||end<=start||end-start>Math.PI*2||!Number.isInteger(segments)||segments<1||segments>32)throw new Error('Arco inválido.');
  const shape=new THREE.Shape();shape.moveTo(Math.cos(start)*outerRadius,Math.sin(start)*outerRadius);
  shape.absarc(0,0,outerRadius,start,end,false);shape.lineTo(Math.cos(end)*innerRadius,Math.sin(end)*innerRadius);
  shape.absarc(0,0,innerRadius,end,start,true);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:segments});geometry.translate(0,0,-depth/2);return geometry;
}

/** Individual bent blades/fronds/needle sprays, rather than cones or solid foliage spheres. */
export function createFoliageGeometry({size=[1,.5,1],style='needles',seed=42,count=32}={}) {
  if(!Array.isArray(size)||size.length!==3||!size.every(v=>Number.isFinite(v)&&v>0)||!Number.isInteger(seed)||seed<0||seed>65535||!['needles','fern','grass','broadleaf'].includes(style)||!Number.isInteger(count)||count<4||count>160)throw new Error('Folhagem inválida.');
  let state=(seed>>>0)+1;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const positions=[],uv=[];
  const blade=(base,tip,width,bend)=>{
    const dir=tip.clone().sub(base),side=new THREE.Vector3(dir.z,.03,-dir.x).normalize().multiplyScalar(width),mid=base.clone().lerp(tip,.48);mid.y+=bend;
    const a=base.clone().sub(side.clone().multiplyScalar(.3)),b=base.clone().add(side.clone().multiplyScalar(.3)),c=mid.clone().sub(side),d=mid.clone().add(side);
    for(const [p,t] of [[a,[0,0]],[b,[1,0]],[c,[0,.5]],[b,[1,0]],[d,[1,.5]],[c,[0,.5]],[c,[0,.5]],[d,[1,.5]],[tip,[.5,1]]]){positions.push(...p.toArray());uv.push(...t);}
  };
  for(let i=0;i<count;i++) {
    const angle=random()*Math.PI*2,r=Math.sqrt(random())*.4,base=new THREE.Vector3(Math.cos(angle)*r,style==='needles'?random()*.2:0,Math.sin(angle)*r);
    if(style==='broadleaf') {
      const center=new THREE.Vector3((random()-.5)*.9,(random()-.5)*.85,(random()-.5)*.9),axis=new THREE.Vector3(Math.cos(angle),random()-.2,Math.sin(angle)).normalize();
      blade(center,center.clone().addScaledVector(axis,.12+random()*.14),.04+random()*.04,.035);
    } else if(style==='fern') {
      const length=.4+random()*.55,axis=new THREE.Vector3(Math.cos(angle),.8+random()*.5,Math.sin(angle)).normalize();
      for(let j=1;j<=7;j++)for(const sign of [-1,1]) {
        const t=j/8,p=base.clone().addScaledVector(axis,length*t),leaf=new THREE.Vector3(-axis.z,.3,axis.x).multiplyScalar(sign*(1-t)*.25);
        blade(p,p.clone().add(leaf).addScaledVector(axis,.04),.024,.02);
      }
    } else if(style==='grass') {
      const tip=base.clone().add(new THREE.Vector3(Math.cos(angle)*(.08+random()*.18),.35+random()*.6,Math.sin(angle)*(.08+random()*.18)));
      blade(base,tip,.012+random()*.012,.06);
    } else {
      const y=random()*.25,tip=base.clone().add(new THREE.Vector3(Math.cos(angle)*(.16+random()*.3),y,Math.sin(angle)*(.16+random()*.3)));
      blade(base,tip,.018+random()*.025,.04);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeBoundingBox();
  const box=geometry.boundingBox,extent=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)p.setXYZ(i,(p.getX(i)-center.x)*size[0]/extent.x,(p.getY(i)-box.min.y)*size[1]/extent.y,(p.getZ(i)-center.z)*size[2]/extent.z);
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.foliage={style,seed,count};return geometry;
}
