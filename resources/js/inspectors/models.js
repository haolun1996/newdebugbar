/** Pure helpers for the models inspector: list sorting and filtering, and source labels. */

const SORTS = ['model', 'retrieved', 'writes', 'reloads'];

export const shortModelName = (model) =>
  String(model ?? '')
    .split('\\')
    .pop();

const text = (value) => (typeof value === 'string' && value !== '' ? value : '—');

/** The list-row facts the Blade model-group component derived from one model group. */
export function modelRow(group, index) {
  const shortName = shortModelName(group.model);
  const connection = text(group.connection);
  const table = text(group.table);

  return {
    index,
    group,
    shortName,
    connection,
    table,
    retrieved: Number(group.load_count ?? 0) || 0,
    writes: Number(group.change_count ?? 0) || 0,
    reloads: Number(group.repeated_load_count ?? 0) || 0,
    sortName: shortName.toLowerCase(),
    search: `${group.model} ${connection} ${table}`.toLowerCase(),
  };
}

/** The next sort after activating a heading: first direction, reversed, then back to capture order. */
export function nextModelSort({ sort, direction }, heading) {
  if (!SORTS.includes(heading)) return { sort, direction };

  const first = heading === 'model' ? 'asc' : 'desc';

  if (sort !== heading) return { sort: heading, direction: first };
  if (direction === first) return { sort, direction: first === 'asc' ? 'desc' : 'asc' };

  return { sort: 'capture', direction: 'asc' };
}

export function compareModelRows(left, right, { sort, direction }) {
  const capture = left.index - right.index;

  if (sort === 'capture' || !SORTS.includes(sort)) return capture;

  const comparison =
    sort === 'model'
      ? left.sortName.localeCompare(right.sortName, undefined, { numeric: true, sensitivity: 'base' })
      : left[sort] - right[sort];

  return (direction === 'asc' ? comparison : -comparison) || capture;
}

/** Sorted rows that match the search. */
export function visibleModelRows(rows, { search = '', sort = 'capture', direction = 'asc' } = {}) {
  const needle = String(search).toLowerCase().trim();

  return rows
    .filter((row) => needle === '' || row.search.includes(needle))
    .sort((left, right) => compareModelRows(left, right, { sort, direction }));
}

export const plural = (word, count) => (count === 1 ? word : `${word}s`);

export const formatNumber = (value) => Number(value).toLocaleString('en-US');

/** Laravel model event names as headlines, e.g. `forceDeleted` → `Force deleted`. */
export function formatModelEvent(event) {
  if (event === 'forceDeleted') return 'Force deleted';

  return String(event)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const isCallsite = (callsite) =>
  callsite !== null &&
  typeof callsite === 'object' &&
  typeof callsite.file === 'string' &&
  callsite.file !== '';

const callsiteLine = (callsite) => {
  const line = Number(callsite.line);

  return callsite.line !== null && callsite.line !== '' && Number.isFinite(line) && Math.trunc(line) > 0
    ? Math.trunc(line)
    : null;
};

const isCompiledView = (callsite) =>
  callsite?.kind === 'compiled_view' && typeof callsite.template_file === 'string';

const basename = (path) => String(path).replaceAll('\\', '/').split('/').pop();

export function sourceLocation(callsite) {
  if (!isCallsite(callsite)) return null;

  const line = callsiteLine(callsite);

  return callsite.file + (line === null ? '' : `:${line}`);
}

export function sourceTitle(callsite) {
  const exact = sourceLocation(callsite);

  if (exact === null) return 'Source unavailable';
  if (isCompiledView(callsite)) return `Blade ${callsite.template_file}, compiled ${exact}`;

  return exact;
}

export function sourceShortLabel(callsite) {
  if (!isCallsite(callsite)) return '—';
  if (isCompiledView(callsite)) return basename(callsite.template_file);

  const line = callsiteLine(callsite);

  return basename(callsite.file) + (line === null ? '' : `:${line}`);
}

export function sourceCopy(callsite) {
  if (callsite === null || typeof callsite !== 'object') return null;
  if (isCompiledView(callsite)) return callsite.template_file;

  return sourceLocation(callsite);
}

export function formatActivity(retrievals, changes) {
  const parts = [];

  if (retrievals > 0) parts.push(`${formatNumber(retrievals)} ${plural('retrieval', retrievals)}`);
  if (changes > 0) parts.push(`${formatNumber(changes)} ${plural('write', changes)}`);

  return parts.length === 0 ? 'No retained activity' : parts.join(', ');
}

export const isNumericKey = (key) =>
  (typeof key === 'number' && Number.isFinite(key)) ||
  (typeof key === 'string' && key.trim() !== '' && /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(key));
