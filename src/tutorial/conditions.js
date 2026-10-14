/**
 * Named checks a lesson step can wait for. Each reads the state of the scene
 * and of the editor, never which button was pressed: a step is done when its
 * result exists, by whatever path the person got there.
 *
 * `state` is `{ document, tab, sections, proposal, assetsOpen, placing, assistant }`,
 * where `assistant` is what the room assistant currently reads and is set to.
 */
const entities = state => Object.values(state.document.layout.entities);
const count = (state, kind) => entities(state).filter(entity => entity.kind === kind).length;
export const CONDITIONS = {
  /** Always true: an explanation the person leaves with "Continuar". */
  read: () => false,
  tab: (state, name) => state.tab === name,
  taskOpen: (state, key) => state.tab === 'build' && state.sections.includes(key),
  previewOpen: state => state.proposal,
  previewClosed: state => !state.proposal,
  assetsOpen: state => state.assetsOpen,
  assetListed: (state, id) => state.listedAssets.includes(id),
  placingAsset: (state, id) => state.placing === id || entities(state).some(entity => entity.assetRef?.id === id),
  hasAsset: (state, id) => entities(state).some(entity => entity.assetRef?.id === id),
  atLeast: (state, kind, number) => count(state, kind) >= number,
  hasTag: (state, tag) => entities(state).some(entity => entity.tags?.includes(tag)),
  furnished: state => Object.keys(state.document.layout.compositions ?? {}).length > 0,
  litObject: state => entities(state).some(entity => entity.illumination?.enabled),
  roomSeenAs: (state, template) => state.assistant.inferred === template,
  assistantState: (state, id) => state.assistant.state === id,
  buildingMode: (state, mode) => state.assistant.buildingMode === mode,
};
/** A step's `done` is `['name', ...args]`, or a list of them that must all hold. */
export function met(done, state) {
  if (!done) return false;
  if (Array.isArray(done[0])) return done.every(entry => met(entry, state));
  const [name, ...args] = done, check = CONDITIONS[name];
  if (!check) throw new Error(`Condição de tutorial desconhecida: ${name}`);
  return Boolean(check(state, ...args));
}
