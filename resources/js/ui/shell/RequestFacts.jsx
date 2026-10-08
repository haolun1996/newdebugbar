import { cx, useShell } from '../../app/hooks.js';
import { Icon } from '../components/Icon.jsx';
import { ToolbarButton } from './ToolbarButton.jsx';

const LABEL =
  'ndb:hidden ndb:text-xs ndb:font-semibold ndb:uppercase ndb:tracking-wider ndb:text-zinc-400 ndb:lg:block';
const METRIC_ICON = 'ndb:size-3.5 ndb:shrink-0 ndb:text-indigo-500 ndb:dark:text-indigo-400';
const VALUE = 'ndb:block ndb:whitespace-nowrap ndb:text-xs ndb:font-bold ndb:tabular-nums';

/**
 * Environment, query, duration, and peak memory facts for the compact toolbar (`scope="toolbar"`)
 * or the expanded inspector header (`scope="header"`).
 */
export function RequestFacts({ scope }) {
  const shell = useShell();
  const summary = shell.summary;
  const header = scope === 'header';
  const fact = (name) => (header ? { 'data-ndb-header-fact': name } : { 'data-ndb-toolbar': name });
  const hook = (name) => (header ? { [`data-ndb-header-${name}`]: '' } : {});

  return (
    <>
      <ToolbarButton
        {...fact('environment')}
        className={
          header
            ? 'ndb:order-1 ndb:flex ndb:min-w-max ndb:shrink-0 ndb:sm:px-2 ndb:lg:px-2.5'
            : 'ndb:order-1 ndb:hidden ndb:min-w-max ndb:shrink-0 ndb:sm:px-2 ndb:md:flex ndb:lg:px-2.5'
        }
      >
        <span
          className={cx(
            'ndb:size-2 ndb:shrink-0 ndb:rounded-full',
            summary.warning ? 'ndb:bg-amber-500' : 'ndb:bg-emerald-500',
          )}
        />
        <span className={header ? 'ndb:min-w-0' : undefined}>
          <span className={LABEL}>Environment</span>
          <span
            {...hook('environment')}
            className={
              header
                ? 'ndb:block ndb:max-w-24 ndb:truncate ndb:text-xs ndb:font-bold'
                : 'ndb:block ndb:max-w-24 ndb:truncate ndb:text-xs ndb:font-bold ndb:sm:text-xs'
            }
          >
            {summary.environment}
          </span>
        </span>
      </ToolbarButton>

      <ToolbarButton
        inspector="request"
        {...fact('duration')}
        className="ndb:order-3 ndb:flex ndb:min-w-max ndb:shrink-0 ndb:sm:px-2 ndb:lg:px-2.5"
      >
        <Icon name="clock" className={METRIC_ICON} />
        <span>
          <span className={LABEL}>Duration</span>
          <span {...hook('duration')} className={VALUE}>
            {summary.duration_label}
          </span>
        </span>
      </ToolbarButton>

      <ToolbarButton
        {...fact('memory')}
        className="ndb:order-4 ndb:flex ndb:min-w-max ndb:shrink-0 ndb:sm:px-2 ndb:lg:px-2.5"
      >
        <Icon name="memory" className={METRIC_ICON} />
        <span>
          <span className={LABEL}>Peak</span>
          <span {...hook('memory')} className={VALUE}>
            {`${summary.peak_memory_mb} MB`}
          </span>
        </span>
      </ToolbarButton>

      <ToolbarButton
        inspector="queries"
        {...fact('queries')}
        className="ndb:order-2 ndb:flex ndb:min-w-max ndb:shrink-0 ndb:sm:px-2 ndb:lg:px-2.5"
      >
        <Icon name="database" className={METRIC_ICON} />
        <span>
          <span className={LABEL}>Queries</span>
          <span className="ndb:flex ndb:items-center ndb:gap-1.5 ndb:whitespace-nowrap ndb:text-xs ndb:font-bold ndb:tabular-nums">
            <span {...hook('query-count')}>{summary.query_count}</span>
            <span
              {...hook('query-duration')}
              className="ndb:hidden ndb:font-medium ndb:text-zinc-400 ndb:lg:inline"
            >
              {summary.query_time_label}
            </span>
          </span>
        </span>
      </ToolbarButton>
    </>
  );
}
