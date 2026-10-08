import assert from 'node:assert/strict';
import test from 'node:test';
import { attachMagics, createStore, nextTick, toRaw } from '../../resources/js/app/store.js';

const flush = () => new Promise((resolve) => queueMicrotask(resolve));

test('writes through the store batch one notification and bump the version', async () => {
  const target = {
    count: 0,
    nested: { items: [] },
    get double() {
      return this.count * 2;
    },
  };
  const store = createStore(target);
  let notified = 0;
  const unsubscribe = store.subscribe(() => notified++);

  store.state.count = 1;
  store.state.nested.items.push('a');
  store.state.nested.items.push('b');
  assert.equal(notified, 0);
  await flush();

  assert.equal(notified, 1);
  assert.equal(store.getVersion(), 1);
  assert.equal(store.state.double, 2);
  assert.deepEqual(target.nested.items, ['a', 'b']);
  assert.equal(store.state.nested, store.state.nested);
  assert.equal(toRaw(store.state.nested), target.nested);
  assert.equal(toRaw(5), 5);

  store.state.count = 1;
  await flush();
  assert.equal(notified, 1);

  delete store.state.missing;
  delete store.state.nested;
  await flush();
  assert.equal(notified, 2);

  unsubscribe();
  store.state.count = 3;
  await flush();
  assert.equal(notified, 2);
});

test('helpers, frozen payloads, and class instances stay out of reactivity', async () => {
  class Box {
    value = 1;
  }
  const frozen = Object.freeze({ rows: [] });
  const box = new Box();
  const store = createStore(attachMagics({ data: null, box }, { wire: { name: 'wire' } }));
  let notified = 0;
  store.subscribe(() => notified++);

  assert.equal(store.state.$wire.name, 'wire');
  assert.equal(store.state.$nextTick, nextTick);
  store.state.$refs.heading = { id: 'heading' };
  store.state.$root = { id: 'root' };
  await flush();
  assert.equal(notified, 0);
  assert.deepEqual(Object.keys(store.raw), ['data', 'box']);

  store.state.data = frozen;
  assert.equal(store.state.data, frozen);
  assert.equal(store.state.box, box);
  store.state.box.value = 2;
  await flush();
  assert.equal(notified, 1);

  store.state.data = store.state.data;
  const proxied = store.state;
  proxied.self = { inner: true };
  proxied.alias = proxied.self;
  assert.equal(store.raw.alias, store.raw.self);
});

test('setters on the state notify even when the stored value is unchanged', async () => {
  const target = {
    hidden: 0,
    set value(next) {
      this.hidden = next;
    },
    get value() {
      return this.hidden;
    },
  };
  const store = createStore(target);
  let notified = 0;
  store.subscribe(() => notified++);

  store.state.value = 4;
  await flush();
  assert.equal(target.hidden, 4);
  assert.equal(notified, 1);
});

test('nextTick runs callbacks after pending work and survives a failing callback', async () => {
  const order = [];
  const originalError = console.error;
  const errors = [];
  console.error = (error) => errors.push(error);

  try {
    const first = nextTick(() => {
      order.push('first');
      throw new Error('broken');
    });
    const second = nextTick(() => order.push('second'));
    const third = nextTick();
    order.push('sync');
    await Promise.all([second, third]);
    void first;

    assert.deepEqual(order, ['sync', 'first', 'second']);
    assert.equal(errors.length, 1);
  } finally {
    console.error = originalError;
  }
});
