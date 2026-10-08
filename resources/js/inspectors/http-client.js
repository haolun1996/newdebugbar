/** Pure view logic for the outbound HTTP client inspector. */

export const HTTP_CLIENT_FILTERS = ['all', 'failed', 'slow'];
export const HTTP_CLIENT_DETAIL_TABS = ['response', 'request'];

const hasEvidence = (value) => {
  if (value === null || value === undefined || value === '') return false;

  return typeof value !== 'object' || Object.keys(value).length > 0;
};

const numeric = (value) =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));

const record = (value) => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {});

/** Adds the derived source and evidence flags the detail view reads. */
export function normalizeHttpClientRequests(items) {
  return Object.values(items !== null && typeof items === 'object' ? items : {}).map((item) => {
    const callsite = record(item.callsite);
    const file = String(callsite.file ?? '').trim();
    const line = numeric(callsite.line) ? Math.trunc(Number(callsite.line)) : null;
    const request = record(item.request);
    const response = record(item.response);
    const stack = Object.values(item.stack !== null && typeof item.stack === 'object' ? item.stack : {});
    const callsiteLabel = file === '' ? null : `${file}${line === null ? '' : `:${line}`}`;

    return {
      ...item,
      stack,
      callsite_label: callsiteLabel,
      has_source: callsiteLabel !== null || stack.length > 0,
      request_has_headers: hasEvidence(request.headers),
      request_has_body: hasEvidence(request.body),
      response_has_headers: hasEvidence(response.headers),
      response_has_body: hasEvidence(response.body),
    };
  });
}

/** Option labels for the filter select, in display order. */
export function httpClientFilterOptions(items) {
  return [
    ['all', 'All', items.length],
    ['failed', 'Failed', items.filter((item) => Boolean(item.failed)).length],
    ['slow', 'Slow', items.filter((item) => Boolean(item.slow)).length],
  ];
}

export function matchesHttpClientRequest(item, { filter = 'all', search = '' } = {}) {
  const term = String(search).toLowerCase().trim();
  const matchesFilter =
    filter === 'all' ||
    (filter === 'failed' && Boolean(item.failed)) ||
    (filter === 'slow' && Boolean(item.slow));

  return matchesFilter && (term === '' || String(item.search ?? '').includes(term));
}

const durationOf = (item) => (numeric(item.duration_ms) ? Number(item.duration_ms) : -1);

/** Orders requests by execution, or by duration with missing timings last. */
export function compareHttpClientRequests(left, right, sort = 'execution', direction = 'asc') {
  const executionComparison = Number(left.execution ?? 0) - Number(right.execution ?? 0);

  if (sort !== 'duration') return executionComparison;

  const leftDuration = durationOf(left);
  const rightDuration = durationOf(right);

  if (leftDuration < 0 && rightDuration >= 0) return 1;
  if (rightDuration < 0 && leftDuration >= 0) return -1;

  const comparison = leftDuration - rightDuration;
  const directed = direction === 'asc' ? comparison : -comparison;

  return directed || executionComparison;
}

export function sortHttpClientRequests(items, sort, direction) {
  return [...items].sort((left, right) => compareHttpClientRequests(left, right, sort, direction));
}

/** Cycles the Time heading: off → slowest first → fastest first → off. */
export function nextHttpClientSort({ sort, direction }, column) {
  if (column !== 'duration') return { sort, direction };
  if (sort !== column) return { sort: column, direction: 'desc' };
  if (direction === 'desc') return { sort: column, direction: 'asc' };

  return { sort: 'execution', direction: 'asc' };
}

export function formatHttpClientEvidence(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;

  return JSON.stringify(value, null, 2);
}

/** Number of captured header names, excluding the capture-limit marker. */
export function httpClientHeaderCount(headers) {
  return Object.keys(record(headers)).filter((name) => name !== '__truncated__').length;
}

/** Whether a captured body hit the depth or size capture limits. */
export function httpClientBodyTruncated(body) {
  return /\[maximum depth reached\]|"__truncated__"\s*:/.test(JSON.stringify(body ?? null));
}

/** Content-Type values from the response headers. */
export function httpClientContentTypes(headers) {
  return Object.entries(record(headers))
    .filter(([name]) => name.toLowerCase() === 'content-type')
    .map(([name, values]) => [name, Array.isArray(values) ? values.join(', ') : values]);
}

/**
 * The list as rendered: every request in sort order with its visibility, the visible count, and the
 * selection (kept while visible, otherwise moved to the first visible request).
 */
export function httpClientView(
  requests,
  { filter = 'all', search = '', sort = 'execution', direction = 'asc', selected = null } = {},
) {
  const rows = sortHttpClientRequests(requests, sort, direction).map((item) => ({
    item,
    visible: matchesHttpClientRequest(item, { filter, search }),
  }));
  const visible = rows.filter((row) => row.visible).map((row) => row.item.execution);

  return {
    rows,
    visibleCount: visible.length,
    selected: visible.includes(selected) ? selected : (visible[0] ?? null),
  };
}
