/** Stable catalog IDs identify the original editable geological kit. */
export const ROCK_PRESETS = Object.freeze({
  'builtin-mountain-boulder': { form:'fractured', seed:17, irregularity:.65, detail:5 },
  'builtin-granite-boulder': { form:'rounded', seed:29, irregularity:.45, detail:6 },
  'builtin-stratified-cliff': { form:'strata', seed:43, irregularity:.7, detail:7 },
  'builtin-mountain-cliff-face': { form:'cliff', seed:137, irregularity:.7, detail:6, overhang:.55, terraces:6, erosion:.65 },
  'builtin-mountain-cliff-corner': { form:'cliff', seed:173, irregularity:.6, detail:5, overhang:.35, terraces:7, erosion:.7 },
  'builtin-mountain-cliff-overhang': { form:'cliff', seed:211, irregularity:.8, detail:6, overhang:.95, terraces:4, erosion:.75 },
  'builtin-mountain-rock-spire': { form:'spire', seed:251, irregularity:.65, detail:5, overhang:.45, terraces:8, erosion:.6 },
  'builtin-rock-scree': { form:'fractured', seed:61, irregularity:.8, detail:3 },
});
export const rockDefaults = assetId => ROCK_PRESETS[assetId] ? { ...ROCK_PRESETS[assetId] } : null;
export const ROCK_FORMS = ['fractured','rounded','strata','cliff','spire'];
export const ROCK_RANGES = { seed:[0,65535], irregularity:[0,1], detail:[2,8] };

// Optional in documents created before the cliff kit.
export const CLIFF_DEFAULTS = { overhang:.45, terraces:6, erosion:.6 };
export const CLIFF_RANGES = { overhang:[0,1], terraces:[1,12], erosion:[0,1] };
