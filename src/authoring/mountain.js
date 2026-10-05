import { createEntity } from '../domain/documents.js';
import { layerSurfacePatch, surfacePatch, distributionOptions } from '../domain/materials.js';

/** A starting composition, materialized as ordinary editable heights and layers. */
export function createMountainTerrain(options = {}) {
  const terrain=createEntity('terrain',{name:'Montanha · rocha e neve',...options,material:surfacePatch('rock')});
  const n=terrain.segments, amplitude=Math.min(terrain.width,terrain.length)*.24;
  const trail=[];
  terrain.heights=terrain.heights.map((_,index)=>{
    const x=index%(n+1)/n*2-1, z=Math.floor(index/(n+1))/n*2-1;
    const path=Math.sin(z*3)*.12, distance=Math.abs(x-path);
    const ridge=Math.max(0,Math.min(1,(distance-.15)/.5));
    const terraces=ridge*ridge*(3-2*ridge);
    trail.push(Math.max(0,1-distance/.18)*.8);
    return amplitude*terraces*(.8+.14*Math.sin(z*7+x*3)+.06*Math.cos(x*19-z*5))+.15*Math.sin(z*4);
  });
  terrain.paintLayers=[
    {id:`${terrain.id}-rock`,name:'Rocha natural',...layerSurfacePatch('rock'),opacity:1,visible:true,weights:Array((n+1)**2).fill(1)},
    {id:`${terrain.id}-snow`,name:'Neve nas faces superiores',...layerSurfacePatch('snow'),opacity:1,visible:true,weights:Array((n+1)**2).fill(0),distribution:{...distributionOptions(),mode:'top',slopeAngle:42,slopeFade:16,variation:.4}},
    {id:`${terrain.id}-trail`,name:'Trilha exposta',...layerSurfacePatch('mud'),color:'#929086',opacity:.7,visible:true,weights:trail},
  ];
  return terrain;
}
