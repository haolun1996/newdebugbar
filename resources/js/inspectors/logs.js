import { formatDuration } from '../duration.js';

const LEVEL_ORDER = ['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency', 'log'];

/** Severity filter values with captured records, in Laravel's severity order. */
export function logLevels(levelCounts = {}) {
  const counts = levelCounts && typeof levelCounts === 'object' ? levelCounts : {};

  return [...new Set([...LEVEL_ORDER, ...Object.keys(counts)])].filter((level) => (counts[level] ?? 0) > 0);
}

/** Case-insensitive natural comparison, like PHP's strnatcasecmp. */
export function naturalCompare(left, right) {
  const chunks = (value) =>
    String(value)
      .toLowerCase()
      .match(/\d+|\D+/g) ?? [];
  const a = chunks(left);
  const b = chunks(right);

  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    const numeric = /^\d/.test(a[index]) && /^\d/.test(b[index]);
    const difference = numeric
      ? Number(a[index]) - Number(b[index])
      : a[index] < b[index]
        ? -1
        : a[index] > b[index]
          ? 1
          : 0;

    if (difference !== 0) return Math.sign(difference);
  }

  return Math.sign(a.length - b.length);
}

/** Channel filter options ordered by their displayed label. */
export function logChannels(groups = [], channelCounts = {}) {
  const labels = {};
  groups.forEach((entry) => (labels[entry.channel_filter] = entry.channel_label));
  const counts = channelCounts && typeof channelCounts === 'object' ? channelCounts : {};

  return Object.keys(counts)
    .sort((left, right) => naturalCompare(labels[left] ?? left, labels[right] ?? right))
    .map((channel) => ({
      value: channel,
      label: String(labels[channel] ?? channel),
      count: counts[channel],
    }));
}

export const logRecordCount = (entry) => Math.max(1, Number(entry.repeat_count ?? 1) || 1);

export const logFirstSequence = (entry) => Number(entry.first_sequence ?? entry.sequence ?? 1) || 1;

/** Applies the severity, channel, and search filters and counts the records behind the visible entries. */
export function filterLogs(groups = [], { level = 'all', channel = 'all', search = '' } = {}) {
  const needle = String(search).toLowerCase().trim();
  const visible = groups.filter(
    (entry) =>
      (level === 'all' || entry.level === level || (level === 'attention' && Boolean(entry.attention))) &&
      (channel === 'all' || (entry.channel_filter ?? '__unknown__') === channel) &&
      (needle === '' || String(entry.search ?? '').includes(needle)),
  );

  return { visible, records: visible.reduce((count, entry) => count + logRecordCount(entry), 0) };
}

export const requestTimeLabel = (value) =>
  value === null || value === undefined ? '—' : `+${formatDuration(value)}`;

/** A scalar context value as PHP casts it to a string. */
export function contextValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  return String(value);
}

/** Splits context into short scalar rows and fields that need the full evidence width. */
export function splitContext(fields = []) {
  const compact = (field) => !field.structured && contextValue(field.value) === field.preview;

  return { compact: fields.filter(compact), expanded: fields.filter((field) => !compact(field)) };
}

/** Formats the captured wall time in its recorded offset: `2026-08-24 16:32:10.123 +02:00`. */
export function logWallTime(value) {
  if (typeof value !== 'string' || value === '') return null;

  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d+))?\s*(Z|[+-]\d{2}:?\d{2})?$/i,
  );

  if (match) {
    const [, date, time, fraction = '', zone = 'Z'] = match;
    const offset =
      zone.toUpperCase() === 'Z'
        ? '+00:00'
        : zone.includes(':')
          ? zone
          : `${zone.slice(0, 3)}:${zone.slice(3)}`;

    return {
      label: `${date} ${time}.${fraction.padEnd(3, '0').slice(0, 3)} ${offset}`,
      title: `${date}T${time}${offset}`,
    };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const iso = parsed.toISOString();

  return { label: `${iso.slice(0, 10)} ${iso.slice(11, 23)} +00:00`, title: `${iso.slice(0, 19)}+00:00` };
}

/** PHP's JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE output. */
export const prettyJson = (value) => JSON.stringify(value, null, 4) ?? 'null';
