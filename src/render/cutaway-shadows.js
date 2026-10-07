/** Geometry is shared. Proxies only occupy shadow layer 31, never camera/depth buffers. */
export function createCutawayShadows(scene) {
  const proxies=new Map();
  return {
    update(objects,records,enabled,isVisible){let changed=false;
      for(const [id,entry]of proxies)if(!enabled||objects.get(id)!==entry.original){entry.proxy.removeFromParent();proxies.delete(id);changed=true;}
      if(enabled)for(const [id,original]of objects){const record=records.get(id);if(record?.kind!=='wall')continue;
        let entry=proxies.get(id);if(!entry){const proxy=original.clone(true);proxy.traverse(o=>o.layers.set(31));proxy.matrixAutoUpdate=false;scene.add(proxy);entry={original,proxy};proxies.set(id,entry);changed=true;}
        original.updateWorldMatrix(true,true);entry.proxy.matrix.copy(original.matrixWorld);
        const visible=isVisible(record)&&!original.visible;if(entry.proxy.visible!==visible)changed=true;entry.proxy.visible=visible;entry.proxy.updateMatrixWorld(true);
      }
      return changed;
    },
    info(){return {proxies:proxies.size,active:[...proxies].filter(([,e])=>e.proxy.visible).map(([id])=>id)};},
    dispose(){for(const e of proxies.values())e.proxy.removeFromParent();proxies.clear();},
  };
}
