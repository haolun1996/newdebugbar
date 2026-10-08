import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createViewDataLoader,
  defaultViewFilter,
  filterViews,
  findRender,
  firstRenderOrder,
  formatViewData,
  viewDataIsEmpty,
} from '../../resources/js/inspectors/views.js';

const groups = [
  { id: 'view-1', origin: 'application', search: 'trip.show resources/views', count: 2, items: [] },
  {
    id: 'view-2',
    origin: 'application',
    search: 'context',
    count: 1,
    items: [{ render_order: 3 }, { render_order: 5 }],
  },
  { id: 'view-3', origin: 'framework', search: 'layouts.app', count: 4 },
];

test('view filters default to application views and count the renders behind visible views', () => {
  assert.equal(defaultViewFilter(groups), 'application');
  assert.equal(defaultViewFilter([groups[2]]), 'all');
  assert.equal(defaultViewFilter(), 'all');

  const ids = (options) => filterViews(groups, options).visible.map((group) => group.id);
  assert.deepEqual(ids(), ['view-1', 'view-2']);
  assert.equal(filterViews(groups).renders, 3);
  assert.deepEqual(ids({ filter: 'framework' }), ['view-3']);
  assert.deepEqual(ids({ filter: 'all' }), ['view-1', 'view-2', 'view-3']);
  assert.deepEqual(ids({ filter: 'unknown' }), ['view-1', 'view-2', 'view-3']);
  assert.deepEqual(ids({ filter: 'all', search: ' CONTEXT ' }), ['view-2']);
  assert.deepEqual(filterViews(groups, { filter: 'framework', search: 'trip' }), { visible: [], renders: 0 });
  assert.equal(filterViews([{ origin: 'application' }]).renders, 0);
});

test('view renders resolve by render order and format passed data', () => {
  assert.equal(firstRenderOrder(groups[1]), 3);
  assert.equal(firstRenderOrder(groups[0]), null);
  assert.equal(firstRenderOrder(null), null);
  assert.equal(findRender(groups[1], '5'), groups[1].items[1]);
  assert.equal(findRender(groups[1], 9), null);
  assert.equal(findRender(null, 1), null);
  assert.equal(viewDataIsEmpty(null), true);
  assert.equal(viewDataIsEmpty([]), true);
  assert.equal(viewDataIsEmpty({}), true);
  assert.equal(viewDataIsEmpty('value'), true);
  assert.equal(viewDataIsEmpty({ city: 'Kyoto' }), false);
  assert.equal(formatViewData({ city: 'Kyoto' }), '{\n  "city": "Kyoto"\n}');
  assert.equal(formatViewData(null), '{}');
});

test('view data loads ignore stale and cancelled answers', async () => {
  const requests = [];
  const loader = createViewDataLoader(
    (order) =>
      new Promise((resolve, reject) => {
        requests.push({ order, resolve, reject });
      }),
  );
  const results = [];
  const callbacks = {
    onLoad: (data) => results.push(['load', data]),
    onError: () => results.push(['error']),
  };

  const first = loader.load(1, callbacks);
  await Promise.resolve();
  const second = loader.load('2', callbacks);
  await Promise.resolve();
  requests[0].resolve({ city: 'Old' });
  requests[1].resolve(null);
  await Promise.all([first, second]);
  assert.deepEqual(
    requests.map((request) => request.order),
    [1, 2],
  );
  assert.deepEqual(results, [['load', {}]]);

  const failed = loader.load(3, callbacks);
  await Promise.resolve();
  requests[2].reject(new Error('expired'));
  await failed;
  assert.deepEqual(results.at(-1), ['error']);

  const cancelled = loader.load(4, callbacks);
  await Promise.resolve();
  loader.cancel();
  requests[3].resolve({ city: 'Late' });
  await cancelled;
  assert.equal(results.length, 2);

  await loader.load(0, callbacks);
  await loader.load(Number.NaN, callbacks);
  assert.deepEqual(results.slice(2), [['error'], ['error']]);
  assert.equal(requests.length, 4);
});
