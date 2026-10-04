import { id, clone } from '../domain/documents.js';
import { isLocked, localPoint, worldPoint, pointInPolygon, floorContour } from '../domain/geometry.js';
import { ValidationError } from '../domain/validation.js';

// A proposal keeps batch attachment previewable and undoable in one transaction.
export function proposeAnchoring(document, { ids, hostId }, expectedEditVersion) {
  const host = document.layout.entities[hostId];
  if (!host || !['wall', 'floor'].includes(host.kind)) throw new ValidationError('Escolha uma parede ou o piso que servirá de teto.');
  if (!Array.isArray(ids) || !ids.length || ids.length > 256 || new Set(ids).size !== ids.length) throw new ValidationError('Seleção de fixação inválida.');
  if (isLocked(document, host)) throw new ValidationError('A parede ou teto escolhido está bloqueado.');
  const proposal = { id: id(), label: 'Fixar objetos', expectedEditVersion, entities: [], lights: [], groups: [], areas: [], updates: [], removals: [], report: { kept: [], reasons: [], omissions: [], conflicts: [], suppressed: [] } };
  for (const key of ids) {
    const entity = document.layout.entities[key], light = (document.look ?? document.defaultLook).lights[key];
    const item = entity ?? light;
    if (!item) throw new ValidationError('Objeto selecionado não encontrado.');
    if (key === hostId || !((entity?.kind === 'prop') || ['point', 'spot'].includes(light?.type))) {
      proposal.report.omissions.push(`${item.name}: usado apenas como referência; fixação disponível para objetos e luzes locais.`); continue;
    }
    if (isLocked(document, item)) { proposal.report.kept.push(key); proposal.report.reasons.push(`${item.name}: bloqueado, preservado.`); continue; }
    const local = localPoint(host, entity?.transform.position ?? light.position);
    const socket = host.kind === 'wall' ? 'wall' : 'ceiling';
    const offset = socket === 'wall'
      ? [Math.max(0, Math.min(host.length, local[0])), Math.max(0, Math.min(host.height, local[1])), (local[2] < 0 ? -1 : 1) * (host.thickness / 2 + .05)]
      : [local[0], -.05, local[2]];
    if (socket === 'ceiling' && (!pointInPolygon([local[0], local[2]], floorContour(host)) || (host.holes ?? []).some(hole => pointInPolygon([local[0], local[2]], hole)))) {
      proposal.report.omissions.push(`${item.name}: mova o objeto para baixo de uma região sólida do piso escolhido, fora dos recortes, antes de fixar.`); continue;
    }
    const placement = [...offset]; if (socket === 'ceiling') placement[1] -= host.thickness;
    const position = worldPoint(host, placement);
    const transform = entity ? { transform: { ...clone(entity.transform), position, rotation: clone(host.transform.rotation) } } : { position };
    proposal.updates.push({ kind: entity ? 'entity' : 'light', id: key, patch: { ...transform, anchor: { hostId, socket, offset }, surfaceId: null } });
    proposal.report.reasons.push(`${item.name}: fixar ${socket === 'wall' ? 'na face mais próxima da parede' : 'sob o piso'} ${host.name}; acompanha posição e rotação.`);
  }
  if (!proposal.updates.length) throw new ValidationError(`Selecione pelo menos um objeto ou luz local desbloqueado para fixar. ${proposal.report.omissions.join(' ')}`);
  return proposal;
}
