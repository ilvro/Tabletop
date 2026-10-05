/** Stable catalog IDs identify the original editable geological kit. */
export const ROCK_PRESETS = Object.freeze({
  'builtin-mountain-boulder': { form:'fractured', seed:17, irregularity:.65, detail:5 },
  'builtin-granite-boulder': { form:'rounded', seed:29, irregularity:.45, detail:6 },
  'builtin-stratified-cliff': { form:'strata', seed:43, irregularity:.7, detail:7 },
  'builtin-rock-scree': { form:'fractured', seed:61, irregularity:.8, detail:3 },
});
export const rockDefaults = assetId => ROCK_PRESETS[assetId] ? { ...ROCK_PRESETS[assetId] } : null;
export const ROCK_FORMS = ['fractured','rounded','strata'];
export const ROCK_RANGES = { seed:[0,65535], irregularity:[0,1], detail:[2,8] };
