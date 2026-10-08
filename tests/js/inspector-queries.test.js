import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXPLAIN_FAILED,
  cachedExplains,
  compareQueries,
  executionCount,
  findingQuery,
  formatQueryEvidence,
  formatQueryType,
  hasQuerySource,
  matchesQuery,
  needsExplain,
  nextQuerySort,
  queryFilters,
  rememberExplain,
  selectedExecution,
  visibleQueries,
  withExplains,
} from '../../resources/js/ui/inspectors/queries/query-view.js';

const records = Object.freeze([
  Object.freeze({
    key: 'group-users',
    execution: 1,
    duration_ms: 10,
    query_type: 'read',
    attention: true,
    slow: false,
    repeated: true,
    count: 2,
    search: 'select users 1 2',
    executions: Object.freeze([
      Object.freeze({ execution: 1, explain_available: true, explain: null, explain_error: null }),
      Object.freeze({ execution: 2, explain_available: true, explain: null, explain_error: null }),
    ]),
  }),
  Object.freeze({
    key: 'query-3',
    execution: 3,
    duration_ms: 20,
    query_type: 'write',
    attention: true,
    slow: true,
    repeated: false,
    count: 1,
    search: 'update clinics 42',
    executions: Object.freeze([Object.freeze({ execution: 3, explain_available: false })]),
  }),
  Object.freeze({
    key: 'query-4',
    execution: 4,
    duration_ms: 8,
    query_type: 'read',
    attention: false,
    slow: false,
    repeated: false,
    count: 1,
    search: 'select clinics 42',
    executions: Object.freeze([Object.freeze({ execution: 4, explain_available: true })]),
  }),
]);

const keys = (list) => list.map((record) => record.key);

test('filters and searches records by attention, type, and lowercase search text', () => {
  assert.deepEqual(keys(visibleQueries(records)), ['group-users', 'query-3', 'query-4']);
  assert.deepEqual(keys(visibleQueries(records, { filter: 'attention' })), ['group-users', 'query-3']);
  assert.deepEqual(keys(visibleQueries(records, { filter: 'read' })), ['group-users', 'query-4']);
  assert.deepEqual(keys(visibleQueries(records, { filter: 'write' })), ['query-3']);
  assert.deepEqual(keys(visibleQueries(records, { search: '  CLINICS ' })), ['query-3', 'query-4']);
  assert.deepEqual(keys(visibleQueries(records, { filter: 'read', search: 'clinics' })), ['query-4']);
  assert.equal(matchesQuery(records[0], 'unknown', ''), false);
  assert.equal(matchesQuery({ query_type: 'read' }, 'all', 'x'), false);
  assert.equal(matchesQuery({ query_type: 'read' }, 'all', null), true);
});

test('sorts by duration in both directions with execution order as the tie-breaker', () => {
  assert.deepEqual(keys(visibleQueries(records, { sort: 'duration', direction: 'desc' })), [
    'query-3',
    'group-users',
    'query-4',
  ]);
  assert.deepEqual(keys(visibleQueries(records, { sort: 'duration', direction: 'asc' })), [
    'query-4',
    'group-users',
    'query-3',
  ]);
  assert.equal(
    compareQueries({ execution: 2, duration_ms: 5 }, { execution: 1, duration_ms: 5 }, 'duration'),
    1,
  );
  assert.equal(compareQueries({}, {}), 0);
  assert.equal(compareQueries({}, {}, 'duration', 'desc'), 0);
});

test('duration sorting cycles from descending to ascending to execution order', () => {
  assert.deepEqual(nextQuerySort('execution', 'asc'), { sort: 'duration', direction: 'desc' });
  assert.deepEqual(nextQuerySort('duration', 'desc'), { sort: 'duration', direction: 'asc' });
  assert.deepEqual(nextQuerySort('duration', 'asc'), { sort: 'execution', direction: 'asc' });
});

test('counts every run of a repeated pattern and mirrors the presenter filter options', () => {
  assert.equal(executionCount(records), 4);
  assert.equal(executionCount([{}]), 1);
  assert.deepEqual(queryFilters(records), {
    all: ['All', 4],
    attention: ['Needs attention', 3],
    read: ['Reads', 3],
    write: ['Writes', 1],
  });
});

test('finding intents choose the first visible repeated or slow record', () => {
  assert.equal(findingQuery(records, 'repeated').key, 'group-users');
  assert.equal(findingQuery(records, 'slow').key, 'query-3');
  assert.equal(findingQuery(records.slice(2), 'slow'), null);
  assert.equal(findingQuery(records, 'attention'), null);
});

test('selects a run of a record and falls back to its first run', () => {
  assert.equal(selectedExecution(records[0], 2).execution, 2);
  assert.equal(selectedExecution(records[0], 9).execution, 1);
  assert.equal(selectedExecution(null, 1), null);
  assert.equal(selectedExecution({ executions: [] }, 1), null);
  assert.equal(hasQuerySource({ source_available: true }), true);
  assert.equal(hasQuerySource({ source_available: false, stack: [{ file: 'a.php' }] }), true);
  assert.equal(hasQuerySource({ source_available: false, stack: [] }), false);
  assert.equal(hasQuerySource(null), false);
});

test('merges transient EXPLAIN state per run without mutating captured records', () => {
  const merged = withExplains(records, {
    1: { explain: { rows: [{ detail: 'SCAN users' }] }, error: null },
    2: { loading: true },
    4: { explain: null, error: 'The database connection is unavailable.' },
  });

  assert.deepEqual(merged[0].executions[0].explain, { rows: [{ detail: 'SCAN users' }] });
  assert.equal(merged[0].executions[0].explain_loading, false);
  assert.equal(merged[0].executions[1].explain_loading, true);
  assert.equal(merged[0].executions[1].explain, null);
  assert.equal(merged[1].executions[0].explain_error, null);
  assert.equal(merged[2].executions[0].explain_error, 'The database connection is unavailable.');
  assert.equal(records[0].executions[0].explain, null);
  assert.deepEqual(withExplains([{ key: 'empty' }]), [{ key: 'empty', executions: [] }]);

  assert.equal(needsExplain(records[0].executions[0]), true);
  assert.equal(needsExplain(records[1].executions[0]), false);
  assert.equal(needsExplain(merged[0].executions[0]), false);
  assert.equal(needsExplain(merged[0].executions[1]), false);
  assert.equal(needsExplain(merged[2].executions[0]), false);
  assert.equal(needsExplain(null), false);
});

test('remembers EXPLAIN results per profile within a bounded cache', () => {
  assert.deepEqual(cachedExplains('missing'), {});
  rememberExplain('kyoto', 2, { loading: true });
  const explains = rememberExplain('kyoto', 2, { explain: null, error: EXPLAIN_FAILED });
  assert.deepEqual(explains, { 2: { explain: null, error: EXPLAIN_FAILED } });
  assert.deepEqual(cachedExplains('kyoto'), explains);

  for (let index = 0; index < 25; index++) rememberExplain(`profile-${index}`, 1, { loading: true });

  assert.deepEqual(cachedExplains('kyoto'), {});
  assert.deepEqual(cachedExplains('profile-24'), { 1: { loading: true } });
});

test('formats evidence and query types for display', () => {
  assert.equal(formatQueryEvidence(null), 'No evidence was captured.');
  assert.equal(formatQueryEvidence(undefined), 'No evidence was captured.');
  assert.equal(formatQueryEvidence(''), 'No evidence was captured.');
  assert.equal(formatQueryEvidence('raw plan'), 'raw plan');
  assert.equal(formatQueryEvidence([{ id: 1 }]), '[\n  {\n    "id": 1\n  }\n]');
  assert.equal(formatQueryType('read'), 'Read');
  assert.equal(formatQueryType(''), 'Query');
  assert.equal(formatQueryType(null), 'Query');
});
