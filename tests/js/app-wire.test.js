import assert from 'node:assert/strict';
import test from 'node:test';
import { createWire } from '../../resources/js/app/wire.js';

const harness = (api) => {
  const state = { summary: { id: 'one' }, inspectorData: null };
  const events = [];
  const wire = createWire({
    api,
    shell: () => state,
    dispatch: (event) => events.push([event.type, event.detail]),
    nextTick: async () => {},
  });

  return { state, events, wire };
};

test('loads an inspector into frozen shell data and announces it', async () => {
  const { state, events, wire } = harness({
    inspector: async (id, key) => ({ profile: { id, inspectors: { [key]: {} } } }),
  });

  await wire.loadInspector('queries');

  assert.ok(Object.isFrozen(state.inspectorData));
  assert.equal(state.inspectorData.profileId, 'one');
  assert.equal(state.inspectorData.inspector, 'queries');
  assert.deepEqual(state.inspectorData.profile, { id: 'one', inspectors: { queries: {} } });
  assert.deepEqual(events, [
    ['newdebugbar-inspector-loaded', { inspector: 'queries', profileId: 'one' }],
    ['newdebugbar-content-updated', {}],
  ]);
});

test('drops an inspector response that arrives after the profile changed', async () => {
  let release;
  const { state, events, wire } = harness({
    inspector: () => new Promise((resolve) => (release = resolve)),
  });

  const loading = wire.loadInspector('logs');
  state.summary = { id: 'two' };
  release({ profile: {} });
  await loading;

  assert.equal(state.inspectorData, null);
  assert.deepEqual(events, []);
});

test('announces refreshed, recent, switched, and noticed profiles', async () => {
  const { events, wire } = harness({
    related: async (id) => ({ summary: { id }, related_profiles: [{ id: 'child' }] }),
    recent: async () => [{ id: 'recent' }],
    summary: async (id) => ({ id }),
    notice: async (id) => ({ id, noticed: true }),
  });

  await wire.refreshRelatedActivity();
  await wire.loadRecentProfiles();
  await wire.switchProfile('two');
  await wire.noticeProfile('three');

  assert.deepEqual(events, [
    ['newdebugbar-profile-refreshed', { summary: { id: 'one' }, relatedProfiles: [{ id: 'child' }] }],
    ['newdebugbar-recent-profiles-loaded', { profiles: [{ id: 'recent' }] }],
    ['newdebugbar-profile-switched', { summary: { id: 'two' } }],
    ['newdebugbar-profile-noticed', { summary: { id: 'three', noticed: true } }],
  ]);
});

test('reports refreshed activity without related profiles as an empty list', async () => {
  const { events, wire } = harness({ related: async () => ({ summary: { id: 'one' } }) });

  await wire.refreshRelatedActivity();

  assert.deepEqual(events, [
    ['newdebugbar-profile-refreshed', { summary: { id: 'one' }, relatedProfiles: [] }],
  ]);
});
