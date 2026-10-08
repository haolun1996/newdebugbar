import { cx } from '../../app/hooks.js';
import { frameCount } from './frames.js';
import { InspectorSourceLink } from './InspectorSourceLink.jsx';

/**
 * Numbered application stack (inspector-stack.blade.php). Props: frames (array of { file, line, function }),
 * emptyLabel, showHeading (default true), title (default 'Application stack'), className.
 */
export function InspectorStack({
  frames = [],
  emptyLabel = 'No application stack was captured.',
  showHeading = true,
  title = 'Application stack',
  className,
  ...rest
}) {
  return (
    <section
      data-ndb-inspector-stack=""
      {...rest}
      className={cx(
        'ndb:mt-4 ndb:border-0 ndb:bg-transparent ndb:p-0 ndb:text-inherit ndb:sm:mt-5',
        className,
      )}
    >
      {showHeading ? (
        <div className="ndb:flex ndb:items-center ndb:justify-between ndb:gap-3 ndb:border-b ndb:border-zinc-200/90 ndb:pb-2 ndb:dark:border-zinc-800">
          <h4 className="ndb:text-xs ndb:font-bold ndb:text-zinc-800 ndb:dark:text-zinc-100">{title}</h4>
          <span hidden={frames.length === 0} className="ndb:text-xs ndb:font-medium ndb:text-zinc-400">
            {frameCount(frames)}
          </span>
        </div>
      ) : null}
      {frames.length === 0 ? (
        <p className="ndb:pt-3 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">{emptyLabel}</p>
      ) : null}
      <ol className="ndb:m-0 ndb:list-none ndb:divide-y ndb:divide-zinc-200/90 ndb:p-0 ndb:dark:divide-zinc-800">
        {frames.map((frame, index) => {
          const location = `${frame.file}:${frame.line}`;

          return (
            <li
              key={`${location}:${index}`}
              className="ndb:flex ndb:min-w-0 ndb:items-start ndb:gap-3 ndb:py-2.5 ndb:sm:py-3"
            >
              <span className="ndb:flex ndb:size-6 ndb:shrink-0 ndb:items-center ndb:justify-center ndb:rounded-md ndb:bg-zinc-100 ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-500 ndb:dark:bg-zinc-800 ndb:dark:text-zinc-400">
                {index + 1}
              </span>
              <span className="ndb:min-w-0 ndb:flex-1">
                <code className="ndb:block ndb:truncate ndb:font-mono ndb:text-xs ndb:font-semibold ndb:leading-5 ndb:text-zinc-700 ndb:dark:text-zinc-200">
                  {frame.function || 'Application call'}
                </code>
                <InspectorSourceLink
                  className="ndb:mt-0.5"
                  copy={location}
                  aria-label={`Copy source ${location}`}
                >
                  {location}
                </InspectorSourceLink>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
