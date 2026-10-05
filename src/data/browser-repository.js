import { ApiError } from './errors.js';
import { applicationURL, resolveAsset, storageScope } from './paths.js';
import { validateDocument, migrateDocument, duplicateDocument } from '../domain/documents.js';
import { validateAssetMetadata } from '../domain/asset-library.js';

const fail = (message, status=422, details) => {throw new ApiError(message,status,details);};
const documentKey = (id,type='scene') => {
  if(!['scene','map','environment'].includes(type) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) fail('Documento inválido.');
  return `${type}:${id}`;
};
const checkRevision = (current,revision,field='revision') => {
  if(!Number.isSafeInteger(revision) || revision<(field==='revision'?1:0)) fail('Revisão inválida.');
  if(current[field]!==revision) fail('Este registro mudou em outra aba. Reabra antes de salvar.',409,{currentRevision:current[field]});
};

/** IndexedDB transactions serialize compare-and-write across tabs, without a server. */
export function createBrowserRepository({databaseName=`tabletop-library-v1:${storageScope()}`,catalogURL=applicationURL('assets/catalog.json'),databaseFactory=globalThis.indexedDB}={}) {
  let catalogPromise;
  const objectURLs=new Map();
  async function builtins() {
    if(!catalogPromise) catalogPromise=(async()=>{
      const response=await fetch(catalogURL);
      if(!response.ok) throw new ApiError('Não foi possível carregar a biblioteca de assets.',response.status);
      const catalog=await response.json(), assets=Array.isArray(catalog)?catalog:catalog.assets;
      if(!Array.isArray(assets)) fail('Catálogo de assets inválido.');
      return assets;
    })().catch(error=>{catalogPromise=null;throw error;});
    return catalogPromise;
  }
  function open() {
    if(!databaseFactory) return Promise.reject(new Error('O navegador não permite armazenar esta mesa. Libere o armazenamento do site.'));
    return new Promise((resolve,reject)=>{
      const request=databaseFactory.open(databaseName,1);
      request.onupgradeneeded=()=>{for(const name of ['documents','assets','metadata','backups'])request.result.createObjectStore(name);};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(new Error('Feche as outras abas do Tabletop para atualizar o armazenamento.'));
    });
  }
  async function transact(stores,mode,action) {
    const db=await open();
    try {
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(stores,mode); let result, failure;
        const stop=error=>{failure=error;tx.abort();};
        tx.oncomplete=()=>resolve(result??null);
        tx.onerror=()=>{failure??=tx.error;};
        tx.onabort=()=>reject(failure??tx.error??new Error('Não foi possível guardar esta mesa no navegador.'));
        try {action(tx,value=>{result=value;},stop);} catch(error) {stop(error);}
      });
    } finally {db.close();}
  }
  const all = store => transact([store],'readonly',(tx,result,stop)=>{
    const request=tx.objectStore(store).getAll();request.onsuccess=()=>result(request.result);request.onerror=()=>stop(request.error);
  });
  async function validateReferences(document) {
    const refs=new Map(), visit=value=>{
      if(!value || typeof value!=='object')return;
      if(value.assetRef)refs.set(`${value.assetRef.id}:${value.assetRef.revision}`,value.assetRef);
      for(const child of Object.values(value))visit(child);
    };
    visit(document);
    if(!refs.size)return;
    const available=new Map([...(await builtins()),...(await all('assets')).map(entry=>entry.asset)].map(asset=>[asset.id,asset]));
    for(const ref of refs.values()) if(available.get(ref.id)?.revision!==ref.revision) fail(`Asset ausente ou revisão indisponível: ${ref.id}. Importe-o antes de salvar.`);
  }
  function archive(tx,key,current) {
    const store=tx.objectStore('backups');
    // A fixed ring keeps the last five revisions in the same atomic save transaction.
    store.put(current,`${key}:${current.revision%5}`);
  }
  async function write(document,create=false) {
    validateDocument(document);
    const copy=migrateDocument(structuredClone(document)), key=documentKey(copy.id,copy.documentType);
    await validateReferences(copy);
    return transact(['documents','backups'],'readwrite',(tx,result,stop)=>{
      const store=tx.objectStore('documents'), request=store.get(key);
      request.onsuccess=()=>{
        try {
          const current=request.result;
          if(create&&current) fail('Já existe um documento com este ID. Salve ou duplique.',409,{currentRevision:current.revision});
          if(!create&&!current)fail('Documento não encontrado.',404);
          if(!create) {checkRevision(current,copy.revision);archive(tx,key,current);}
          const now=new Date().toISOString();
          Object.assign(copy,{revision:create?1:current.revision+1,createdAt:create?now:current.createdAt,updatedAt:now});
          validateDocument(copy);store.put(copy,key);result(copy);
        } catch(error) {stop(error);}
      };
    });
  }
  function blobURL(entry) {
    const key=`${entry.asset.id}:${entry.asset.revision}`;
    if(!objectURLs.has(key)) objectURLs.set(key,URL.createObjectURL(entry.blob));
    return objectURLs.get(key);
  }
  const repository={
    storage:'browser',
    async list(type='scene') {
      if(!['scene','map','environment'].includes(type))fail('Tipo de documento inválido.');
      return (await all('documents')).filter(doc=>doc.documentType===type).map(({id,documentType,name,revision,createdAt,updatedAt})=>({id,documentType,name,revision,createdAt,updatedAt})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
    },
    async read(id,type='scene') {
      const key=documentKey(id,type);
      const doc=await transact(['documents'],'readonly',(tx,result)=>{const request=tx.objectStore('documents').get(key);request.onsuccess=()=>result(request.result);});
      if(!doc)fail('Documento não encontrado.',404);
      return migrateDocument(doc);
    },
    create: document=>write(document,true),
    save: document=>write(document),
    async duplicate(document) {
      const current=await repository.read(document.id,document.documentType);checkRevision(current,document.revision);
      await validateReferences(current);
      const key=documentKey(document.id,document.documentType);
      return transact(['documents'],'readwrite',(tx,result,stop)=>{
        const store=tx.objectStore('documents'),request=store.get(key);
        request.onsuccess=()=>{try {
          if(!request.result)fail('Documento não encontrado.',404);
          checkRevision(request.result,document.revision);
          const copy=duplicateDocument(request.result,{name:`${request.result.name} — cópia`}),now=new Date().toISOString();
          Object.assign(copy,{revision:1,createdAt:now,updatedAt:now});validateDocument(copy);
          store.add(copy,documentKey(copy.id,copy.documentType));result(copy);
        }catch(error){stop(error);}};
      });
    },
    async remove(document) {
      const key=documentKey(document.id,document.documentType);
      return transact(['documents','backups'],'readwrite',(tx,_result,stop)=>{
        const store=tx.objectStore('documents'), request=store.get(key);
        request.onsuccess=()=>{try {if(!request.result)fail('Documento não encontrado.',404);checkRevision(request.result,document.revision);archive(tx,key,request.result);store.delete(key);}catch(error){stop(error);}};
      });
    },
    async assets() {
      const [catalog,imported,metadata]=await Promise.all([builtins(),all('assets'),all('metadata')]);
      const overrides=new Map(metadata.map(entry=>[entry.id,entry.metadata]));
      return [...catalog,...imported.map(entry=>({...entry.asset,url:blobURL(entry)}))].map(asset=>resolveAsset({...asset,metadataRevision:0,favorite:false,...overrides.get(asset.id)}));
    },
    async updateAssetMetadata(asset,patch) {
      const fields=validateAssetMetadata(patch), available=await repository.assets();
      const currentAsset=available.find(item=>item.id===asset.id);
      if(!currentAsset)fail('Asset não encontrado.',404);
      return transact(['metadata'],'readwrite',(tx,result,stop)=>{
        const store=tx.objectStore('metadata'), request=store.get(asset.id);
        request.onsuccess=()=>{try {
          const current=request.result?.metadata??{metadataRevision:0};
          checkRevision(current,asset.metadataRevision??0,'metadataRevision');
          const metadata={...current,...fields,metadataRevision:current.metadataRevision+1};
          store.put({id:asset.id,metadata},asset.id);result({...currentAsset,...metadata});
        }catch(error){stop(error);}};
      });
    },
    async importAsset(file) {
      if(!file || !file.size || file.size>25*1024*1024)fail('Use um arquivo não vazio de até 25 MB.');
      if(typeof file.name!=='string'||!file.name.trim()||file.name.length>160)fail('Nome de asset inválido (máximo 160 caracteres).');
      const extension=file.name.split('.').at(-1).toLowerCase(), mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',glb:'model/gltf-binary'}[extension];
      if(!mime)fail('Use PNG, JPEG, WebP ou GLB estático.',415);
      if(extension==='glb') {
        const bytes=await file.arrayBuffer(), view=new DataView(bytes);
        if(bytes.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength||view.getUint32(16,true)!==0x4e4f534a||20+view.getUint32(12,true)>bytes.byteLength)fail('Use um arquivo GLB 2.0 válido.');
        const json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,view.getUint32(12,true))).trim());
        if([...(json.buffers??[]),...(json.images??[])].some(entry=>entry.uri!==undefined))fail('O GLB deve conter todos os recursos internamente, sem URLs externas.');
        if(json.skins?.length||json.meshes?.some(mesh=>mesh.primitives?.some(p=>p.targets?.length)))fail('Use GLB estático, sem rig ou morph targets.');
        if((json.extensionsUsed??[]).some(e=>!['KHR_materials_unlit','KHR_materials_variants'].includes(e)))fail('GLB com extensão não suportada.');
      } else {const decoded=await createImageBitmap(file);decoded.close();}
      const asset={id:crypto.randomUUID(),revision:1,metadataRevision:0,favorite:false,type:extension==='glb'?'model':'image',name:file.name.trim(),category:'imported',era:'Não definida',contexts:[],tags:[],footprint:[1,1],mimeType:mime,byteLength:file.size};
      const entry={asset,blob:new Blob([file],{type:mime})};
      await transact(['assets'],'readwrite',(tx,result)=>{tx.objectStore('assets').add(entry,asset.id);result(asset);});
      return {...asset,url:blobURL(entry)};
    },
    dispose() {for(const url of objectURLs.values())URL.revokeObjectURL(url);objectURLs.clear();},
  };
  return repository;
}
