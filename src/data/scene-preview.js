// Derived gallery images stay outside the scene, undo history and projector state.
export const PREVIEW_MAX_LENGTH = 350_000;
export function validateScenePreview(image) {
  if (typeof image !== 'string' || image.length > PREVIEW_MAX_LENGTH ||
      !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(image)) {
    throw new Error('Prévia inválida. Use uma captura JPEG de até 256 KB.');
  }
  return image;
}
