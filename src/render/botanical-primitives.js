import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const rng=seed=>{let s=(seed>>>0)+1;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};};
const validSeed=seed=>Number.isInteger(seed)&&seed>=0&&seed<=65535;
const finish=g=>{g.deleteAttribute('normal');g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;};
function join(parts) {const flat=parts.map(g=>g.index?g.toNonIndexed():g.clone()),g=mergeGeometries(flat);for(const p of [...parts,...flat])p.dispose();g.computeBoundingBox();g.computeBoundingSphere();return g;}

/** Closed, curved wood with a tapered profile and local knots; never rebuilt per frame. */
export function createBranchGeometry({points,radius=.06,tipRadius=.004,segments=14,sides=7,seed=42,forks=0}={}) {
  if(!Array.isArray(points)||points.length<2||points.length>12||points.some(p=>!Array.isArray(p)||p.length!==3||p.some(v=>!Number.isFinite(v)||Math.abs(v)>100))||points.some((p,i)=>i&&new THREE.Vector3(...p).distanceTo(new THREE.Vector3(...points[i-1]))<.001)||!validSeed(seed)||!Number.isFinite(radius)||radius<.002||radius>1||!Number.isFinite(tipRadius)||tipRadius<.001||tipRadius>radius||!Number.isInteger(segments)||segments<4||segments>48||!Number.isInteger(sides)||sides<5||sides>12||!Number.isInteger(forks)||forks<0||forks>8)throw new Error('Ramo inválido.');
  const random=rng(seed),curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');
  function tube(path,r,end,n) {
    const g=new THREE.TubeGeometry(path,n,1,sides,false),p=g.attributes.position,positions=Array.from(p.array),uv=Array.from(g.attributes.uv.array),indices=Array.from(g.index.array);
    for(let i=0;i<=n;i++) {const t=i/n,center=path.getPointAt(t),width=THREE.MathUtils.lerp(r,end,t)*(1+.13*Math.sin(t*11+seed));
      for(let j=0;j<=sides;j++) {const k=i*(sides+1)+j,offset=new THREE.Vector3().fromBufferAttribute(p,k).sub(center).multiplyScalar(width*(1+.08*Math.sin(j/sides*Math.PI*6+t*17+seed)));positions.splice(k*3,3,...center.clone().add(offset).toArray());}
    }
    // End caps keep broken tips and roots solid even from close cameras.
    for(const [ring,reverse] of [[0,false],[n,true]]) {const center=path.getPointAt(ring/n),idx=positions.length/3;positions.push(...center.toArray());uv.push(.5,ring/n);for(let j=0;j<sides;j++){const a=ring*(sides+1)+j,b=a+1;indices.push(...(reverse?[idx,b,a]:[idx,a,b]));}}
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);return finish(g);
  }
  const parts=[tube(curve,radius,tipRadius,segments)];
  for(let i=0;i<forks;i++) {const t=.22+(i+.35)*.65/(forks+.5),root=curve.getPointAt(t),tangent=curve.getTangentAt(t),length=curve.getLength()*(.18+random()*.19)*(1-t*.5),side=new THREE.Vector3(-tangent.z,.35+random()*.5,tangent.x).normalize().multiplyScalar(i%2?-1:1);side.y=Math.abs(side.y);const end=root.clone().addScaledVector(side,length).addScaledVector(tangent,length*.35),mid=root.clone().lerp(end,.5);mid.y+=length*.12;parts.push(tube(new THREE.CatmullRomCurve3([root,mid,end]),radius*(1-t)*.55,Math.max(.001,tipRadius*.65),8));}
  const result=join(parts);result.userData.branch={seed,forks};return result;
}

/** Needle-bearing branchlets occupy a volume, with crossed blades around each twig. */
export function createConiferGeometry({size=[1,.4,.65],seed=42,count=60}={}) {
  if(!Array.isArray(size)||size.length!==3||!size.every(v=>Number.isFinite(v)&&v>0)||!validSeed(seed)||!Number.isInteger(count)||count<12||count>120)throw new Error('Agulhas inválidas.');
  const random=rng(seed),positions=[],uv=[];
  const triangle=(a,b,c)=>{positions.push(...a.toArray(),...b.toArray(),...c.toArray());uv.push(0,0,1,0,.5,1);};
  for(let i=0;i<count;i++) {
    const t=random(),side=i%2?1:-1,root=new THREE.Vector3(t-.5,(random()-.5)*.18,0),axis=new THREE.Vector3(.35+random()*.3,.08+random()*.18,side*(.45+random()*.4)).normalize(),length=.16+random()*.2,up=new THREE.Vector3(0,1,0),cross=new THREE.Vector3().crossVectors(axis,up).normalize();
    // Thin woody-looking needles at the core, plus six broad, bent needle sprays.
    const end=root.clone().addScaledVector(axis,length);triangle(root.clone().addScaledVector(cross,.008),root.clone().addScaledVector(cross,-.008),end);
    for(let j=0;j<4;j++)for(const sign of [-1,1]) {
      const start=root.clone().addScaledVector(axis,length*(j+.5)/5),angle=sign*(.75+random()*.6)+i*2.399,radial=cross.clone().multiplyScalar(Math.cos(angle)).addScaledVector(up,Math.sin(angle)),tip=start.clone().addScaledVector(radial,.07+random()*.07).addScaledVector(axis,.035),width=radial.clone().cross(axis).normalize().multiplyScalar(.009+random()*.007),mid=start.clone().lerp(tip,.55);mid.y+=.012;
      const a=start.clone().sub(width.clone().multiplyScalar(.35)),b=start.clone().add(width.clone().multiplyScalar(.35)),c=mid.clone().sub(width),d=mid.clone().add(width);triangle(a,b,c);triangle(b,d,c);triangle(c,d,tip);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeBoundingBox();const bounds=g.boundingBox.clone(),extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),p=g.attributes.position;
  for(let i=0;i<p.count;i++)p.setXYZ(i,(p.getX(i)-center.x)*size[0]/extent.x,(p.getY(i)-bounds.min.y)*size[1]/extent.y,(p.getZ(i)-center.z)*size[2]/extent.z);
  finish(g);g.userData.foliage={style:'conifer',seed,count};
  // A coarse upper envelope lets snow collect over interlocking needles as a bough,
  // instead of generating thousands of isolated snow prisms on individual blades.
  const snowPositions=[],snowIndices=[],nx=12,nz=6,heights=[];
  for(let x=0;x<=nx;x++)for(let z=0;z<=nz;z++) {
    const px=(x/nx-.5)*size[0],pz=(z/nz-.5)*size[2]*(.14+.86*Math.sin(Math.PI*x/nx)**.65);let highest=0;
    for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-px)<size[0]/nx*1.25&&Math.abs(p.getZ(i)-pz)<size[2]/nz*1.25)highest=Math.max(highest,p.getY(i));
    snowPositions.push(px,highest+.008,pz);heights.push(highest+.008);
  }
  // Smooth a conservative upper envelope, rather than transferring every needle peak.
  const upper=heights.map((_,i)=>{const x=Math.floor(i/(nz+1)),z=i%(nz+1);let max=0;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const xx=Math.max(0,Math.min(nx,x+dx)),zz=Math.max(0,Math.min(nz,z+dz));max=Math.max(max,heights[xx*(nz+1)+zz]);}return max;});
  for(let i=0;i<upper.length;i++){const x=Math.floor(i/(nz+1)),z=i%(nz+1);let sum=upper[i]*2,count=2;for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=Math.max(0,Math.min(nx,x+dx)),zz=Math.max(0,Math.min(nz,z+dz));sum+=upper[xx*(nz+1)+zz];count++;}snowPositions[i*3+1]=Math.max(heights[i],sum/count)+.006;}
  for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){const a=x*(nz+1)+z; snowIndices.push(a,a+1,a+nz+2,a,a+nz+2,a+nz+1);}
  g.userData.snowProxy={positions:snowPositions,indices:snowIndices};return g;
}

/** Solid chipped board, including its end grain and actual thickness. */
export function createTimberGeometry({size=[1,.12,.25],seed=42,damage=.3}={}) {
  if(!Array.isArray(size)||size.length!==3||!size.every(v=>Number.isFinite(v)&&v>0)||!validSeed(seed)||!Number.isFinite(damage)||damage<0||damage>1)throw new Error('Tábua inválida.');
  const random=rng(seed),shape=new THREE.Shape(),w=size[0]/2,d=size[2]/2,chip=damage*size[0]*.12;
  shape.moveTo(-w,-d);shape.lineTo(w-chip*random(),-d);shape.lineTo(w-chip*(.25+random()),-d*.3);shape.lineTo(w,d*.12);shape.lineTo(w-chip*random(),d);shape.lineTo(-w+chip*random(),d);shape.lineTo(-w+chip*(.2+random()),d*.2);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:size[1],bevelEnabled:false,curveSegments:1});g.rotateX(-Math.PI/2);g.translate(0,-size[1]/2,0);return finish(g);
}

/** Curved stave shell sector. Independent boards leave narrow readable seams. */
export function createStaveGeometry({height=.95,radius=.43,start=0,end=.4,thickness=.035,segments=8,bulge=.21,angularSegments=3}={}) {
  if(![height,radius,start,end,thickness,bulge].every(Number.isFinite)||height<=0||radius<=0||thickness<=0||thickness>=radius*.3||end<=start||end-start>Math.PI/2+.000001||bulge<0||bulge>.5||!Number.isInteger(segments)||segments<4||segments>20||!Number.isInteger(angularSegments)||angularSegments<2||angularSegments>16)throw new Error('Aduela inválida.');
  const positions=[],uv=[],indices=[],slices=angularSegments;
  for(let inner=0;inner<2;inner++)for(let y=0;y<=segments;y++)for(let j=0;j<=slices;j++) {const t=y/segments,r=radius*(1-bulge+bulge*Math.sin(Math.PI*t))-inner*thickness,angle=THREE.MathUtils.lerp(start,end,j/slices);positions.push(Math.cos(angle)*r,height*t,Math.sin(angle)*r);uv.push(j/slices,t);}
  const stride=slices+1,layer=(segments+1)*stride,quad=(a,b,c,d)=>indices.push(a,b,c,a,c,d);
  for(let y=0;y<segments;y++)for(let j=0;j<slices;j++){const a=y*stride+j;quad(a,a+stride,a+stride+1,a+1);quad(a+layer,a+layer+1,a+layer+stride+1,a+layer+stride);}
  for(let y=0;y<segments;y++){const a=y*stride,b=a+slices;quad(a,a+layer,a+layer+stride,a+stride);quad(b,b+stride,b+layer+stride,b+layer);}
  for(let j=0;j<slices;j++){quad(j,j+1,j+layer+1,j+layer);const a=segments*stride+j;quad(a,a+layer,a+layer+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);return finish(g);
}
