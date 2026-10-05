import {rockDefaults} from '../src/domain/rocks.js';

/** Separate IDs: saved cliffs keep their original geometry and material. */
export function addOrganicRocks({add,timeless}) {
  const ids=new Set();
  for(const [id,name,size] of [
    ['organic-rock','Rocha orgânica · afloramento irregular',[3.2,2.5,2.8]],
    ['organic-cliff','Paredão orgânico · fraturas e erosão',[8,7,3.4]],
  ]) {
    add(id,name,'Exterior / Montanha',timeless,['Montanha','Caverna','Trilha nevada'],['rocha orgânica','rocha natural','geologia','paredão','erosão'],[
      {shape:'rock',size,position:[0,0,0],...rockDefaults(`builtin-${id}`),material:'stone',
        surface:{texture:'rock',rockPattern:'organic',textureSize:2.4,textureSeed:43,relief:.07}},
    ],'Volume irregular com fraturas locais em três dimensões. Esculpível com T; em cobertura, escolha depósitos orgânicos de neve.');
    ids.add(`builtin-${id}`);
  }
  return ids;
}
