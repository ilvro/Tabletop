import { createScenePreviewRenderer } from '../render/scene-preview.js';
import { createPerformanceDiagnostics } from '../diagnostics/performance.js';
import { readExampleScene } from '../data/example-scenes.js';
import { createExamplePreviewCache } from '../data/example-preview-cache.js';

/** Derived work: one running job, bounded queue, revisions coalesced before capture. */
export function createScenePreviews({ viewport, repository, current, assets, onUpdate, onError, renderPreview,
  loadExample = readExampleScene, exampleCache = createExamplePreviewCache() }) {
  const renderer=renderPreview?null:createScenePreviewRenderer();
  renderPreview??=renderer.render.bind(renderer);
  const diagnostics=createPerformanceDiagnostics(),images=new Map(),backlog=new Map(),jobs=[];
  let timer,exampleTimer,running,disposed=false;
  const key=doc=>`${doc.documentType}:${doc.id}`,stamp=doc=>`${doc.revision}:${doc.updatedAt}`,MAX_JOBS=32;
  function remember(doc,image,version){
    const live=current(),previous=images.get(key(doc));
    if(live.document.id===doc.id&&live.dirty&&previous?.version===live.version&&version!==live.version)return;
    images.delete(key(doc));images.set(key(doc),{image,version,stamp:stamp(doc)});
    while(images.size>64)images.delete(images.keys().next().value);onUpdate();
  }
  async function capture(doc,version,signal){
    if(signal.aborted)return null;
    let image;const live=current();
    if(live.document.id===doc.id&&live.version===version&&!live.previewing){
      await viewport.ready();const latest=current();
      if(disposed||signal.aborted||latest.document.id!==doc.id||latest.version!==version)return null;
      image=await (viewport.captureThumbnailAsync?.()??viewport.captureThumbnail());
    }else image=await renderPreview(doc,assets(),signal);
    if(disposed||signal.aborted||!image)return null;remember(doc,image,version);return image;
  }
  function fill(){
    for(const [id,entry] of [...backlog].sort(([,a],[,b])=>a.priority-b.priority)){
      if(jobs.length>=MAX_JOBS&&!jobs.some(job=>job.priority>entry.priority))break;backlog.delete(id);
      enqueue(`library:${id}`,entry.priority,async signal=>{
        if(entry.example){
          const snapshot=await loadExample(entry.example.id,{signal});
          if(disposed||signal.aborted)return;
          const catalog=assets(),contentKey=await exampleCache.key(entry.example,snapshot,catalog);
          if(disposed||signal.aborted)return;
          let image=await exampleCache.read(contentKey);
          if(disposed||signal.aborted)return;
          if(!image){
            image=await renderPreview(snapshot,catalog,signal);
            if(disposed||signal.aborted||!image)return;
            await exampleCache.write(contentKey,image);
          }
          if(disposed||signal.aborted)return;
          images.delete(id);images.set(id,{image});
          while(images.size>64)images.delete(images.keys().next().value);
          onUpdate();return;
        }
        if(repository.readPreview&&entry.doc.previewRevision){
          const stored=await repository.readPreview(entry.doc);
          if(disposed||signal.aborted)return;
          if(stored){Object.assign(entry.doc,{preview:stored.image,previewRevision:stored.revision});remember(entry.doc,stored.image);if(stored.revision===entry.doc.revision)return;}
        }
        const snapshot=await repository.read(entry.doc.id,entry.doc.documentType);
        if(signal.aborted)return;
        const image=await renderPreview(snapshot,assets(),signal);if(disposed||signal.aborted||!image)return;
        await repository.savePreview(snapshot,image);
        Object.assign(entry.doc,{preview:image,previewRevision:snapshot.revision,revision:snapshot.revision,updatedAt:snapshot.updatedAt,name:snapshot.name});remember(snapshot,image);
      },true,entry);
    }
  }
  async function drain(){
    if(running||disposed)return;
    jobs.sort((a,b)=>a.priority-b.priority||a.created-b.created);
    const job=jobs.shift();if(!job)return;running=job;
    try{
      while(!disposed&&!job.controller.signal.aborted&&viewport.isBusy?.()&&performance.now()-job.created<5000)await new Promise(resolve=>setTimeout(resolve,50));
      if(globalThis.requestIdleCallback&&!disposed&&!job.controller.signal.aborted)await new Promise(resolve=>requestIdleCallback(resolve,{timeout:500}));
      if(!disposed&&!job.controller.signal.aborted)await diagnostics.measureAsync('preview',()=>job.task(job.controller.signal));
    }catch(error){if(!disposed&&!job.controller.signal.aborted&&error.status!==409)onError(error);}
    finally{job.resolve();running=null;fill();if(!jobs.length&&!backlog.size)renderer?.dispose();void drain();}
  }
  function enqueue(id,priority,task,library=false,entry=null){
    if(!library&&running?.entry?.example&&!running.controller.signal.aborted&&running.priority>priority){
      const deferred=running.entry;
      if(deferred)backlog.set(deferred.example?`example:${deferred.example.id}`:key(deferred.doc),deferred);
      running.controller.abort();renderer?.cancel();diagnostics.count('preempted');
    }
    if(running?.id===id)running.controller.abort();
    const previous=jobs.find(job=>job.id===id);if(previous){jobs.splice(jobs.indexOf(previous),1);previous.controller.abort();previous.resolve();diagnostics.count('coalesced');}
    if(jobs.length>=MAX_JOBS){const worst=[...jobs].sort((a,b)=>b.priority-a.priority||a.created-b.created)[0];jobs.splice(jobs.indexOf(worst),1);worst.controller.abort();worst.resolve();if(worst.entry)backlog.set(worst.entry.example?`example:${worst.entry.example.id}`:key(worst.entry.doc),worst.entry);diagnostics.count('droppedObsolete');}
    return new Promise(resolve=>{jobs.push({id,priority,task,library,entry,controller:new AbortController(),created:performance.now(),resolve});diagnostics.count('enqueued');queueMicrotask(()=>void drain());});
  }
  function cancelLibrary(){
    clearTimeout(exampleTimer);
    backlog.clear();for(const job of [...jobs])if(job.library){jobs.splice(jobs.indexOf(job),1);job.controller.abort();job.resolve();}
    if(running?.library){running.controller.abort();renderer?.cancel();}
  }
  return {
    exampleImage(example){return images.get(`example:${example.id}`)?.image;},
    ensureExamples(examples){
      for(const example of examples){const id=`example:${example.id}`;
        if(images.has(id)||running?.id===`library:${id}`||jobs.some(job=>job.id===`library:${id}`))continue;
        backlog.set(id,{example,priority:2});
      }
      clearTimeout(exampleTimer);exampleTimer=setTimeout(fill,250);
    },
    image(doc){const entry=images.get(key(doc)),live=current();return entry&&(entry.stamp===stamp(doc)||live.document.id===doc.id&&entry.version===live.version)?entry.image:doc.preview;},
    schedule(){
      clearTimeout(timer);
      for(const job of [...jobs])if(job.id==='current'){jobs.splice(jobs.indexOf(job),1);job.controller.abort();job.resolve();}
      if(running?.id==='current')running.controller.abort();
      timer=setTimeout(()=>{
        const live=current(),doc=live.document,version=live.version;if(!['scene','map'].includes(doc.documentType))return;
        void enqueue('current',0,async signal=>{
          if(current().document.id!==doc.id||current().version!==version)return;
          const image=await capture(doc,version,signal);
          if(image&&!signal.aborted&&!current().dirty&&doc.revision>0)await repository.savePreview(doc,image);
        });
      },1000);
    },
    saved(doc,version){if(!['scene','map'].includes(doc.documentType))return Promise.resolve();return enqueue(`saved:${key(doc)}`,1,async signal=>{
      const cached=images.get(key(doc)),image=cached?.version===version&&version!==undefined?cached.image:await capture(doc,version,signal);
      if(image&&!signal.aborted){await repository.savePreview(doc,image);remember(doc,image,version);}
    });},
    ensure(documents,{visibleIds=new Set()}={}){
      for(const doc of documents){const id=key(doc),priority=visibleIds.has(doc.id)?2:3;
        if(doc.preview&&doc.previewRevision===doc.revision)continue;
        const pending=running?.id===`library:${id}`?running:jobs.find(job=>job.id===`library:${id}`);
        if(pending){pending.priority=Math.min(pending.priority,priority);if(pending.entry)pending.entry.priority=pending.priority;continue;}
        backlog.set(id,{doc,priority:Math.min(backlog.get(id)?.priority??3,priority)});
      }
      fill();
    },
    cancelLibrary,
    info:()=>({running:Boolean(running),queued:jobs.length,backlog:backlog.size,images:images.size,maxJobs:MAX_JOBS,...diagnostics.snapshot()}),
    dispose(){disposed=true;clearTimeout(timer);cancelLibrary();running?.controller.abort();for(const job of jobs){job.controller.abort();job.resolve();}jobs.length=0;renderer?.dispose();diagnostics.dispose();},
  };
}
