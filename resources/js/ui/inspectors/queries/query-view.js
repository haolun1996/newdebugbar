/** Pure list, sort, and evidence rules for the queries inspector. */

export const QUERY_FILTERS = ['all', 'attention', 'read', 'write'];
export const QUERY_FINDING_FILTERS = ['repeated', 'slow'];
export const QUERY_DETAIL_TABS = ['overview', 'explain'];
export const EXPLAIN_FAILED = 'EXPLAIN could not be completed.';

/** Whether a presented query record passes the selected filter and lowercase search text. */
export function matchesQuery(record, filter, search) {
  const matchesFilter =
    filter === 'all' ||
    (filter === 'attention' && record.attention === true) ||
    (filter === 'read' && record.query_type === 'read') ||
    (filter === 'write' && record.query_type === 'write');
  const term = String(search ?? '')
    .toLowerCase()
    .trim();

  return matchesFilter && (term === '' || String(record.search ?? '').includes(term));
}

/** Orders records by first execution, or by duration with execution as the tie-breaker. */
export function compareQueries(left, right, sort = 'execution', direction = 'asc') {
  const byExecution = Number(left.execution ?? 0) - Number(right.execution ?? 0);
  if (sort !== 'duration') return byExecution;

  const byDuration = Number(left.duration_ms ?? 0) - Number(right.duration_ms ?? 0);

  return (direction === 'asc' ? byDuration : -byDuration) || byExecution;
}

/** The filtered, searched, and sorted records shown in the list. */
export function visibleQueries(
  records,
  { filter = 'all', search = '', sort = 'execution', direction = 'asc' } = {},
) {
  return records
    .filter((record) => matchesQuery(record, filter, search))
    .sort((left, right) => compareQueries(left, right, sort, direction));
}

/** Counts executions, so a repeated group contributes each of its runs. */
export function executionCount(records) {
  return records.reduce((count, record) => count + Number(record.count ?? 1), 0);
}

/** Duration sort cycles descending → ascending → execution order. */
export function nextQuerySort(sort, direction) {
  if (sort !== 'duration') return { sort: 'duration', direction: 'desc' };
  if (direction === 'desc') return { sort: 'duration', direction: 'asc' };

  return { sort: 'execution', direction: 'asc' };
}

/** The first visible record that matches a finding intent (repeated or slow). */
export function findingQuery(records, finding) {
  if (!QUERY_FINDING_FILTERS.includes(finding)) return null;

  return records.find((record) => record[finding] === true) ?? null;
}

/** The selected run of a record, falling back to its first run. */
export function selectedExecution(record, execution) {
  const executions = record?.executions ?? [];

  return executions.find((query) => query.execution === execution) ?? executions[0] ?? null;
}

/** Whether a run has a source location or captured application stack to show. */
export function hasQuerySource(query) {
  return query?.source_available === true || (Array.isArray(query?.stack) && query.stack.length > 0);
}

/** Adds the transient EXPLAIN result for each run, like QueryRecordPresenter::withExplains. */
export function withExplains(records, explains = {}) {
  return records.map((record) => ({
    ...record,
    executions: (record.executions ?? []).map((query) => {
      const result = explains[query.execution];

      return {
        ...query,
        explain: result?.explain ?? query.explain ?? null,
        explain_error: result?.error ?? query.explain_error ?? null,
        explain_loading: result?.loading === true,
      };
    }),
  }));
}

/** Whether EXPLAIN should run for a run that has no result yet. */
export function needsExplain(query) {
  return (
    query?.explain_available === true &&
    query.explain_loading !== true &&
    query.explain == null &&
    query.explain_error == null
  );
}

export function formatQueryEvidence(value) {
  if (value === null || value === undefined || value === '') return 'No evidence was captured.';
  if (typeof value === 'string') return value;

  return JSON.stringify(value, null, 2);
}

export function formatQueryType(type) {
  const value = typeof type === 'string' && type !== '' ? type : 'query';

  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Filter options with execution counts, like QueryRecordPresenter::filters. */
export function queryFilters(records) {
  return {
    all: ['All', executionCount(records)],
    attention: ['Needs attention', executionCount(records.filter((record) => record.attention === true))],
    read: ['Reads', executionCount(records.filter((record) => record.query_type === 'read'))],
    write: ['Writes', executionCount(records.filter((record) => record.query_type === 'write'))],
  };
}

const explainCache = new Map();
const EXPLAIN_CACHE_PROFILES = 20;

/** EXPLAIN results already run for a profile, so they survive switching inspectors. */
export function cachedExplains(profileId) {
  return explainCache.get(profileId) ?? {};
}

/** Stores one run's EXPLAIN state ({ loading } or { explain, error }) and returns the profile's results. */
export function rememberExplain(profileId, execution, result) {
  const explains = { ...cachedExplains(profileId), [execution]: result };
  explainCache.delete(profileId);
  explainCache.set(profileId, explains);
  while (explainCache.size > EXPLAIN_CACHE_PROFILES) explainCache.delete(explainCache.keys().next().value);

  return explains;
}
