// Small reusable complements needed to close the building, without painted openings.
export function addChurchSceneComplements({add,historic}) {
  const ids=new Set(),stone={color:'#a59888',roughness:.94},carving={color:'#bcae9b',roughness:.9};
  const surface={texture:'stone',textureSize:1.5,textureColorMode:'replace',textureColor:'#a59888',relief:.015};
  const profile=(contour,depth,position=[0,0,0])=>({shape:'profile',contour,depth,position,material:'stone',surface});
  const crown=(r,spring)=>Array.from({length:25},(_,i)=>{const left=i<=12,a=left?Math.PI-i*Math.PI/36:Math.PI/3-(i-12)*Math.PI/36;return [(left?r:-r)+2*r*Math.cos(a),spring+2*r*Math.sin(a)];});
  const model=(id,name,parts,description,materials={stone,carving})=>{
    const a=add(id,name,'Arquitetura / Igreja antiga',historic,['Igreja','Horror gótico'],['igreja antiga','kit gótico','complemento arquitetônico'],parts,description);
    a.materials=materials;ids.add(a.id);
  };
  model('church-ogival-gable','Igreja · empena ogival maciça',[
    profile([[-5.14,0],...crown(5.14,.1),[5.14,0]],.44),
  ],'Fecha as extremidades da cobertura ogival de 10,28 m. Base na linha de arranque; espessura de 44 cm.');
  const r=.95,spring=2.4,w=1.2,h=4.5;
  model('church-window-spandrel','Igreja · alvenaria com vão ogival',[
    profile([[-w,0],[-w,h],[w,h],[w,0],[r,0],...crown(r,spring).reverse(),[-r,0]],.46),
  ],'Preenche os cantos acima de um vitral ogival mantendo a abertura real. Combine com o vitral existente, sem sobrepor uma parede sólida.');
  model('church-double-cross','Igreja · cruz dupla de ferro',[
    {shape:'box',size:[.15,2.4,.12],position:[0,1.2,0],material:'iron'},
    {shape:'box',size:[1.15,.15,.12],position:[0,1.65,0],material:'iron'},
    {shape:'box',size:[.85,.13,.12],position:[0,1.25,0],material:'iron'},
  ],'Cruz dupla original para fachada e conjunto ritual; emissão editável no material, sem símbolo oficial extraído.',{iron:{color:'#8e3336',metalness:.55,roughness:.55,emissive:'#ee2737',emissiveIntensity:.8}});
  model('church-banquet-setting','Igreja · prato e cálice de banquete',[
    {shape:'cylinder',radiusBottom:.18,radiusTop:.2,height:.025,segments:20,position:[-.08,.0125,0],material:'metal'},
    {shape:'ring',radius:.18,tube:.014,segments:20,sides:6,position:[-.08,.03,0],rotation:[Math.PI/2,0,0],material:'metal'},
    {shape:'sphere',radius:.075,position:[-.08,.1,0],material:'food'},
    {shape:'cylinder',radiusBottom:.065,radiusTop:.065,height:.025,segments:12,position:[.19,.0125,.12],material:'metal'},
    {shape:'cylinder',radiusBottom:.016,radiusTop:.016,height:.16,segments:10,position:[.19,.1,.12],material:'metal'},
    {shape:'cylinder',radiusBottom:.04,radiusTop:.075,height:.12,segments:16,position:[.19,.23,.12],material:'metal'},
    {shape:'cylinder',radiusBottom:.065,radiusTop:.065,height:.007,segments:16,position:[.19,.292,.12],material:'food'},
  ],'Prato, alimento estilizado e cálice vermelho como decoração de tampo, sem fonte luminosa.',{metal:{color:'#9c8266',roughness:.5,metalness:.7},food:{color:'#592327',roughness:.65}});
  return ids;
}
