import { Matrix4, Quaternion, Vector3 } from 'three';
import { ValidationError } from './validation.js';
import { transformMatrix } from './assemblies.js';
import { surfacePatch } from './materials.js';

/**
 * A decal is a thin flat prop glued to a wall, a floor or a model: a sign, a mark,
 * a stripe of material. It reuses the anchor of the objects that hang on walls
 * (`anchor.hostId`) with its own socket, `surface`, so it follows the face it is
 * on when that face moves, and leaves with it when it is removed.
 */
export const DECAL_ASSET = 'builtin-decal';
export const DECAL_KINDS = [['text', 'Texto'], ['image', 'Imagem'], ['surface', 'Faixa de material']];
export const DECAL_FONTS = [['stencil', 'Estêncil'], ['sans', 'Sem serifa'], ['mono', 'Terminal']];
export const DECAL_RANGES = Object.freeze({ size: [.02, 30], opacity: [0, 1], faded: [0, 1], scratched: [0, 1], seed: [0, 65535] });
export const DECAL_TEXT_LIMIT = 80;
export const DECAL_DEFAULTS = Object.freeze({
  kind: 'text', size: [1.6, .4],
  text: 'SETOR 7', font: 'stencil', textColor: '#e9e2cf', background: null,
  imageRef: null, opacity: 1,
  wear: { faded: .2, scratched: .15, seed: 1 },
});
export const decalDefaults = (patch = {}) => ({ ...structuredClone(DECAL_DEFAULTS), ...patch });
export const isDecal = record => Boolean(record?.decal);

export function validateDecal(decal, path = 'decal') {
  const fail = message => { throw new ValidationError(`${message} (${path})`); };
  const plain = value => value && typeof value === 'object' && !Array.isArray(value);
  const hex = value => typeof value === 'string' && /^#[a-fA-F0-9]{6}$/.test(value);
  const inside = (value, [min, max]) => Number.isFinite(value) && value >= min && value <= max;
  if (!plain(decal)) fail('Decalque inválido.');
  for (const key of Object.keys(decal)) if (!(key in DECAL_DEFAULTS)) fail(`Campo de decalque desconhecido: ${key}.`);
  for (const key of Object.keys(DECAL_DEFAULTS)) if (!(key in decal)) fail(`Falta o campo de decalque: ${key}.`);
  if (!DECAL_KINDS.some(([id]) => id === decal.kind)) fail('Tipo de decalque inválido.');
  if (!Array.isArray(decal.size) || decal.size.length !== 2 || decal.size.some(v => !inside(v, DECAL_RANGES.size))) fail('Tamanho do decalque fora do intervalo.');
  if (typeof decal.text !== 'string' || decal.text.length > DECAL_TEXT_LIMIT) fail(`O texto do decalque aceita até ${DECAL_TEXT_LIMIT} caracteres.`);
  if (!DECAL_FONTS.some(([id]) => id === decal.font)) fail('Fonte do decalque inválida.');
  if (!hex(decal.textColor) || decal.background !== null && !hex(decal.background)) fail('Use cores hexadecimais #RRGGBB.');
  const ref = decal.imageRef;
  if (ref !== null) {
    if (!plain(ref) || Object.keys(ref).sort().join() !== 'id,revision' || typeof ref.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(ref.id) || !Number.isInteger(ref.revision) || ref.revision < 1) fail('Imagem do decalque inválida.');
  }
  if (decal.kind === 'image' && ref === null) fail('Escolha uma imagem da biblioteca para o decalque.');
  if (!inside(decal.opacity, DECAL_RANGES.opacity)) fail('Opacidade fora do intervalo.');
  const wear = decal.wear;
  if (!plain(wear) || Object.keys(wear).sort().join() !== 'faded,scratched,seed') fail('Desgaste do decalque inválido.');
  if (!inside(wear.faded, DECAL_RANGES.faded) || !inside(wear.scratched, DECAL_RANGES.scratched)) fail('Desgaste fora do intervalo.');
  if (!Number.isInteger(wear.seed) || !inside(wear.seed, DECAL_RANGES.seed)) fail('A variação do desgaste deve ser um inteiro entre 0 e 65535.');
}

/** Basis of a decal: +Z is the normal of the face, +Y the reading "up", +X = Y × Z. */
export function decalFrame(normal, hostRotation = [0, 0, 0, 1]) {
  const z = new Vector3(...normal).normalize();
  // On a wall, up is the world's. On a floor or ceiling it is the host's -Z, so lettering lines up with the room.
  const up = Math.abs(z.y) > .95 ? new Vector3(0, 0, -1).applyQuaternion(new Quaternion(...hostRotation)) : new Vector3(0, 1, 0);
  const x = new Vector3().crossVectors(up, z).normalize(), y = new Vector3().crossVectors(z, x);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z)).normalize();
}

/** Where a decal glued at `point` (world) on a face with this `normal` lives: its world pose and the anchor that keeps it there. */
export function decalPlacement(host, point, normal) {
  const hostQ = new Quaternion(...host.transform.rotation), world = decalFrame(normal, host.transform.rotation);
  const offset = new Vector3(...point).applyMatrix4(transformMatrix(host.transform).invert()).toArray();
  const rotation = hostQ.clone().invert().multiply(world).normalize().toArray();
  return { position: [...point], rotation: world.toArray(), anchor: { hostId: host.id, socket: 'surface', offset, rotation } };
}

/** The anchor after the decal was dragged or turned in the viewport: it only slides over its plane and spins about its normal. */
export function decalAnchorFromWorld(host, anchor, transform) {
  const local = new Vector3(...transform.position).applyMatrix4(transformMatrix(host.transform).invert());
  const base = new Quaternion(...anchor.rotation), normal = new Vector3(0, 0, 1).applyQuaternion(base);
  local.sub(normal.clone().multiplyScalar(local.clone().sub(new Vector3(...anchor.offset)).dot(normal)));
  const relative = new Quaternion(...host.transform.rotation).invert().multiply(new Quaternion(...transform.rotation));
  const twist = base.clone().invert().multiply(relative), angle = 2 * Math.atan2(twist.z, twist.w);
  return { ...anchor, offset: local.toArray(), rotation: base.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), angle)).normalize().toArray() };
}

/** Spin about the normal, in degrees, measured from the upright pose the decal had when it was glued. */
export function decalSpinAngle(host, anchor) {
  const hostQ = new Quaternion(...host.transform.rotation), world = hostQ.clone().multiply(new Quaternion(...anchor.rotation));
  const upright = decalFrame(new Vector3(0, 0, 1).applyQuaternion(world).toArray(), host.transform.rotation);
  const twist = upright.invert().multiply(world), angle = 2 * Math.atan2(twist.z, twist.w) * 180 / Math.PI;
  return Math.abs(angle) < 1e-6 ? 0 : angle;
}
export function decalSpin(host, anchor, degrees) {
  const hostQ = new Quaternion(...host.transform.rotation), world = hostQ.clone().multiply(new Quaternion(...anchor.rotation));
  const upright = decalFrame(new Vector3(0, 0, 1).applyQuaternion(world).toArray(), host.transform.rotation);
  const spun = upright.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), degrees * Math.PI / 180));
  return { ...anchor, rotation: hostQ.invert().multiply(spun).normalize().toArray() };
}

const PERCENT = new Set(['opacity', 'wear-faded', 'wear-scratched']);
/**
 * The patch an inspector field makes on a decal: the whole `decal` (a patch replaces it),
 * the footprint that follows its width, and for a stripe of material the first material.
 * The spin field needs the host, so it turns the anchor and nothing else.
 */
export function decalFieldPatch(record, field, value, { host = null, imageAssets = [] } = {}) {
  const decal = structuredClone(record.decal);
  if (field === 'spin') {
    if (!host) throw new ValidationError('O decalque perdeu a superfície em que estava colado.');
    return { anchor: decalSpin(host, record.anchor, Number(value)) };
  }
  const amount = PERCENT.has(field) ? Number(value) / 100 : value;
  const patch = {};
  if (field === 'kind') {
    decal.kind = value;
    if (value === 'image' && !decal.imageRef) {
      const image = imageAssets[0];
      if (!image) throw new ValidationError('Importe uma imagem na biblioteca de assets para colá-la como decalque.');
      decal.imageRef = { id: image.id, revision: image.revision ?? 1 };
    }
    // A stripe of material is useless without one: the first choice is the hazard stripes.
    if (value === 'surface' && (!record.material?.texture || record.material.texture === 'none')) patch.material = surfacePatch('hazard');
  } else if (['text', 'font', 'textColor', 'opacity'].includes(field)) decal[field] = amount;
  else if (field === 'background-on') decal.background = value ? decal.background ?? '#1d1d1b' : null;
  else if (field === 'background') decal.background = value;
  else if (field === 'imageRef') { const [id, revision] = String(value).split('@'); decal.imageRef = value ? { id, revision: Number(revision) } : null; }
  else if (/^size-[01]$/.test(field)) { decal.size[Number(field.slice(5))] = Number(value); patch.footprint = [decal.size[0], record.footprint?.[1] ?? .02]; }
  else if (/^wear-(faded|scratched|seed)$/.test(field)) decal.wear[field.slice(5)] = amount;
  else throw new ValidationError(`Campo de decalque desconhecido: ${field}.`);
  return { ...patch, decal };
}
