import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cloneValue,
  createLivewireTrace,
  humanize,
  installLivewireTrace,
  primitive,
  valueType,
} from '../../resources/js/livewire-trace.js';

const profileId = '550e8400-e29b-41d4-a716-446655440000';

function setPath(target, path, value) {
  const segments = path.split('.');
  const last = segments.pop();
  const parent = segments.reduce((current, segment) => current[segment], target);
  parent[last] = value;
}

function component(id, name, state = { count: 0 }, parent = null) {
  const canonical = structuredClone(state);
  const reactive = structuredClone(state);
  const instance = {
    id,
    name,
    canonical,
    reactive,
    el: {
      closest: () => null,
      parentElement: {
        closest: () => parent?.el ?? null,
      },
    },
  };
  instance.el.__livewire = instance;
  instance.$wire = {
    $set: async (path, value) => {
      setPath(canonical, path, value);
      setPath(reactive, path, value);
    },
  };

  return instance;
}

function harness(initial = []) {
  let clock = 0;
  const hooks = {};
  const interceptors = {};
  const removed = [];
  const browser = { performance: { now: () => ++clock } };
  const Livewire = {
    all: () => initial,
    hook: (name, callback) => {
      hooks[name] = callback;
      return () => removed.push(`hook:${name}`);
    },
    interceptMessage: (callback) => {
      interceptors.message = callback;
      return () => removed.push('message');
    },
    interceptRequest: (callback) => {
      interceptors.request = callback;
      return () => removed.push('request');
    },
  };
  const trace = createLivewireTrace(browser);
  trace.install(Livewire);

  return { browser, hooks, interceptors, Livewire, removed, trace };
}

function beginMessage(
  interceptor,
  owner,
  { actions = [{ name: 'save', params: [], metadata: {} }], updates = {} } = {},
) {
  const lifecycle = {};
  const message = { component: owner, actions: new Set(actions), updates };
  interceptor({
    message,
    onSend: (callback) => {
      lifecycle.send = callback;
    },
    onCancel: (callback) => {
      lifecycle.cancel = callback;
    },
    onFailure: (callback) => {
      lifecycle.failure = callback;
    },
    onError: (callback) => {
      lifecycle.error = callback;
    },
    onStream: (callback) => {
      lifecycle.stream = callback;
    },
    onSuccess: (callback) => {
      lifecycle.success = callback;
    },
    onSkipped: (callback) => {
      lifecycle.skipped = callback;
    },
    onFinish: (callback) => {
      lifecycle.finish = callback;
    },
  });

  return { lifecycle, message };
}

function succeedMessage(run, effects = {}, snapshot = null) {
  const phases = {};
  run.lifecycle.success({
    payload: { effects, ...(snapshot ? { snapshot } : {}) },
    onSync: (callback) => {
      phases.sync = callback;
    },
    onEffect: (callback) => {
      phases.effect = callback;
    },
    onMorph: (callback) => {
      phases.morph = callback;
    },
    onRender: (callback) => {
      phases.render = callback;
    },
  });
  phases.sync();
  phases.effect();
  phases.morph();
  run.lifecycle.finish();
  phases.render();

  return phases;
}

test('tracks multiple top-level and nested host component instances', () => {
  const first = component('root-1', 'benchmark.control-panel');
  Object.defineProperty(first, 'parent', {
    get: () => {
      throw new Error('Top-level Livewire parent lookup is not safe.');
    },
  });
  const second = component('root-2', 'benchmark.event-console');
  const child = component('child-1', 'benchmark.metric-card', { label: 'Revenue' }, first);
  const { trace } = harness([first, second, child]);
  const snapshot = trace.snapshot();

  assert.equal(snapshot.ready, true);
  assert.deepEqual(
    snapshot.components.map(({ id }) => id),
    ['root-1', 'root-2', 'child-1'],
  );
  assert.equal(snapshot.components.find(({ id }) => id === 'child-1').parentId, 'root-1');
  assert.deepEqual(snapshot.components.find(({ id }) => id === 'child-1').serverProperties, [
    { path: 'label', type: 'String', value: 'Revenue' },
  ]);
  assert.equal(snapshot.activity.length, 3);
  assert.ok(snapshot.activity.every(({ kind }) => kind === 'mount'));
});

test('groups actions, property changes, phases, and a request profile into one interaction', () => {
  const counter = component('counter-1', 'benchmark.counter', { count: 1 });
  const { interceptors, trace } = harness([counter]);
  const run = beginMessage(interceptors.message, counter, {
    actions: [{ name: 'increment', params: [2], metadata: {} }],
    updates: { count: 3 },
  });
  let requestResponse;
  interceptors.request({
    request: { messages: new Set([run.message]) },
    onResponse: (callback) => {
      requestResponse = callback;
    },
  });

  run.lifecycle.send();
  requestResponse({ response: { headers: { get: () => profileId } } });
  counter.canonical.count = 3;
  counter.reactive.count = 3;
  succeedMessage(run);

  const interaction = trace.snapshot().activity.at(-1);
  assert.ok(interaction.occurredAt > 0);
  assert.equal(interaction.title, 'Count changed');
  assert.equal(interaction.kind, 'mutation');
  assert.equal(interaction.status, 'complete');
  assert.equal(interaction.actions[0].name, 'increment');
  assert.deepEqual(interaction.changes[0], {
    path: 'count',
    submitted: 3,
    before: 1,
    server: 3,
    serverKnown: true,
  });
  assert.deepEqual(interaction.profileIds, [profileId]);
  assert.deepEqual(trace.snapshot().components[0].serverProperties, [{ path: 'count', type: 'Integer', value: 3 }]);
  assert.deepEqual(
    interaction.phases.map(({ name }) => name),
    ['Queued', 'Sent', 'Responded', 'Synced', 'Effects', 'Morphed', 'Rendered'],
  );
  assert.ok(interaction.durationMs > 0);
  assert.ok(interaction.durationMs >= interaction.phases.at(-1).at - interaction.startedAt);
});

test('labels polls, grouped actions, and commit-only messages plainly', () => {
  const panel = component('panel-1', 'benchmark.panel');
  const { interceptors, trace } = harness([panel]);

  succeedMessage(
    beginMessage(interceptors.message, panel, {
      actions: [{ name: '$refresh', params: [], metadata: { type: 'poll' } }],
    }),
  );
  assert.equal(trace.snapshot().activity.at(-1).title, 'Polled component');

  succeedMessage(
    beginMessage(interceptors.message, panel, {
      actions: [
        { name: 'save', params: [], metadata: {} },
        { name: 'publish', params: [], metadata: {} },
      ],
    }),
  );
  assert.equal(trace.snapshot().activity.at(-1).title, '2 actions ran');

  succeedMessage(
    beginMessage(interceptors.message, panel, {
      actions: [{ name: '$commit', params: [], metadata: {} }],
    }),
  );
  assert.equal(trace.snapshot().activity.at(-1).title, 'Component updated');

  succeedMessage(
    beginMessage(interceptors.message, panel, {
      actions: [{ name: '$set', params: [], metadata: {} }],
    }),
  );
  assert.equal(trace.snapshot().activity.at(-1).kind, 'mutation');

  succeedMessage(
    beginMessage(interceptors.message, panel, {
      updates: { first: 1, second: 2 },
    }),
  );
  assert.equal(trace.snapshot().activity.at(-1).title, '2 properties changed');
});

test('ignores malformed browser evidence and keeps optional Livewire hooks safe', () => {
  const unnamed = component('unnamed-1', undefined);
  delete unnamed.name;
  unnamed.snapshot = { memo: { name: 'benchmark.snapshot-name' } };
  const anonymous = component('anonymous-1', undefined);
  delete anonymous.name;
  const insideToolbar = component('inside-1', 'benchmark.inside');
  insideToolbar.el.closest = () => ({ id: 'newdebugbar' });
  const { interceptors, Livewire, trace } = harness([unnamed, anonymous, insideToolbar]);

  assert.deepEqual(
    trace.snapshot().components.map(({ title }) => title),
    ['Snapshot Name', 'Livewire Component'],
  );
  trace.install(Livewire);
  trace.install(null);
  trace.mergeServerComponents([null, {}, { id: 'unnamed-1', properties: [] }]);

  const receiveWithoutSource = beginMessage(interceptors.message, unnamed, {
    actions: [{ name: '__dispatch', params: ['missing-event'], metadata: {} }],
  });
  succeedMessage(receiveWithoutSource);

  let respond;
  interceptors.request({
    request: { messages: new Set([receiveWithoutSource.message]) },
    onResponse: (callback) => {
      respond = callback;
    },
  });
  respond({ response: { headers: { get: () => 'invalid-profile' } } });
  assert.deepEqual(trace.snapshot().activity.at(-1).profileIds, []);

  const failed = beginMessage(interceptors.message, unnamed);
  failed.lifecycle.failure({ error: {} });
  assert.equal(trace.snapshot().activity.at(-1).error, 'The Livewire update failed.');
});

test('records dispatch targets and correlates an observed receiving component', () => {
  const source = component('source-1', 'benchmark.control-panel');
  const receiver = component('receiver-1', 'benchmark.event-console');
  const { interceptors, trace } = harness([source, receiver]);
  const dispatch = beginMessage(interceptors.message, source);

  succeedMessage(dispatch, {
    dispatches: [
      {
        name: 'benchmark-updated',
        params: { count: 2 },
        component: 'benchmark.event-console',
      },
    ],
  });

  const receive = beginMessage(interceptors.message, receiver, {
    actions: [
      {
        name: '__dispatch',
        params: ['benchmark-updated', { count: 2 }],
        metadata: {},
      },
    ],
  });
  succeedMessage(receive);

  const sourceInteraction = trace
    .snapshot()
    .activity.find(
      (item) => item.componentId === 'source-1' && item.events.some(({ name }) => name === 'benchmark-updated'),
    );
  assert.equal(sourceInteraction.events[0].mode, 'component');
  assert.equal(sourceInteraction.events[0].declaredTarget, 'benchmark.event-console');
  assert.deepEqual(sourceInteraction.events[0].observedRecipientIds, ['receiver-1']);
  assert.equal(trace.snapshot().activity.at(-1).kind, 'event');
});

test('keeps validation, network, HTTP, skipped, cancelled, and streamed outcomes distinct', () => {
  const form = component('form-1', 'benchmark.validation-form');
  const { interceptors, trace } = harness([form]);

  const validation = beginMessage(interceptors.message, form);
  succeedMessage(validation, {
    returnsMeta: [{ errors: { email: ['Enter a valid email.'] } }],
  });
  assert.equal(trace.snapshot().activity.at(-1).status, 'failed_validation');
  assert.equal(trace.snapshot().activity.at(-1).error, 'Enter a valid email.');

  form.snapshot = { memo: { errors: {} } };
  const memoValidation = beginMessage(interceptors.message, form);
  succeedMessage(
    memoValidation,
    {},
    {
      memo: { errors: { email: ['Email is not available.'] } },
    },
  );
  assert.equal(trace.snapshot().activity.at(-1).status, 'failed_validation');
  assert.equal(trace.snapshot().activity.at(-1).error, 'Email is not available.');
  assert.ok(trace.snapshot().activity.at(-1).durationMs > 0);

  form.snapshot = {
    memo: { errors: { email: ['Email is not available.'] } },
  };
  const unchangedErrors = beginMessage(interceptors.message, form);
  succeedMessage(
    unchangedErrors,
    {},
    {
      memo: { errors: { email: ['Email is not available.'] } },
    },
  );
  assert.equal(trace.snapshot().activity.at(-1).status, 'complete');

  const network = beginMessage(interceptors.message, form);
  network.lifecycle.failure({ error: new Error('Connection lost.') });
  network.lifecycle.finish();
  assert.equal(trace.snapshot().activity.at(-1).error, 'Connection lost.');

  const http = beginMessage(interceptors.message, form);
  http.lifecycle.error({ response: { status: 500 } });
  http.lifecycle.finish();
  assert.equal(trace.snapshot().activity.at(-1).error, 'Livewire returned HTTP 500.');

  const skipped = beginMessage(interceptors.message, form);
  skipped.lifecycle.skipped();
  skipped.lifecycle.finish();
  assert.equal(trace.snapshot().activity.at(-1).status, 'skipped');

  const cancelled = beginMessage(interceptors.message, form);
  cancelled.lifecycle.cancel();
  cancelled.lifecycle.finish();
  assert.equal(trace.snapshot().activity.at(-1).status, 'cancelled');

  const streamed = beginMessage(interceptors.message, form);
  streamed.lifecycle.stream();
  succeedMessage(streamed);
  assert.ok(
    trace
      .snapshot()
      .activity.at(-1)
      .phases.some(({ name }) => name === 'Streamed'),
  );
});

test('applies only server-proven primitive mutations and rejects stale or unsupported writes', async () => {
  const counter = component('counter-1', 'benchmark.counter', {
    count: 1,
    settings: { enabled: true },
    locked: 'fixed',
  });
  const { trace } = harness([counter]);
  trace.mergeServerComponents([
    {
      id: 'counter-1',
      properties: [
        {
          path: 'count',
          write_allowed: true,
          writable: true,
          array_leaf_writable: false,
        },
        {
          path: 'settings',
          write_allowed: true,
          writable: false,
          array_leaf_writable: true,
        },
        {
          path: 'locked',
          write_allowed: false,
          writable: false,
          array_leaf_writable: false,
        },
      ],
    },
  ]);

  assert.equal(
    await trace.applyMutation({
      componentId: 'counter-1',
      path: 'count',
      baseline: 1,
      value: 4,
    }),
    4,
  );
  assert.equal(counter.reactive.count, 4);
  assert.equal(
    await trace.applyMutation({
      componentId: 'counter-1',
      path: 'settings.enabled',
      baseline: true,
      value: false,
    }),
    false,
  );

  await assert.rejects(
    () =>
      trace.applyMutation({
        componentId: 'counter-1',
        path: 'count',
        baseline: 1,
        value: 5,
      }),
    /property changed/i,
  );
  await assert.rejects(
    () =>
      trace.applyMutation({
        componentId: 'counter-1',
        path: 'locked',
        baseline: 'fixed',
        value: 'changed',
      }),
    /read only/i,
  );
  await assert.rejects(
    () =>
      trace.applyMutation({
        componentId: 'counter-1',
        path: 'settings',
        baseline: {},
        value: {},
      }),
    /read only/i,
  );
  await assert.rejects(
    () =>
      trace.applyMutation({
        componentId: 'missing',
        path: 'count',
        baseline: 1,
        value: 2,
      }),
    /no longer mounted/i,
  );

  counter.$wire.$set = async () => {
    throw { errors: { count: ['Count is too high.'] } };
  };
  await assert.rejects(
    () =>
      trace.applyMutation({
        componentId: 'counter-1',
        path: 'count',
        baseline: 4,
        value: 999,
      }),
    /Count is too high/,
  );
  assert.equal(trace.snapshot().components[0].status, 'failed');
});

test('removes unmounted components, resets navigation state, bounds capture, and cleans up', () => {
  const root = component('root-1', 'benchmark.root');
  const { hooks, removed, trace } = harness([root]);
  let unmount;
  const transient = component('transient-1', 'benchmark.transient');
  hooks['component.init']({
    component: transient,
    cleanup: (callback) => {
      unmount = callback;
    },
  });
  unmount();

  assert.deepEqual(
    trace.snapshot().components.map(({ id }) => id),
    ['root-1'],
  );
  assert.equal(trace.snapshot().activity.at(-1).kind, 'unmount');

  for (let index = 0; index < 205; index++) {
    hooks['component.init']({
      component: component(`extra-${index}`, 'benchmark.card'),
      cleanup: () => {},
    });
  }
  assert.ok(trace.snapshot().dropped.components > 0);

  trace.resetPage();
  assert.deepEqual(trace.snapshot().components, []);
  assert.deepEqual(trace.snapshot().activity, []);
  assert.equal(trace.snapshot().pageSequence, 2);

  const repeated = component('repeat-1', 'benchmark.repeat');
  for (let index = 0; index < 505; index++) {
    hooks['component.init']({ component: repeated, cleanup: () => {} });
  }
  assert.equal(trace.snapshot().activity.length, 500);
  assert.ok(trace.snapshot().dropped.activity > 0);

  trace.destroy();
  assert.deepEqual(removed, ['hook:component.init', 'message', 'request']);
  assert.equal(trace.snapshot().ready, false);
});

test('subscriptions are isolated and the browser installer is idempotent', () => {
  const listeners = {};
  const browser = {
    addEventListener: (name, callback) => {
      listeners[name] = callback;
    },
    performance: { now: () => 1 },
  };
  const trace = installLivewireTrace(browser);
  const snapshots = [];
  const unsubscribe = trace.subscribe((snapshot) => snapshots.push(snapshot));
  trace.subscribe(() => {
    throw new Error('subscriber failed');
  });

  assert.equal(installLivewireTrace(browser), trace);
  assert.equal(snapshots.length, 1);
  unsubscribe();
  listeners['livewire:navigate']();
  assert.equal(snapshots.length, 1);
});

test('normalizes property values and labels without leaking cyclic or unbounded structures', () => {
  const cyclic = { date: new Date('2026-08-21T10:00:00Z') };
  cyclic.self = cyclic;
  cyclic.deep = { one: { two: { three: { four: { five: 'hidden' } } } } };
  cyclic.many = Object.fromEntries(Array.from({ length: 102 }, (_, index) => [index, index]));
  const copy = cloneValue(cyclic);

  assert.equal(copy.date, '2026-08-21T10:00:00.000Z');
  assert.equal(copy.self, '[circular]');
  assert.equal(copy.deep.one.two.three.four, '[maximum depth reached]');
  assert.equal(copy.many.__truncated__, 2);
  assert.equal(humanize('save_profile-now'), 'Save Profile Now');
  assert.equal(humanize('$refresh'), 'Refresh');
  assert.equal(valueType(null), 'Null');
  assert.equal(valueType([]), 'Array');
  assert.equal(valueType(new Date()), 'Date');
  assert.equal(valueType(true), 'Boolean');
  assert.equal(valueType(2), 'Integer');
  assert.equal(valueType(2.5), 'Float');
  assert.equal(valueType('two'), 'String');
  assert.equal(valueType({}), 'Object');
  assert.equal(primitive(undefined), false);
  assert.equal(primitive('value'), true);
});
