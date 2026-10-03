import { validateDocument } from './validation.js';

/** Upgrade in memory only. Disk/revision change solely on an explicit save. */
export function migrateDocument(input) {
  validateDocument(input);
  const document = structuredClone(input);
  if (document.schemaVersion === 1) {
    document.schemaVersion = 2;
    document.layout.compositions = {};
  }
  return validateDocument(document);
}
