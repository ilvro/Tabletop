export function addBackroomsLibrary({add,modern}) {
  const ids=new Set(),materials={paper:{color:'#9b8950',roughness:1},trim:{color:'#776c43',roughness:1},tile:{color:'#d0ccb1',roughness:1},frame:{color:'#8a8974',roughness:.8},tube:{color:'#fff6c4',emissive:'#fff5bb',emissiveIntensity:1.2,roughness:.8}};
  const box=(size,position,material)=>({shape:'box',size,position,material});
  const model=(id,name,parts,description)=>{const a=add('backrooms-'+id,'Backrooms · '+name,'Arquitetura / Backrooms',modern,['Backrooms','Escritório'],['backrooms','liminal',id],parts,description);a.materials=materials;ids.add(a.id);};
  const pattern=[];
  for(const sign of [-1,1])for(let row=0;row<7;row++)for(let col=0;col<7;col++){
    const x=-1.3+col*.42+(row%2)*.07,y=.25+row*.36;
    pattern.push({shape:'profile',contour:[[0,-.075],[-.034,0],[0,.075],[.034,0]],depth:.012,position:[x,y,sign*.107],material:'paper'});
  }
  model('wallpaper','papel de parede e rodapé',[
    ...pattern,...[-1,1].flatMap(s=>[box([3,.12,.022],[0,.06,s*.108],'trim'),box([3,.045,.025],[0,2.775,s*.11],'trim')]),
  ],'Padrão de losangos nas duas faces de uma parede de 3 × 2,8 m e espessura de 20 cm. Não fecha vãos por conta própria.');
  model('ceiling','forro modular de 3 m',[
    box([3,.035,3],[0,.055,0],'frame'),
    ...Array.from({length:25},(_,i)=>box([.587,.05,.587],[(i%5-2)*.6,.025,(Math.floor(i/5)-2)*.6],'tile')),
  ],'Placas acústicas com juntas reais, formando um forro baixo. Ocultar com a camada Coberturas.');
  model('fluorescent','luminária fluorescente dupla',[
    box([1.24,.08,.48],[0,.08,0],'frame'),box([1.15,.025,.4],[0,.035,0],'tile'),
    ...[-.11,.11].map(z=>({shape:'cylinder',radiusTop:.025,radiusBottom:.025,height:1.08,segments:12,position:[0,.025,z],rotation:[0,0,Math.PI/2],material:'tube'})),
    ...[-.57,.57].map(x=>box([.045,.085,.37],[x,.045,0],'frame')),
  ],'Calha com dois tubos luminosos. Fonte real vinculável abaixo das lâmpadas.');
  return ids;
}
