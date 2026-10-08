import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareModelRows,
  formatActivity,
  formatModelEvent,
  formatNumber,
  isNumericKey,
  modelRow,
  nextModelSort,
  plural,
  shortModelName,
  sourceCopy,
  sourceLocation,
  sourceShortLabel,
  sourceTitle,
  visibleModelRows,
} from '../../resources/js/inspectors/models.js';

const rows = [
  { model: 'App\\Models\\Zebra', connection: 'mysql', table: 'zebras', load_count: 3, change_count: 0 },
  {
    model: 'App\\Models\\Apple',
    connection: '',
    table: null,
    load_count: 9,
    change_count: 2,
    repeated_load_count: 4,
  },
  { model: 'App\\Models\\Item10', connection: 'sqlite', table: 'items', load_count: 3, change_count: 1 },
  { model: 'App\\Models\\Item9', connection: 'sqlite', table: 'items', change_count: 1 },
].map(modelRow);

const order = (options) => visibleModelRows(rows, options).map((row) => row.shortName);

test('model rows derive list facts and search text from each model group', () => {
  assert.deepEqual(
    { ...rows[1], group: undefined },
    {
      index: 1,
      group: undefined,
      shortName: 'Apple',
      connection: '—',
      table: '—',
      retrieved: 9,
      writes: 2,
      reloads: 4,
      sortName: 'apple',
      search: 'app\\models\\apple — —',
    },
  );
  assert.equal(rows[3].retrieved, 0);
  assert.equal(shortModelName(undefined), '');
});

test('model sorting cycles through first direction, reverse, and capture order', () => {
  let sort = { sort: 'capture', direction: 'asc' };
  sort = nextModelSort(sort, 'model');
  assert.deepEqual(sort, { sort: 'model', direction: 'asc' });
  assert.deepEqual(order(sort), ['Apple', 'Item9', 'Item10', 'Zebra']);
  sort = nextModelSort(sort, 'model');
  assert.deepEqual(order(sort), ['Zebra', 'Item10', 'Item9', 'Apple']);
  sort = nextModelSort(sort, 'model');
  assert.deepEqual(sort, { sort: 'capture', direction: 'asc' });
  assert.deepEqual(order(sort), ['Zebra', 'Apple', 'Item10', 'Item9']);

  sort = nextModelSort(sort, 'retrieved');
  assert.deepEqual(sort, { sort: 'retrieved', direction: 'desc' });
  assert.deepEqual(order(sort), ['Apple', 'Zebra', 'Item10', 'Item9']);
  sort = nextModelSort(sort, 'retrieved');
  assert.deepEqual(order(sort), ['Item9', 'Zebra', 'Item10', 'Apple']);
  assert.deepEqual(nextModelSort(sort, 'writes'), { sort: 'writes', direction: 'desc' });
  assert.deepEqual(nextModelSort(sort, 'unknown'), sort);
  assert.equal(compareModelRows(rows[0], rows[1], { sort: 'unknown' }), -1);

  assert.deepEqual(order({ search: ' ITEM ' }), ['Item10', 'Item9']);
  assert.deepEqual(order({ search: 'zebras' }), ['Zebra']);
  assert.deepEqual(order(), ['Zebra', 'Apple', 'Item10', 'Item9']);
});

test('model source labels prefer original Blade templates and application locations', () => {
  const application = { file: 'app/Http/Controllers/TripController.php', line: '42' };
  const compiled = {
    kind: 'compiled_view',
    file: 'storage/framework/views/abc.php',
    line: 7,
    template_file: 'resources/views/trips/show.blade.php',
  };
  const windows = { file: 'app\\Actions\\Sync.php', line: 0 };

  assert.equal(sourceLocation(application), 'app/Http/Controllers/TripController.php:42');
  assert.equal(sourceLocation(windows), 'app\\Actions\\Sync.php');
  assert.equal(sourceLocation({ file: '' }), null);
  assert.equal(sourceLocation(null), null);
  assert.equal(sourceTitle(application), 'app/Http/Controllers/TripController.php:42');
  assert.equal(
    sourceTitle(compiled),
    'Blade resources/views/trips/show.blade.php, compiled storage/framework/views/abc.php:7',
  );
  assert.equal(sourceTitle(null), 'Source unavailable');
  assert.equal(sourceShortLabel(application), 'TripController.php:42');
  assert.equal(sourceShortLabel(windows), 'Sync.php');
  assert.equal(sourceShortLabel(compiled), 'show.blade.php');
  assert.equal(sourceShortLabel({ line: 3 }), '—');
  assert.equal(sourceCopy(compiled), 'resources/views/trips/show.blade.php');
  assert.equal(sourceCopy(application), 'app/Http/Controllers/TripController.php:42');
  assert.equal(sourceCopy('app/file.php'), null);
  assert.equal(sourceCopy({ line: 2 }), null);
});

test('model activity, events, keys, and numbers read like the PHP views', () => {
  assert.equal(formatActivity(1, 0), '1 retrieval');
  assert.equal(formatActivity(1200, 2), '1,200 retrievals, 2 writes');
  assert.equal(formatActivity(0, 1), '1 write');
  assert.equal(formatActivity(0, 0), 'No retained activity');
  assert.equal(formatModelEvent('forceDeleted'), 'Force deleted');
  assert.equal(formatModelEvent('updated'), 'Updated');
  assert.equal(formatModelEvent('pivot_attached'), 'Pivot Attached');
  assert.equal(formatNumber(1234567), '1,234,567');
  assert.equal(plural('model', 1), 'model');
  assert.equal(plural('model', 0), 'models');
  assert.equal(isNumericKey(4), true);
  assert.equal(isNumericKey('42'), true);
  assert.equal(isNumericKey('1.5e3'), true);
  assert.equal(isNumericKey('uuid-1'), false);
  assert.equal(isNumericKey(''), false);
  assert.equal(isNumericKey(null), false);
  assert.equal(isNumericKey(Number.NaN), false);
});
