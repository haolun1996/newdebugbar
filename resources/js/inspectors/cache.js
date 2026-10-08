/** Pure view logic for the cache inspector. */

export const CACHE_FILTERS = ['all', 'reads', 'writes', 'deletes', 'failed'];

const CATEGORIES = { reads: 'read', writes: 'write', deletes: 'delete' };

const integer = (value) => Math.trunc(Number(value ?? 0)) || 0;
const plural = (count, singular, plural) => (count === 1 ? singular : plural);
const number = (value) => Number(value).toLocaleString('en-US');

export function matchesCacheOperation(operation, { filter = 'all', search = '' } = {}) {
  const term = String(search).toLowerCase().trim();
  const matchesFilter =
    filter === 'all' ||
    (filter === 'failed' && Boolean(operation.failed)) ||
    (CATEGORIES[filter] !== undefined && operation.category === CATEGORIES[filter]);

  return matchesFilter && (term === '' || String(operation.search ?? '').includes(term));
}

/** Every operation with its visibility, the visible count, and the selection kept or moved to the first visible. */
export function cacheView(operations, { filter = 'all', search = '', selected = null } = {}) {
  const rows = operations.map((item) => ({ item, visible: matchesCacheOperation(item, { filter, search }) }));
  const visible = rows.filter((row) => row.visible).map((row) => row.item.execution);

  return {
    rows,
    visibleCount: visible.length,
    selected: visible.includes(selected) ? selected : (visible[0] ?? null),
  };
}

/** Summary figures, filter options, and the attention sentence (cache-controls.blade.php). */
export function cacheSummary(summary = {}, itemCount = 0) {
  const count = integer(summary.retained_count ?? itemCount);
  const reads = integer(summary.reads);
  const hits = integer(summary.hits);
  const misses = integer(summary.misses);
  const writes = integer(summary.writes);
  const flushes = integer(summary.flushes);
  const deletes = integer(summary.forgets) + flushes;
  const failures = integer(summary.failures);
  const repeatedMisses = integer(summary.repeated_miss_count);
  const filterCounts = summary.filter_counts ?? {};
  const filters = [
    ['all', 'All', count],
    ['reads', 'Reads', reads],
    ['writes', 'Writes', integer(filterCounts.writes ?? writes)],
    ['deletes', 'Deletes', integer(filterCounts.deletes ?? deletes)],
    ['failed', 'Failed', integer(filterCounts.failed ?? failures)],
  ].filter(([key, , total]) => key === 'all' || total > 0);
  const attention = [];

  if (failures > 0)
    attention.push(`${number(failures)} failed ${plural(failures, 'operation', 'operations')}`);
  if (repeatedMisses > 0)
    attention.push(`${number(repeatedMisses)} repeatedly missed ${plural(repeatedMisses, 'key', 'keys')}`);
  if (flushes > 0) attention.push(`${number(flushes)} store ${plural(flushes, 'flush', 'flushes')}`);

  const sentence = attention.join(', ');

  return {
    count,
    countLabel: `${number(count)} ${plural(count, 'operation', 'operations')}`,
    reads,
    hitRateLabel: `${Number(summary.hit_rate ?? 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% hit rate`,
    hitsLabel: `${number(hits)} ${plural(hits, 'hit', 'hits')}, ${number(misses)} ${plural(misses, 'miss', 'misses')}`,
    highMissRate: Boolean(summary.high_miss_rate),
    durationMs: Number(summary.duration_ms ?? 0),
    failures,
    filters,
    attention: sentence === '' ? null : `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`,
  };
}

/** Whether a cache result reads as a warning (a miss or a flush). */
export function cacheResultWarns(operation) {
  return !operation.failed && ['miss', 'flushed'].includes(operation.result);
}

/** Which supporting details the overview shows for an operation (cache-overview-panel.blade.php). */
export function cacheOperationDetails(operation) {
  const write = ['write', 'write_failed'].includes(operation.operation);
  const batch = operation.duration_scope === 'batch';
  const failure = Boolean(operation.failed && operation.exception_message);
  const callsite = Boolean(operation.callsite?.file);

  return {
    write,
    batch,
    failure,
    any: write || batch || failure,
    callsite,
    source: callsite || (operation.stack ?? []).length > 0,
  };
}
