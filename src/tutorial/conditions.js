/**
 * Named checks a lesson step can wait for. Each reads the state of the scene
 * and of the editor, never which button was pressed: a step is done when its
 * result exists, by whatever path the person got there.
 *
 * `state` is `{ document, tab, sections, proposal, assetsOpen, placing, placingKind, selected, tool,
 * topView, canRedo, presenting, saved, assistant }`,
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
  /** What is selected, by kind: 'floor', 'wall', 'prop'… */
  selected: (state, kind) => state.selected === kind,
  /** An object of this model was turned from the way it arrives. */
  turned: (state, id) => entities(state).some(entity => entity.assetRef?.id === id && Math.abs(entity.transform.rotation[3]) < .999),
  tool: (state, name) => state.tool === name,
  view: (state, name) => (state.topView ? 'top' : 'perspective') === name,
  undone: state => state.canRedo,
  redone: state => !state.canRedo,
  environment: (state, id) => state.document.sourceEnvironment?.id === id,
  placingToken: state => state.placingKind === 'token' || Object.keys(state.document.tokens ?? {}).length > 0,
  tokens: (state, number) => Object.keys(state.document.tokens ?? {}).length >= number,
  cameras: (state, number) => Object.keys(state.document.cameraPresets ?? {}).length >= number,
  presenting: (state, on = true) => state.presenting === on,
  saved: state => state.saved,
};
/** A step's `done` is `['name', ...args]`, or a list of them that must all hold. */
export function met(done, state) {
  if (!done) return false;
  if (Array.isArray(done[0])) return done.every(entry => met(entry, state));
  const [name, ...args] = done, check = CONDITIONS[name];
  if (!check) throw new Error(`Condição de tutorial desconhecida: ${name}`);
  return Boolean(check(state, ...args));
}
