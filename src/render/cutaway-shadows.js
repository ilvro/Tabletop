/** Geometry is shared. Proxies only occupy shadow layer 31, never camera/depth buffers. */
export function createCutawayShadows(scene) {
  const proxies=new Map();
  return {
    update(objects,records,enabled,isVisible,walls=null,matricesDirty=true){let changed=false;
      for(const [id,entry]of proxies)if(!enabled||objects.get(id)!==entry.original){entry.proxy.removeFromParent();proxies.delete(id);changed=true;}
      if(enabled){
        const list=walls??[...objects].filter(([id])=>records.get(id)?.kind==='wall').map(([id,object])=>({id,object,record:records.get(id)}));
        for(let i=0;i<list.length;i++){
          const {id,object:original,record}=list[i];
          let entry=proxies.get(id);const created=!entry;
          if(created){const proxy=original.clone(true);proxy.traverse(o=>o.layers.set(31));proxy.matrixAutoUpdate=false;proxy.matrixWorldAutoUpdate=false;scene.add(proxy);entry={original,proxy};proxies.set(id,entry);changed=true;}
          if(created||matricesDirty){original.updateWorldMatrix(true,true);entry.proxy.matrix.copy(original.matrixWorld);entry.proxy.updateMatrixWorld(true);}
          const visible=isVisible(record)&&!original.visible;if(entry.proxy.visible!==visible){entry.proxy.visible=visible;changed=true;}
        }
      }
      return changed;
    },
    info(){return {proxies:proxies.size,active:[...proxies].filter(([,e])=>e.proxy.visible).map(([id])=>id)};},
    dispose(){for(const e of proxies.values())e.proxy.removeFromParent();proxies.clear();},
  };
}
