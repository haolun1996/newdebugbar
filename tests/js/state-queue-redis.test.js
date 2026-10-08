import assert from 'node:assert/strict';
import test from 'node:test';

import {
  QUEUE_STATUS_FALLBACK,
  effectiveQueueFilter,
  matchesQueueActivity,
  queueAttemptLabel,
  queueDetailStatusClass,
  queueRetryText,
  queueStatusClass,
  queueSummary,
  queueTargets,
  queueView,
} from '../../resources/js/inspectors/queue.js';
import {
  matchesRedisCommand,
  redisAfterResponseText,
  redisKeyEvidence,
  redisSummary,
  redisView,
} from '../../resources/js/inspectors/redis.js';
import { formatDuration } from '../../resources/js/duration.js';

const activities = [
  { execution: 1, status_group: 'waiting', search: 'sendreceipt redis mail' },
  { execution: 2, status_group: 'failed', search: 'syncinvoice runtimeexception' },
  { execution: 3, status_group: 'completed', search: 'reindexsearch completed' },
];
const visible = (view) => view.rows.filter((row) => row.visible).map((row) => row.item.execution);

test('Queue searches, filters, and keeps a visible job selected', () => {
  let view = queueView(activities, { selected: 1 });
  assert.deepEqual(visible(view), [1, 2, 3]);
  assert.equal(view.selected, 1);

  view = queueView(activities, { filter: 'failed', selected: 1 });
  assert.deepEqual(visible(view), [2]);
  assert.equal(view.selected, 2);
  assert.deepEqual(visible(queueView(activities, { search: ' REINDEX ' })), [3]);

  view = queueView(activities, { search: 'missing', selected: 2 });
  assert.equal(view.visibleCount, 0);
  assert.equal(view.selected, null);
  assert.equal(matchesQueueActivity({ status_group: 'waiting' }, { search: 'x' }), false);
  assert.equal(matchesQueueActivity({ status_group: 'waiting' }), true);

  assert.equal(effectiveQueueFilter(activities, 'failed'), 'failed');
  assert.equal(effectiveQueueFilter([activities[0]], 'failed'), 'all');
  assert.equal(effectiveQueueFilter([], 'all'), 'all');
});

test('Queue summarizes jobs, groups, and status presentation', () => {
  const figures = queueSummary({ duration_ms: 4.25, failed_count: 1 }, activities, formatDuration);

  assert.equal(figures.countLabel, '3 jobs');
  assert.equal(figures.line, '4.25 ms total, 1 waiting, 1 failure');
  assert.deepEqual(figures.filters, [
    ['all', 'All', 3],
    ['waiting', 'Waiting', 1],
    ['failed', 'Failed', 1],
    ['completed', 'Completed', 1],
  ]);

  const single = queueSummary({ failed_count: 2 }, [{ status_group: 'failed' }]);
  assert.equal(single.countLabel, '1 job');
  assert.equal(single.line, '0 total, 2 failures');
  assert.deepEqual(single.filters, [
    ['all', 'All', 1],
    ['failed', 'Failed', 1],
  ]);
  assert.equal(queueSummary().line, '0 total');

  assert.match(queueStatusClass('failed'), /ndb:bg-red-100/);
  assert.equal(queueStatusClass('unknown'), QUEUE_STATUS_FALLBACK);
  assert.match(queueDetailStatusClass('failed'), /red/);
  assert.match(queueDetailStatusClass('delayed'), /amber/);
  assert.match(queueDetailStatusClass('waiting'), /amber/);
  assert.match(queueDetailStatusClass('processing'), /indigo/);
  assert.match(queueDetailStatusClass('queued'), /sky/);
  assert.match(queueDetailStatusClass('sent'), /emerald/);
  assert.match(queueDetailStatusClass('completed'), /emerald/);
  assert.equal(queueDetailStatusClass('unknown'), '');
});

test('Queue explains retries, attempts, and communication targets', () => {
  assert.equal(
    queueRetryText({ will_retry: true, attempts: [{}] }),
    'Laravel can retry this job. Check the retained worker attempts below.',
  );
  assert.equal(
    queueRetryText({ will_retry: true }),
    'Laravel can retry this job. No worker attempt has been retained yet.',
  );
  assert.equal(
    queueRetryText({ will_retry: false, attempts: [] }),
    'Open the linked worker profile to inspect the failure in context.',
  );
  assert.equal(queueAttemptLabel({ attempt: null, sequence: 2 }), 'Attempt 2');
  assert.equal(queueAttemptLabel({ sequence: 3 }), 'Attempt 3');
  assert.equal(queueAttemptLabel({ attempt: 4, sequence: 1 }), 'Attempt 4');
  assert.equal(queueTargets({ recipient_count: 2 }), 2);
  assert.equal(queueTargets({ recipient_count: 0, notifiable_count: 3 }), 3);
  assert.equal(queueTargets({}), '—');
});

test('Redis filters failures, searches, and summarizes commands', () => {
  const commands = [
    { execution: 1, failed: false, search: 'get private-direct-key default' },
    { execution: 2, failed: true, search: 'hget private-hash sessions' },
  ];

  let view = redisView(commands, { selected: 1 });
  assert.deepEqual(visible(view), [1, 2]);
  assert.equal(view.selected, 1);
  view = redisView(commands, { filter: 'failed', selected: 1 });
  assert.deepEqual(visible(view), [2]);
  assert.equal(view.selected, 2);
  view = redisView(commands, { search: 'nothing', selected: 2 });
  assert.equal(view.selected, null);
  assert.equal(matchesRedisCommand({}, { search: 'x' }), false);
  assert.equal(matchesRedisCommand({}), true);

  const figures = redisSummary({ duration_ms: 1.25 }, commands, formatDuration);
  assert.equal(figures.countLabel, '2 commands');
  assert.equal(figures.failures, 1);
  assert.equal(figures.line, '1.25 ms total, 1 failure');
  const many = redisSummary({ failed_count: 3 }, [{}]);
  assert.equal(many.countLabel, '1 command');
  assert.equal(many.line, '0 total, 3 failures');
  assert.equal(redisSummary().line, '0 total');
});

test('Redis presents retained keys, protected identifiers, and lifecycle notes', () => {
  const keys = redisKeyEvidence({ keys: ['trip:kyoto', 'trip:nara'], key_hashes: ['abc'], key_dropped: 1 });
  assert.equal(keys.copy, 'trip:kyoto\ntrip:nara');
  assert.equal(keys.copyLabel, 'Copy keys');
  assert.equal(keys.protectedOnly, false);
  assert.equal(keys.none, false);
  assert.equal(
    keys.droppedLabel,
    'more key was not retained because this command reached the capture limit.',
  );

  const hashed = redisKeyEvidence({ keys: [], key_hashes: ['abc', 'def'], key_dropped: 2 });
  assert.equal(hashed.copy, 'abc\ndef');
  assert.equal(hashed.copyLabel, 'Copy identifiers');
  assert.equal(hashed.protectedOnly, true);
  assert.equal(
    hashed.droppedLabel,
    'more keys were not retained because this command reached the capture limit.',
  );

  const none = redisKeyEvidence({});
  assert.equal(none.none, true);
  assert.equal(none.dropped, 0);

  assert.equal(
    redisAfterResponseText({ after_response_label: '2 ms' }),
    'This command ran 2 ms after the response was sent, so its time is not part of the response time.',
  );
  assert.equal(
    redisAfterResponseText({}),
    'This command ran after the response was sent, so its time is not part of the response time.',
  );
});
