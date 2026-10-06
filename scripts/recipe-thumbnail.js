import {deflateSync} from 'node:zlib';

// Offline rasterization of the same sorted recipe faces. Dense needles otherwise
// produced multi-megabyte SVGs and tens of thousands of DOM drawing primitives.
export function rasterThumbnail(triangles) {
  const width=320,height=308,pixels=Buffer.alloc(width*height*3);
  for(let i=0;i<pixels.length;i+=3){pixels[i]=32;pixels[i+1]=39;pixels[i+2]=43;}
  const span=(y,start,end,color)=>{for(let x=Math.max(0,start);x<Math.min(width,end);x++){const i=(y*width+x)*3;pixels[i]=color[0];pixels[i+1]=color[1];pixels[i+2]=color[2];}};
  for(let y=238;y<274;y++){const dy=(y+.5-256)/18;if(Math.abs(dy)<1){const dx=Math.sqrt(1-dy*dy)*102;span(y,Math.ceil(160-dx),Math.ceil(160+dx),[20,27,32]);}}
  for(const triangle of triangles) {
    const points=triangle.points.split(' ').map(pair=>pair.split(',').map(Number).map(v=>v*2)),color=[1,3,5].map(i=>parseInt(triangle.color.slice(i,i+2),16)),min=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1])))),max=Math.min(height,Math.ceil(Math.max(...points.map(p=>p[1]))));
    for(let y=min;y<max;y++) {const row=y+.5,crossings=[];for(let i=0;i<3;i++){const a=points[i],b=points[(i+1)%3];if((a[1]<=row&&b[1]>row)||(b[1]<=row&&a[1]>row))crossings.push(a[0]+(row-a[1])*(b[0]-a[0])/(b[1]-a[1]));}if(crossings.length===2)span(y,Math.ceil(Math.min(...crossings)-.5),Math.ceil(Math.max(...crossings)-.5),color);}
  }
  const crc=buffer=>{let value=0xffffffff;for(const byte of buffer){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const bytes=Buffer.concat([Buffer.from(type),data]),size=Buffer.alloc(4),checksum=Buffer.alloc(4);size.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(bytes));return Buffer.concat([size,bytes,checksum]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
  const rows=Buffer.alloc((width*3+1)*height);for(let y=0;y<height;y++)pixels.copy(rows,y*(width*3+1)+1,y*width*3,(y+1)*width*3);
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 154"><image width="160" height="154" href="data:image/png;base64,${png.toString('base64')}"/></svg>\n`;
}
