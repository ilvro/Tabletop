import {deflateSync} from 'node:zlib';

// Offline rasterization of the recipe faces with a depth buffer. Sorting faces by
// centroid let large chamfered panels paint over the parts in front of them, and
// dense needles produced multi-megabyte SVGs with tens of thousands of polygons.
export function rasterThumbnail(triangles) {
  const width=320,height=308,pixels=Buffer.alloc(width*height*3),depth=new Float32Array(width*height).fill(Infinity);
  for(let i=0;i<pixels.length;i+=3){pixels[i]=32;pixels[i+1]=39;pixels[i+2]=43;}
  for(let y=238;y<274;y++){const dy=(y+.5-256)/18;if(Math.abs(dy)<1){const dx=Math.sqrt(1-dy*dy)*102;for(let x=Math.max(0,Math.ceil(160-dx));x<Math.min(width,Math.ceil(160+dx));x++){const i=(y*width+x)*3;pixels[i]=20;pixels[i+1]=27;pixels[i+2]=32;}}}
  const draw=({points,color,opacity=1})=>{
    const [a,b,c]=points.map(([x,y,z])=>[x*2,y*2,z]),area=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
    if(Math.abs(area)<1e-9)return;
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
    const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
      const px=x+.5,py=y+.5,u=((b[0]-px)*(c[1]-py)-(c[0]-px)*(b[1]-py))/area,v=((c[0]-px)*(a[1]-py)-(a[0]-px)*(c[1]-py))/area,t=1-u-v;
      if(u<0||v<0||t<0)continue;
      const z=u*a[2]+v*b[2]+t*c[2],at=y*width+x;
      if(z>=depth[at])continue;
      // Glass tints what is behind it and leaves the depth untouched.
      if(opacity<1){for(let k=0;k<3;k++)pixels[at*3+k]=Math.round(pixels[at*3+k]*(1-opacity)+rgb[k]*opacity);continue;}
      depth[at]=z;pixels[at*3]=rgb[0];pixels[at*3+1]=rgb[1];pixels[at*3+2]=rgb[2];
    }
  };
  for(const triangle of triangles)if(!(triangle.opacity<1))draw(triangle);
  for(const triangle of triangles.filter(t=>t.opacity<1).sort((a,b)=>b.z-a.z))draw(triangle);
  const crc=buffer=>{let value=0xffffffff;for(const byte of buffer){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const bytes=Buffer.concat([Buffer.from(type),data]),size=Buffer.alloc(4),checksum=Buffer.alloc(4);size.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(bytes));return Buffer.concat([size,bytes,checksum]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
  const rows=Buffer.alloc((width*3+1)*height);for(let y=0;y<height;y++)pixels.copy(rows,y*(width*3+1)+1,y*width*3,(y+1)*width*3);
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 154"><image width="160" height="154" href="data:image/png;base64,${png.toString('base64')}"/></svg>\n`;
}
