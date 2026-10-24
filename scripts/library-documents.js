/**
 * Papers to pick up and read: each model has a `page` slot that shows the first page of the
 * prop's inspectable content on the table, and the page being read in the inspection.
 * Lying flat, top of the page toward −Z, so a reader in front of the table reads it upright.
 */
export function addDocumentsLibrary({add,timeless}) {
  const ids=new Set(),materials={
    page:{color:'#ebe7dc',roughness:.9},paper:{color:'#d8c69f',roughness:.92},white:{color:'#eeece5',roughness:.6},
    leather:{color:'#4a2f22',roughness:.8},manila:{color:'#caa66c',roughness:.92},wax:{color:'#7c1d1a',roughness:.45},
  };
  const box=(size,position,material,rotation)=>({shape:'box',size,position,material,...(rotation?{rotation}:{})});
  const model=(id,name,tags,parts,description)=>{const a=add('document-'+id,name,'Documentos / Papéis',timeless,['Escritório','Casa','Delegacia','Arquivo'],['documento','pista','papel',...tags],parts,description);a.materials=materials;ids.add(a.id);};
  model('sheet','Folha · A4',['carta','folha'],[box([.21,.0012,.297],[0,.0006,0],'page')],
    'Uma folha A4 solta. Ative Inspecionável para escrever a carta ou colocar uma imagem: a primeira página aparece na folha.');
  // Four strips at alternating angles: the creases of a sheet crumpled and smoothed out again.
  const L=.297/4;
  model('crumpled','Folha · amassada',['amassado','bilhete'],Array.from({length:4},(_,i)=>box([.21-(i%2)*.004,.0012,L*1.04],[(i%2)*.002-.001,.006+(i%2)*.004,-.297/2+(i+.5)*L],'page',[(i%2?-1:1)*.11,(i-1.5)*.012,(i%3-1)*.02])),
    'Folha que foi amassada e desamassada: vincos em quatro faixas. Lê-se inteira na inspeção.');
  model('envelope','Envelope · com carta',['envelope','carta','correio'],[
    box([.229,.003,.114],[0,.0015,.03],'paper'),box([.16,.0014,.06],[0,.0032,.0],'paper',[0,0,0]),{shape:'cylinder',radiusTop:.012,radiusBottom:.013,height:.003,position:[0,.0045,.035],material:'wax',segments:16},
    box([.2,.001,.255],[.03,.0068,-.07],'page',[0,.1,0])],
    'Envelope com lacre e a carta aberta por cima. A carta é a página do documento.');
  model('photo','Foto · instantânea',['foto','fotografia','polaroide'],[box([.088,.0016,.107],[0,.0008,0],'white'),box([.079,.0018,.079],[0,.0009,-.0095],'page')],
    'Foto instantânea de moldura branca. Use o papel Foto e uma imagem importada; o texto vira legenda escrita à mão.');
  model('clipping','Recorte · de jornal',['jornal','notícia','recorte'],[box([.15,.0008,.2],[0,.0004,0],'page')],
    'Recorte de jornal de bordas rasgadas. No papel Jornal, a primeira linha do texto é a manchete e o resto corre em duas colunas.');
  model('notebook','Caderno · aberto',['caderno','diário','anotações'],[
    box([.152,.003,.214],[-.077,.0015,0],'leather'),box([.152,.003,.214],[.077,.0015,0],'leather'),{shape:'cylinder',radiusTop:.006,radiusBottom:.006,height:.214,position:[0,.005,0],rotation:[Math.PI/2,0,0],material:'leather',segments:12},
    box([.145,.008,.205],[-.075,.007,0],'paper'),box([.145,.0072,.205],[.075,.0066,0],'paper'),box([.145,.0008,.205],[.075,.0106,0],'page')],
    'Caderno de capa de couro aberto: a página da direita mostra o documento. Combina com o papel Caderno pautado.');
  model('folder','Pasta · de arquivo',['pasta','arquivo','dossiê','relatório'],[
    box([.235,.002,.31],[.12,.001,0],'manila'),box([.08,.002,.022],[.17,.001,-.165],'manila'),box([.235,.002,.31],[-.122,.001,0],'manila'),
    box([.21,.001,.297],[.12,.0025,0],'page')],
    'Pasta de papelão aberta com um relatório sobre a aba direita. O relatório é a página do documento.');
  return ids;
}
