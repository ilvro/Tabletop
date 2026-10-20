import test from 'node:test';
import assert from 'node:assert/strict';
import { actorHero, actorAvatar } from '../src/ui/actor-hero.js';

const actor = { name: 'Alan <b>' };

test('a character with a portrait gets the portrait and the visible label', () => {
  const html = actorHero(actor, { audience: 'all' }, '/assets/a.png', '<div class="hero-actions"></div>');
  assert.match(html, /<img src="\/assets\/a.png"/); assert.match(html, /No projetor · visível/); assert.match(html, /<strong class="tt-display">Alan &lt;b&gt;<\/strong>/);
  assert.doesNotMatch(html, /is-gm/);
});

test('without portrait there is a silhouette; GM-only is tagged; the sheet slot is empty by default', () => {
  const html = actorHero(actor, { audience: 'gm' }, null, '');
  assert.match(html, /is-silhouette/); assert.match(html, /tt-tag is-small is-gm/); assert.doesNotMatch(html, /sheet/);
  assert.match(actorHero(actor, { audience: 'all' }, null, '', { sheetSlot: '<div class="sheet-slot"></div>' }), /sheet-slot/);
  assert.equal(actorAvatar(null), '');
});
