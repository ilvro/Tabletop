import test from 'node:test';
import assert from 'node:assert/strict';

// A fake canvas whose pixels are given as alpha values: enough to test the detection without a browser
function fakeDocument(alphas) {
  return {
    createElement: () => ({
      width: 0, height: 0,
      getContext: () => ({
        drawImage() {},
        getImageData: () => ({ data: Uint8ClampedArray.from(alphas.flatMap(a => [255, 255, 255, a])) }),
      }),
    }),
  };
}

test('hasTransparency: uma imagem opaca não é tratada como recortada, e qualquer área translúcida é', async () => {
  const { hasTransparency } = await import('../src/render/page-textures.js');
  const canvas = { width: 400, height: 300 };
  globalThis.document = fakeDocument([255, 255, 255, 255]);
  assert.equal(hasTransparency(canvas), false, 'PNG sem alfa continua com o papel de fundo normal');
  globalThis.document = fakeDocument([255, 255, 0, 255]);
  assert.equal(hasTransparency(canvas), true, 'um recorte (alfa 0) vira transparente na mesa');
  globalThis.document = fakeDocument([255, 128, 255, 255]);
  assert.equal(hasTransparency(canvas), true, 'borda suave de um recorte também conta');
  globalThis.document = { createElement: () => { throw new Error('sem canvas'); } };
  assert.equal(hasTransparency(canvas), false, 'sem como ler os pixels, trata como opaca');
  delete globalThis.document;
});
