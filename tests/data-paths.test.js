import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationBaseURL, resolveAssetURL } from '../src/data/paths.js';

test('static paths follow the repository directory and preserve blob and external URLs',()=>{
  for(const url of ['https://owner.github.io/Tabletop/','https://owner.github.io/Tabletop/index.html?diagnostics','https://mesa.example.com/']) {
    const base=applicationBaseURL('./',url);
    assert.equal(base.search,'');assert.equal(base.hash,'');
    assert.equal(resolveAssetURL('/assets/models/desk.json',base),new URL('assets/models/desk.json',base).href);
    assert.equal(resolveAssetURL('/api/tabletop/assets/upload/file',base),new URL('api/tabletop/assets/upload/file',base).href);
    for(const untouched of ['blob:https://owner.github.io/123','https://example.com/asset.glb','data:image/png;base64,a','./custom.glb'])assert.equal(resolveAssetURL(untouched,base),untouched);
    const projector=new URL('?presentation=abc',base);assert.equal(projector.pathname,base.pathname);
  }
});
