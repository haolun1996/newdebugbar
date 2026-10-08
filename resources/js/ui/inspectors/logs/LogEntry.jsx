import { cx } from '../../../app/hooks.js';
import { logFirstSequence, logRecordCount, requestTimeLabel } from '../../../inspectors/logs.js';

/** Severity text colors shared by log rows and details. */
export function severityClasses(level) {
  switch (level) {
    case 'info':
      return 'ndb:text-blue-700 ndb:dark:text-blue-300';
    case 'notice':
      return 'ndb:text-violet-700 ndb:dark:text-violet-300';
    case 'warning':
      return 'ndb:text-amber-700 ndb:dark:text-amber-300';
    case 'error':
    case 'critical':
    case 'alert':
    case 'emergency':
      return 'ndb:text-red-700 ndb:dark:text-red-300';
    default:
      return 'ndb:text-zinc-500 ndb:dark:text-zinc-400';
  }
}

export const levelLabel = (entry) => {
  const level = String(entry.level ?? 'log');

  return entry.level_label ?? level.charAt(0).toUpperCase() + level.slice(1);
};

/** One chronological log entry row (log-entry.blade.php). */
export function LogEntry({ entry, selected, onSelect }) {
  const level = String(entry.level ?? 'log');
  const repeatCount = logRecordCount(entry);
  const firstSequence = logFirstSequence(entry);
  const channelLabel = String(entry.channel_label ?? 'No channel');
  const message = entry.message ?? '';

  return (
    <button
      type="button"
      data-ndb-log-entry=""
      data-ndb-log-summary=""
      data-ndb-log-level={level}
      data-ndb-log-attention={entry.attention ? 'true' : 'false'}
      data-ndb-log-channel={entry.channel_filter ?? '__unknown__'}
      data-ndb-log-search-text={entry.search ?? ''}
      data-ndb-log-record-count={repeatCount}
      data-ndb-log-first-sequence={firstSequence}
      onClick={() => onSelect(firstSequence)}
      aria-controls="newdebugbar-log-detail"
      aria-pressed={selected}
      className={cx(
        'ndb:grid ndb:h-auto ndb:w-full ndb:grid-cols-[4.75rem_minmax(0,1fr)] ndb:items-baseline ndb:gap-x-2.5 ndb:border-0 ndb:px-3 ndb:py-2.5 ndb:text-left ndb:text-xs ndb:text-zinc-900 ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:sm:py-3 ndb:dark:text-zinc-100',
        selected
          ? 'ndb:bg-indigo-50/90 ndb:dark:bg-indigo-950/35'
          : 'ndb:bg-transparent ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
    >
      <span
        data-ndb-log-severity=""
        className={cx(
          'ndb:min-w-0 ndb:bg-transparent ndb:text-xs ndb:font-bold ndb:uppercase ndb:leading-5 ndb:tracking-wide',
          severityClasses(level),
        )}
      >
        {levelLabel(entry)}
      </span>

      <span className="ndb:min-w-0">
        <span
          data-ndb-log-message=""
          className="ndb:block ndb:max-h-10 ndb:overflow-hidden ndb:whitespace-pre-wrap ndb:break-words ndb:text-xs ndb:font-semibold ndb:leading-5 ndb:[overflow-wrap:anywhere]"
        >
          {message === '' ? '—' : message}
        </span>
        <span
          data-ndb-log-metadata=""
          className="ndb:mt-0.5 ndb:flex ndb:min-w-0 ndb:flex-wrap ndb:items-baseline ndb:gap-x-3 ndb:gap-y-0.5 ndb:text-xs ndb:leading-4 ndb:text-zinc-500 ndb:dark:text-zinc-400"
        >
          <span data-ndb-log-channel-label="" className="ndb:min-w-0 ndb:truncate" title={channelLabel}>
            {channelLabel}
          </span>
          <span data-ndb-log-request-time="" className="ndb:shrink-0 ndb:tabular-nums">
            {requestTimeLabel(entry.first_at_ms ?? entry.at_ms ?? null)}
          </span>
          {repeatCount > 1 ? (
            <span data-ndb-log-repeat-label="" className="ndb:shrink-0 ndb:font-medium ndb:tabular-nums">
              {repeatCount} records
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
