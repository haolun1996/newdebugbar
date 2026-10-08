import { cx, useShell } from '../../app/hooks.js';

const METRICS = [
  { key: 'queries', inspector: 'queries', shortLabel: 'QRY', ariaLabel: 'Open query details' },
  { key: 'duration', inspector: 'request', shortLabel: 'Time', ariaLabel: 'Open request timing' },
  { key: 'memory', inspector: null, shortLabel: 'MB' },
];

const metricValue = (summary, key) =>
  key === 'queries'
    ? summary.query_count
    : key === 'duration'
      ? summary.duration_label
      : summary.peak_memory_mb;

/** The compact query, time, and memory readout used below the sm breakpoint. */
export function MobileRequestMetrics({ scope, className, ...rest }) {
  const shell = useShell();

  return (
    <div
      data-ndb-mobile-request-metrics={scope}
      role="group"
      aria-label="Request metrics"
      {...rest}
      className={cx(
        'ndb:grid ndb:w-[8.25rem] ndb:flex-none ndb:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] ndb:items-stretch ndb:min-[360px]:w-36',
        className,
      )}
    >
      {METRICS.map((metric) => {
        const content = (
          <>
            <span
              data-ndb-mobile-toolbar-summary={metric.key}
              className={cx(
                'ndb:block ndb:max-w-full ndb:truncate ndb:text-xs ndb:font-bold ndb:leading-4 ndb:tabular-nums',
                metric.key === 'duration' ? 'ndb:tracking-[-0.04em] ndb:max-[359px]:tracking-[-0.1em]' : '',
              )}
            >
              {metricValue(shell.summary, metric.key)}
            </span>
            <span
              data-ndb-mobile-toolbar-metric-label={metric.key}
              className="ndb:block ndb:max-w-full ndb:truncate ndb:text-xs ndb:font-semibold ndb:leading-[14px] ndb:uppercase ndb:tracking-normal ndb:text-zinc-400"
            >
              {metric.shortLabel}
            </span>
          </>
        );

        if (!metric.inspector) {
          return (
            <div
              key={metric.key}
              data-ndb-mobile-toolbar-metric={metric.key}
              data-ndb-mobile-toolbar-metric-scope={scope}
              className="ndb:relative ndb:flex ndb:min-h-11 ndb:min-w-0 ndb:flex-col ndb:items-center ndb:justify-center"
            >
              {content}
            </div>
          );
        }

        return (
          <button
            key={metric.key}
            type="button"
            data-ndb-mobile-toolbar-metric={metric.key}
            data-ndb-mobile-toolbar-metric-scope={scope}
            onClick={() =>
              shell.inspectorOpen
                ? shell.selectInspector(metric.inspector)
                : shell.openInspector(metric.inspector)
            }
            aria-label={metric.ariaLabel}
            className="ndb:relative ndb:flex ndb:min-h-11 ndb:min-w-0 ndb:flex-col ndb:items-center ndb:justify-center ndb:rounded-lg ndb:transition-colors ndb:hover:bg-zinc-100/80 ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:hover:bg-white/10"
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
