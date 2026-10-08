import assert from 'node:assert/strict';
import test from 'node:test';
import { createLivewireInspector } from '../../resources/js/inspectors/livewire/controller.js';
import { createNewDebugBar } from '../../resources/js/state.js';
import { runtime, summary } from './state-test-support.js';

const profile = { ...summary, id: 'first', inspectors: [{ key: 'livewire', label: 'Livewire' }] };

// Mounts a Livewire inspector into a real shell, the way the React view does.
function inspectorHarness(inspector, summary, browser, recentProfiles = [], profileLimit = 20, trace = null) {
  const shell = createNewDebugBar(summary, browser, recentProfiles, profileLimit, trace);
  shell.selected = inspector;
  shell.loadedInspector = inspector;
  shell.inspectorOpen = true;
  const create = () => createLivewireInspector({ browser, trace, shell, profileId: shell.summary.id });

  return { shell, state: create(), create };
}

test('inspector mounts accept refreshed payloads and stop reading them after replacement or destruction', () => {
  const { shell, state } = inspectorHarness('livewire', profile, runtime());
  let merges = 0;
  const merge = state.mergeLivewireServer;
  state.mergeLivewireServer = function (payload) {
    merges++;
    merge.call(this, payload);
  };
  state.$nextTick = (callback) => callback();
  state.init();
  assert.equal(merges, 0);
  state.$livewirePayload = { components: [], activity_records: [] };
  shell.refreshInspector();
  assert.equal(state.initialized, true);
  assert.equal(merges, 1);
  shell.summary = { ...profile, id: 'second' };
  shell.refreshInspector();
  state.refresh();
  assert.equal(merges, 1, 'ignores a different profile');
  shell.summary = profile;
  state.destroy();
  state.refresh();
  shell.refreshInspector();
  assert.equal(merges, 1, 'detaches on destruction');
});

test('a replaced inspector cannot detach its replacement', () => {
  const { shell, state: first, create } = inspectorHarness('livewire', profile, runtime());
  const second = create();
  let refreshed = 0;
  second.refresh = () => refreshed++;
  new Proxy(first, {}).init();
  new Proxy(second, {}).init();
  new Proxy(first, {}).destroy();
  shell.refreshInspector();
  assert.equal(refreshed, 1);
  new Proxy(second, {}).destroy();
  shell.refreshInspector();
  assert.equal(refreshed, 1);
});

test('Livewire resumes its display subscription without clearing captured page history', () => {
  const browser = runtime();
  const frames = [];
  browser.afterPaint = (callback) => frames.push(callback);
  let subscriber;
  let subscriptions = 0;
  let unsubscribed = 0;
  let snapshot = { pageSequence: 1, components: [], activity: [], dropped: { components: 0, activity: 0 } };
  const trace = {
    subscribe(callback) {
      subscriptions++;
      subscriber = callback;
      callback(snapshot);
      return () => {
        unsubscribed++;
        subscriber = null;
      };
    },
  };
  const { shell, state } = inspectorHarness('livewire', profile, browser, [], 20, trace);
  state.$nextTick = (callback) => callback();
  state.init();
  assert.equal(subscriptions, 1);
  state.focusLivewirePropertyEditor({ path: 'city' });
  shell.closeInspector();
  assert.equal(subscriber, null);
  assert.equal(unsubscribed, 1);
  assert.equal(browser.timers.size, 0);
  browser.queryAll = () => {
    assert.fail('closed property editor cannot steal focus');
  };
  while (frames.length) frames.shift()();
  snapshot = { ...snapshot, ready: true, pageSequence: 2 };
  shell.openInspector('livewire');
  assert.equal(subscriptions, 2);
  assert.equal(state.livewireTrace, snapshot);
  state.destroy();
  assert.equal(unsubscribed, 2);
  assert.equal(browser.timers.size, 0);
});
