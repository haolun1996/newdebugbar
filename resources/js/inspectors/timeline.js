import { formatDuration } from '../duration.js';

/** Timeline rows load in pages of this size, matching the server's default page. */
export const TIMELINE_PAGE_SIZE = 50;

export const DEFAULT_TIMELINE_QUERY = Object.freeze({ filter: 'key', search: '', limit: TIMELINE_PAGE_SIZE });

const number = (value) => Number(value).toLocaleString('en-US');

/** Laravel's `str($value)->replace('_', ' ')->title()`. */
export function titleCase(value) {
  return String(value ?? '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/(^|[^\p{L}\p{N}'])(\p{L})/gu, (_match, before, letter) => before + letter.toUpperCase());
}

/** The query a loaded payload answers; the server echoes the filter, search, and limit it applied. */
export function timelineQuery(payload) {
  return {
    filter: typeof payload?.filter === 'string' ? payload.filter : DEFAULT_TIMELINE_QUERY.filter,
    search: typeof payload?.search === 'string' ? payload.search : DEFAULT_TIMELINE_QUERY.search,
    limit: Number(payload?.limit) > 0 ? Number(payload.limit) : DEFAULT_TIMELINE_QUERY.limit,
  };
}

export function sameTimelineQuery(left, right) {
  return left.filter === right.filter && left.search === right.search && left.limit === right.limit;
}

/** Filter and search changes start again from the first page. */
export function filteredTimelineQuery(filter, search) {
  return { filter, search, limit: TIMELINE_PAGE_SIZE };
}

/** Each page adds one more page to the current limit. */
export function nextTimelinePageQuery(query) {
  return { ...query, limit: query.limit + TIMELINE_PAGE_SIZE };
}

/** Source filter options, after the fixed Request option. */
export function timelineSourceOptions(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const inspectors = Array.isArray(payload?.available_inspectors)
    ? payload.available_inspectors
    : [...new Set(items.map((item) => item.inspector))];

  return inspectors
    .filter((inspector) => inspector !== 'request')
    .map((inspector) => ({ value: inspector, label: titleCase(inspector) }));
}

/** Counts, duration, and pagination copy for the timeline list. */
export function timelineSummary(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const duration = Number(
    payload?.total_duration_ms ?? Math.max(0.001, ...items.map((item) => Number(item.at_ms) || 0)),
  );
  const total = Number(payload?.total_item_count ?? items.length);
  const matches = Number(payload?.matching_item_count ?? items.length);
  const loaded = items.length;

  return {
    duration,
    durationLabel: formatDuration(duration),
    total,
    matches,
    loaded,
    hasMore: Boolean(payload?.has_more),
    matchingLabel: `${number(matches)} matching`,
    loadedLabel: `${number(loaded)} loaded from ${number(total)} captured across ${formatDuration(duration)}`,
    pageLabel: `Showing ${number(loaded)} of ${number(matches)} timeline events. More activity loads as you scroll.`,
    loadingLabel: `Loading up to ${number(Math.min(TIMELINE_PAGE_SIZE, matches - loaded))} more timeline events…`,
    completeLabel: matches > TIMELINE_PAGE_SIZE ? `All ${number(matches)} timeline events are loaded.` : null,
    ticks: [0, 25, 50, 75, 100].map((tick) => ({ tick, label: formatDuration((duration * tick) / 100) })),
  };
}

const KIND_LABELS = { span: 'Duration', milestone: 'Request milestone' };

/** Display labels for one timeline row and its detail. */
export function timelineItemView(item) {
  const source = item?.source && typeof item.source === 'object' ? item.source : null;
  const has = (value) => value !== null && value !== undefined;

  return {
    id: String(item.id),
    inspector: item.inspector,
    inspectorLabel: item.inspector_label ?? titleCase(item.inspector),
    kind: item.kind,
    kindLabel: KIND_LABELS[item.kind] ?? 'Event',
    label: item.label,
    atMs: item.at_ms,
    atLabel: formatDuration(Number(item.at_ms)),
    startMs: has(item.start_ms) ? item.start_ms : null,
    startLabel: has(item.start_ms) ? formatDuration(Number(item.start_ms)) : null,
    durationMs: has(item.duration_ms) ? item.duration_ms : null,
    durationLabel: has(item.duration_ms) ? formatDuration(Number(item.duration_ms)) : null,
    source: source === null ? null : `${source.file}:${source.line ?? 1}`,
    atPercent: item.at_percent,
    startPercent: item.start_percent ?? item.at_percent,
    durationPercent: item.duration_percent ?? 0,
  };
}

/**
 * Orders asynchronous timeline loads: only the newest request may apply its result.
 * `begin()` returns a token; `current(token)` says whether that request is still the newest.
 */
export function createRequestGate() {
  let version = 0;

  return {
    begin: () => ++version,
    current: (token) => token === version,
    invalidate() {
      version += 1;
    },
  };
}
