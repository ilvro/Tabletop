// What the "ao vivo / ensaio" badge says: whether a projector is connected and whether it shows what the editor shows.
const near = (a = [], b = [], tolerance) => a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) <= tolerance);

/** Same framing within 1 cm and the same lens; a missing published camera means the projector follows the editor. */
export function sameCamera(working, published, tolerance = .01) {
  if (!published || !working) return true;
  return working.projection === published.projection && near(working.position, published.position, tolerance) && near(working.target, published.target, tolerance) && Math.abs((working.fov ?? 0) - (published.fov ?? 0)) < .05;
}

export function viewState({ isPresentation, connected, working, published }) {
  if (isPresentation) return { key: 'preview', text: 'PRÉVIA DO PROJETOR', title: 'Você está vendo o que os jogadores veem.' };
  if (!connected) return { key: 'rehearsal', text: 'ENSAIO', title: 'Nenhum projetor conectado: nada do que você faz é mostrado.' };
  if (sameCamera(working, published)) return { key: 'live', text: '● AO VIVO', title: 'O projetor mostra o mesmo enquadramento que o editor.' };
  return { key: 'offset', text: 'ENSAIO · projetor em outra tomada', title: 'Clique para publicar este enquadramento no projetor.' };
}
