import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cacheOperationDetails,
  cacheResultWarns,
  cacheSummary,
  cacheView,
  matchesCacheOperation,
} from '../../resources/js/inspectors/cache.js';

const operations = [
  { execution: 1, category: 'read', failed: false, search: 'get hit trip alpha array' },
  { execution: 2, category: 'write', failed: false, search: 'put stored trip beta redis' },
  { execution: 3, category: 'delete', failed: true, search: 'forget failed trip stale database' },
];
const visible = (view) => view.rows.filter((row) => row.visible).map((row) => row.item.execution);

test('Cache filters, searches, and keeps a visible operation selected', () => {
  let view = cacheView(operations, { selected: 1 });
  assert.deepEqual(visible(view), [1, 2, 3]);
  assert.equal(view.visibleCount, 3);
  assert.equal(view.selected, 1);

  view = cacheView(operations, { filter: 'failed', selected: 1 });
  assert.deepEqual(visible(view), [3]);
  assert.equal(view.selected, 3);
  assert.deepEqual(visible(cacheView(operations, { filter: 'writes', selected: 3 })), [2]);
  assert.deepEqual(visible(cacheView(operations, { filter: 'reads' })), [1]);
  assert.deepEqual(visible(cacheView(operations, { filter: 'deletes' })), [3]);
  assert.deepEqual(visible(cacheView(operations, { search: ' ALPHA ' })), [1]);
  assert.deepEqual(visible(cacheView(operations, { filter: 'unknown' })), []);

  view = cacheView(operations, { search: 'nothing', selected: 2 });
  assert.equal(view.visibleCount, 0);
  assert.equal(view.selected, null);
  assert.equal(cacheView([]).selected, null);
  assert.equal(matchesCacheOperation({ execution: 4 }, { search: 'x' }), false);
  assert.equal(matchesCacheOperation({ execution: 4 }), true);
});

test('Cache summarizes hit rate, filters, and attention', () => {
  const figures = cacheSummary(
    {
      retained_count: 17,
      reads: 5,
      hits: 2,
      misses: 3,
      writes: 4,
      forgets: 1,
      flushes: 1,
      failures: 3,
      repeated_miss_count: 1,
      hit_rate: 40,
      high_miss_rate: true,
      duration_ms: 2.5,
      filter_counts: { failed: 3 },
    },
    17,
  );

  assert.equal(figures.countLabel, '17 operations');
  assert.equal(figures.hitRateLabel, '40.0% hit rate');
  assert.equal(figures.hitsLabel, '2 hits, 3 misses');
  assert.equal(figures.highMissRate, true);
  assert.equal(figures.durationMs, 2.5);
  assert.deepEqual(figures.filters, [
    ['all', 'All', 17],
    ['reads', 'Reads', 5],
    ['writes', 'Writes', 4],
    ['deletes', 'Deletes', 2],
    ['failed', 'Failed', 3],
  ]);
  assert.equal(figures.attention, '3 failed operations, 1 repeatedly missed key, 1 store flush.');

  const quiet = cacheSummary({ hits: 1, misses: 1, failures: 1, repeated_miss_count: 2, flushes: 2 }, 2);
  assert.equal(quiet.countLabel, '2 operations');
  assert.equal(quiet.hitsLabel, '1 hit, 1 miss');
  assert.equal(quiet.attention, '1 failed operation, 2 repeatedly missed keys, 2 store flushes.');

  const empty = cacheSummary(undefined, 1);
  assert.equal(empty.countLabel, '1 operation');
  assert.equal(empty.hitRateLabel, '0.0% hit rate');
  assert.deepEqual(empty.filters, [['all', 'All', 1]]);
  assert.equal(empty.attention, null);
  assert.equal(empty.highMissRate, false);
});

test('Cache marks warning results and chooses supporting details', () => {
  assert.equal(cacheResultWarns({ result: 'miss' }), true);
  assert.equal(cacheResultWarns({ result: 'flushed' }), true);
  assert.equal(cacheResultWarns({ result: 'miss', failed: true }), false);
  assert.equal(cacheResultWarns({ result: 'hit' }), false);

  assert.deepEqual(cacheOperationDetails({ operation: 'write', callsite: { file: 'app/A.php' } }), {
    write: true,
    batch: false,
    failure: false,
    any: true,
    callsite: true,
    source: true,
  });
  assert.deepEqual(cacheOperationDetails({ operation: 'read', duration_scope: 'batch', stack: [{}] }), {
    write: false,
    batch: true,
    failure: false,
    any: true,
    callsite: false,
    source: true,
  });
  assert.deepEqual(cacheOperationDetails({ failed: true, exception_message: 'Down', callsite: null }), {
    write: false,
    batch: false,
    failure: true,
    any: true,
    callsite: false,
    source: false,
  });
  assert.equal(cacheOperationDetails({ failed: true }).any, false);
});
