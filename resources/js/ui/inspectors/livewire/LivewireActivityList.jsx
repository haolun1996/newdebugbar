import { cx } from '../../../app/hooks.js';
import { EmptyState } from '../../components/EmptyState.jsx';

const failed = (item) => item.status === 'failed' || item.status === 'failed_validation';

function LivewireActivityItem({ state, item }) {
  const selected = state.livewireSelectedActivityId === item.id;

  return (
    <button
      type="button"
      data-ndb-livewire-activity-item=""
      data-ndb-livewire-activity-kind={item.kind}
      onClick={() => state.selectLivewireActivity(item.id)}
      aria-pressed={selected}
      className={cx(
        'ndb:block ndb:h-auto ndb:w-full ndb:min-w-0 ndb:rounded-lg ndb:px-3 ndb:py-2.5 ndb:text-left ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500',
        selected
          ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
          : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
    >
      <span className="ndb:block ndb:min-w-0">
        <span className="ndb:flex ndb:min-w-0 ndb:flex-wrap ndb:items-baseline ndb:gap-x-2 ndb:gap-y-1">
          <span
            data-ndb-livewire-activity-title=""
            className="ndb:min-w-0 ndb:break-words ndb:text-sm ndb:font-semibold ndb:leading-5 ndb:[overflow-wrap:anywhere]"
          >
            {item.title}
          </span>
          <span
            hidden={!failed(item)}
            className="ndb:shrink-0 ndb:text-xs ndb:font-bold ndb:text-red-600 ndb:dark:text-red-300"
          >
            {state.livewireActivityStatusLabel(item)}
          </span>
          <span
            hidden={item.status !== 'updating'}
            className="ndb:shrink-0 ndb:text-xs ndb:font-bold ndb:text-indigo-600 ndb:dark:text-indigo-300"
          >
            Running
          </span>
        </span>
        <span
          hidden={!state.livewireActivityShowsComponent(item)}
          data-ndb-livewire-activity-component=""
          className="ndb:mt-1 ndb:block ndb:min-w-0 ndb:break-words ndb:text-xs ndb:text-zinc-500 ndb:[overflow-wrap:anywhere] ndb:dark:text-zinc-400"
        >
          {state.livewireActivityComponentTitle(item)}
        </span>
      </span>

      <span className="ndb:mt-2 ndb:flex ndb:min-w-0 ndb:items-baseline ndb:justify-between ndb:gap-3 ndb:text-xs ndb:tabular-nums">
        <span
          data-ndb-livewire-activity-time=""
          className="ndb:max-w-full ndb:truncate ndb:font-medium ndb:text-zinc-400"
        >
          {state.livewireActivityTime(item)}
        </span>
        <span
          data-ndb-livewire-activity-duration=""
          className="ndb:whitespace-nowrap ndb:font-semibold ndb:text-zinc-600 ndb:dark:text-zinc-300"
        >
          {state.livewireActivityDuration(item)}
        </span>
      </span>
    </button>
  );
}

/** The newest-first activity timeline for the current page. */
export function LivewireActivityList({ state, items }) {
  return (
    <>
      <ol
        data-ndb-livewire-activity-list=""
        aria-label="Livewire activity timeline"
        className="ndb:m-0 ndb:list-none ndb:p-3"
      >
        {items.map((item, index) => (
          <li
            key={item.id}
            data-ndb-livewire-activity-timeline-item=""
            className="ndb:flex ndb:min-w-0 ndb:gap-3"
          >
            <span aria-hidden="true" className="ndb:relative ndb:w-4 ndb:shrink-0">
              <span
                data-ndb-livewire-activity-connector=""
                hidden={!(index < items.length - 1)}
                className="ndb:absolute ndb:top-5 ndb:-bottom-5 ndb:left-1/2 ndb:w-px ndb:-translate-x-1/2 ndb:bg-zinc-200 ndb:dark:bg-zinc-800"
              />
              <span
                data-ndb-livewire-activity-dot=""
                className={cx(
                  'ndb:absolute ndb:top-5 ndb:left-1/2 ndb:z-10 ndb:size-2.5 ndb:-translate-x-1/2 ndb:-translate-y-1/2 ndb:rounded-full ndb:ring-4 ndb:ring-white ndb:dark:ring-zinc-950',
                  failed(item)
                    ? 'ndb:bg-red-500'
                    : item.status === 'updating' || state.livewireSelectedActivityId === item.id
                      ? 'ndb:bg-indigo-500'
                      : 'ndb:bg-zinc-300 ndb:dark:bg-zinc-700',
                )}
              />
            </span>

            <div className="ndb:min-w-0 ndb:flex-1 ndb:pb-2">
              <LivewireActivityItem state={state} item={item} />
            </div>
          </li>
        ))}
      </ol>

      <div hidden={items.length !== 0} className="ndb:p-3">
        <EmptyState label="No Livewire activity matches this view." />
      </div>
    </>
  );
}
