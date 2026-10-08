import assert from 'node:assert/strict';
import test from 'node:test';

import {
  contextValue,
  filterLogs,
  logChannels,
  logFirstSequence,
  logLevels,
  logRecordCount,
  logWallTime,
  naturalCompare,
  prettyJson,
  requestTimeLabel,
  splitContext,
} from '../../resources/js/inspectors/logs.js';

const entry = (level, attention, channel, search, count = 1, sequence = 1) => ({
  level,
  attention,
  channel_filter: channel,
  channel_label: channel,
  search,
  repeat_count: count,
  first_sequence: sequence,
});

test('log filters combine severity, channel, and search without losing record counts', () => {
  const groups = [
    entry('info', false, 'stack', 'booking ready', 1, 1),
    entry('warning', true, 'audit', 'retry needs attention', 3, 2),
    entry('error', true, 'stack', 'partner rejected kyo-441', 2, 5),
    { level: 'debug', search: 'no channel', sequence: 7 },
  ];

  assert.deepEqual(filterLogs(groups).visible.length, 4);
  assert.equal(filterLogs(groups).records, 7);
  assert.deepEqual(filterLogs(groups, { level: 'attention' }).visible.map(logFirstSequence), [2, 5]);
  assert.equal(filterLogs(groups, { level: 'attention' }).records, 5);
  assert.deepEqual(filterLogs(groups, { level: 'error' }).visible.map(logFirstSequence), [5]);
  assert.deepEqual(filterLogs(groups, { channel: 'stack' }).visible.map(logFirstSequence), [1, 5]);
  assert.deepEqual(filterLogs(groups, { channel: '__unknown__' }).visible.map(logFirstSequence), [7]);
  assert.deepEqual(filterLogs(groups, { search: '  KYO-441 ' }).visible.map(logFirstSequence), [5]);
  assert.deepEqual(filterLogs(groups, { level: 'attention', channel: 'audit', search: 'kyo' }), {
    visible: [],
    records: 0,
  });
  assert.equal(logRecordCount({ repeat_count: 0 }), 1);
  assert.equal(logRecordCount({}), 1);
  assert.equal(logFirstSequence({}), 1);
});

test('log filter options keep severity order and sort channels by label naturally', () => {
  assert.deepEqual(logLevels({ error: 1, custom: 2, debug: 3, info: 0 }), ['debug', 'error', 'custom']);
  assert.deepEqual(logLevels(null), []);
  assert.deepEqual(
    logChannels(
      [
        { channel_filter: 'b', channel_label: 'Channel 10' },
        { channel_filter: 'a', channel_label: 'channel 9' },
      ],
      { b: 1, a: 2, c: 3 },
    ),
    [
      { value: 'c', label: 'c', count: 3 },
      { value: 'a', label: 'channel 9', count: 2 },
      { value: 'b', label: 'Channel 10', count: 1 },
    ],
  );
  assert.deepEqual(logChannels([], null), []);
  assert.equal(naturalCompare('Item2', 'item10'), -1);
  assert.equal(naturalCompare('b', 'A'), 1);
  assert.equal(naturalCompare('same', 'SAME'), 0);
  assert.equal(naturalCompare('ab', 'abc'), -1);
});

test('log details format context, request time, wall time, and JSON like the PHP views', () => {
  assert.equal(requestTimeLabel(null), '—');
  assert.equal(requestTimeLabel(18.432), '+18.43 ms');
  assert.equal(contextValue(null), 'null');
  assert.equal(contextValue(true), 'true');
  assert.equal(contextValue(false), 'false');
  assert.equal(contextValue(41), '41');

  const fields = [
    { key: 'trip_id', value: 41, preview: '41', structured: false },
    { key: 'detail', value: 'long value', preview: 'long…', structured: false },
    { key: 'actor', value: { id: 7 }, preview: '{…}', structured: true },
  ];
  const { compact, expanded } = splitContext(fields);
  assert.deepEqual(
    compact.map((field) => field.key),
    ['trip_id'],
  );
  assert.deepEqual(
    expanded.map((field) => field.key),
    ['detail', 'actor'],
  );

  assert.deepEqual(logWallTime('2026-08-24T16:32:10.123+02:00'), {
    label: '2026-08-24 16:32:10.123 +02:00',
    title: '2026-08-24T16:32:10+02:00',
  });
  assert.deepEqual(logWallTime('2026-08-24T16:32:10Z'), {
    label: '2026-08-24 16:32:10.000 +00:00',
    title: '2026-08-24T16:32:10+00:00',
  });
  assert.equal(logWallTime('2026-08-24T16:32:10.5-0500').label, '2026-08-24 16:32:10.500 -05:00');
  assert.deepEqual(logWallTime('Mon, 24 Aug 2026 16:32:10 GMT'), {
    label: '2026-08-24 16:32:10.000 +00:00',
    title: '2026-08-24T16:32:10+00:00',
  });
  assert.equal(logWallTime('not a date'), null);
  assert.equal(logWallTime(''), null);
  assert.equal(logWallTime(null), null);

  assert.equal(prettyJson({ url: 'a/b', city: '京都' }), '{\n    "url": "a/b",\n    "city": "京都"\n}');
  assert.equal(prettyJson(undefined), 'null');
});
