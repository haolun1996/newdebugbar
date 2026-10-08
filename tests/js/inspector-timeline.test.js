import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_TIMELINE_QUERY,
  TIMELINE_PAGE_SIZE,
  createRequestGate,
  filteredTimelineQuery,
  nextTimelinePageQuery,
  sameTimelineQuery,
  timelineItemView,
  timelineQuery,
  timelineSourceOptions,
  timelineSummary,
  titleCase,
} from '../../resources/js/inspectors/timeline.js';

test('timeline queries page by fifty and restart from the first page after filtering', () => {
  assert.equal(TIMELINE_PAGE_SIZE, 50);
  assert.deepEqual(timelineQuery({ filter: 'queries', search: 'users', limit: 100 }), {
    filter: 'queries',
    search: 'users',
    limit: 100,
  });
  assert.deepEqual(timelineQuery(null), DEFAULT_TIMELINE_QUERY);
  assert.deepEqual(timelineQuery({ filter: 3, limit: 0 }), DEFAULT_TIMELINE_QUERY);

  const second = nextTimelinePageQuery(DEFAULT_TIMELINE_QUERY);
  assert.deepEqual(second, { filter: 'key', search: '', limit: 100 });
  assert.equal(nextTimelinePageQuery(second).limit, 150);
  assert.deepEqual(filteredTimelineQuery('logs', 'event 119'), {
    filter: 'logs',
    search: 'event 119',
    limit: 50,
  });
  assert.equal(sameTimelineQuery(DEFAULT_TIMELINE_QUERY, { filter: 'key', search: '', limit: 50 }), true);
  assert.equal(sameTimelineQuery(DEFAULT_TIMELINE_QUERY, second), false);
  assert.equal(sameTimelineQuery(DEFAULT_TIMELINE_QUERY, { ...second, limit: 50, search: 'x' }), false);
  assert.equal(sameTimelineQuery(DEFAULT_TIMELINE_QUERY, { ...second, limit: 50, filter: 'all' }), false);
});

test('timeline sources and labels use Laravel title case', () => {
  assert.equal(titleCase('http_client'), 'Http Client');
  assert.equal(titleCase('QUEUE_job'), 'Queue Job');
  assert.equal(titleCase(null), '');
  assert.deepEqual(
    timelineSourceOptions({ available_inspectors: ['request', 'queries', 'http_client'], items: [] }),
    [
      { value: 'queries', label: 'Queries' },
      { value: 'http_client', label: 'Http Client' },
    ],
  );
  assert.deepEqual(
    timelineSourceOptions({
      items: [{ inspector: 'logs' }, { inspector: 'logs' }, { inspector: 'request' }],
    }),
    [{ value: 'logs', label: 'Logs' }],
  );
  assert.deepEqual(timelineSourceOptions(undefined), []);
});

test('timeline summaries describe loaded, matching, and remaining activity', () => {
  const items = Array.from({ length: 50 }, (_, index) => ({ id: `logs-${index}`, at_ms: index }));
  const paged = timelineSummary({
    items,
    total_item_count: 122,
    matching_item_count: 122,
    total_duration_ms: 121,
    has_more: true,
  });

  assert.equal(paged.matchingLabel, '122 matching');
  assert.equal(paged.loadedLabel, '50 loaded from 122 captured across 121 ms');
  assert.equal(paged.pageLabel, 'Showing 50 of 122 timeline events. More activity loads as you scroll.');
  assert.equal(paged.loadingLabel, 'Loading up to 50 more timeline events…');
  assert.equal(paged.completeLabel, 'All 122 timeline events are loaded.');
  assert.equal(paged.hasMore, true);
  assert.deepEqual(
    paged.ticks.map(({ label }) => label),
    ['0 µs', '30.25 ms', '60.5 ms', '90.75 ms', '121 ms'],
  );

  const fallback = timelineSummary({ items: [{ at_ms: 2 }, { at_ms: 'bad' }] });
  assert.equal(fallback.total, 2);
  assert.equal(fallback.matches, 2);
  assert.equal(fallback.duration, 2);
  assert.equal(fallback.completeLabel, null);
  assert.equal(fallback.hasMore, false);

  const empty = timelineSummary(undefined);
  assert.equal(empty.total, 0);
  assert.equal(empty.duration, 0.001);
});

test('timeline rows describe spans, milestones, and events', () => {
  const span = timelineItemView({
    id: 'queries-0',
    inspector: 'queries',
    inspector_label: 'Queries',
    kind: 'span',
    label: 'select * from trips',
    at_ms: 12.5,
    start_ms: 10,
    duration_ms: 2.5,
    source: { file: 'app/Trips/LoadTrip.php', line: 24 },
    at_percent: 50,
    start_percent: 40,
    duration_percent: 10,
  });

  assert.deepEqual(span, {
    id: 'queries-0',
    inspector: 'queries',
    inspectorLabel: 'Queries',
    kind: 'span',
    kindLabel: 'Duration',
    label: 'select * from trips',
    atMs: 12.5,
    atLabel: '12.5 ms',
    startMs: 10,
    startLabel: '10 ms',
    durationMs: 2.5,
    durationLabel: '2.5 ms',
    source: 'app/Trips/LoadTrip.php:24',
    atPercent: 50,
    startPercent: 40,
    durationPercent: 10,
  });

  const milestone = timelineItemView({
    id: 'request-start',
    inspector: 'request',
    kind: 'milestone',
    label: 'Request started',
    at_ms: 0,
    at_percent: 0,
  });
  assert.equal(milestone.inspectorLabel, 'Request');
  assert.equal(milestone.kindLabel, 'Request milestone');
  assert.equal(milestone.startLabel, null);
  assert.equal(milestone.durationLabel, null);
  assert.equal(milestone.source, null);
  assert.equal(milestone.startPercent, 0);
  assert.equal(milestone.durationPercent, 0);

  const event = timelineItemView({
    id: 7,
    inspector: 'http_client',
    kind: 'event',
    label: 'GET /',
    at_ms: 1,
    source: { file: 'app/Client.php' },
  });
  assert.equal(event.id, '7');
  assert.equal(event.inspectorLabel, 'Http Client');
  assert.equal(event.kindLabel, 'Event');
  assert.equal(event.source, 'app/Client.php:1');
});

test('only the newest timeline request may apply its result', () => {
  const gate = createRequestGate();
  const filter = gate.begin();
  const page = gate.begin();

  assert.equal(gate.current(filter), false);
  assert.equal(gate.current(page), true);

  gate.invalidate();
  assert.equal(gate.current(page), false);
  assert.equal(gate.current(gate.begin()), true);
});
