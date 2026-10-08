import { cx } from '../../../app/hooks.js';
import { formatDuration } from '../../../duration.js';
import { cacheResultWarns } from '../../../inspectors/cache.js';
import { Icon } from '../../components/Icon.jsx';
import { InspectorListControls } from '../../components/InspectorListControls.jsx';
import { InspectorOperationBadge } from '../../components/InspectorOperationBadge.jsx';
import { SearchField } from '../../components/SearchField.jsx';
import { SelectField } from '../../components/SelectField.jsx';

/** Totals, hit rate, attention note, search, and filter (cache-controls.blade.php). */
export function CacheControls({ figures, itemCount, visibleCount, search, onSearch, filter, onFilter }) {
  return (
    <>
      <div
        data-ndb-cache-summary=""
        className="ndb:flex ndb:items-start ndb:justify-between ndb:gap-3 ndb:sm:gap-4"
      >
        <div className="ndb:min-w-0">
          <p className="ndb:text-xs ndb:font-bold ndb:text-zinc-700 ndb:dark:text-zinc-200">
            {figures.countLabel}{' '}
            <span
              hidden={visibleCount === itemCount}
              className="ndb:ml-1 ndb:text-xs ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400"
            >
              <span data-ndb-cache-visible-count="">{visibleCount}</span> shown
            </span>
          </p>
          <p className="ndb:mt-0.5 ndb:text-xs ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400">
            {formatDuration(figures.durationMs)} total
          </p>
        </div>
        {figures.reads > 0 ? (
          <div className="ndb:shrink-0 ndb:text-right">
            <p
              className={cx(
                'ndb:text-xs ndb:font-bold ndb:tabular-nums',
                figures.highMissRate
                  ? 'ndb:text-amber-700 ndb:dark:text-amber-300'
                  : 'ndb:text-zinc-700 ndb:dark:text-zinc-200',
              )}
            >
              {figures.hitRateLabel}
            </p>
            <p className="ndb:mt-0.5 ndb:text-xs ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400">
              {figures.hitsLabel}
            </p>
          </div>
        ) : null}
      </div>

      {figures.attention !== null ? (
        <p
          data-ndb-cache-attention=""
          role="status"
          className={cx(
            'ndb:flex ndb:items-start ndb:gap-2 ndb:text-xs ndb:font-medium ndb:leading-4',
            figures.failures > 0
              ? 'ndb:text-red-700 ndb:dark:text-red-300'
              : 'ndb:text-amber-700 ndb:dark:text-amber-300',
          )}
        >
          <Icon name="warning" size={3.5} className="ndb:mt-px" />
          <span>
            <strong className="ndb:font-bold">Cache needs attention.</strong> {figures.attention}
          </span>
        </p>
      ) : null}

      <InspectorListControls
        showSearch={itemCount >= 5}
        search={
          <SearchField
            label="Search cache operations"
            placeholder="Search keys or stores"
            data-ndb-cache-search=""
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        }
        filter={
          <SelectField
            label="Filter cache operations"
            data-ndb-cache-filter=""
            value={filter}
            onChange={(event) => onFilter(event.target.value)}
          >
            {figures.filters.map(([value, label, count]) => (
              <option key={value} value={value}>
                {`${label} (${count})`}
              </option>
            ))}
          </SelectField>
        }
      />
    </>
  );
}

/** One cache operation row (cache-list-item.blade.php). */
export function CacheListItem({ item, visible, selected, onSelect }) {
  const failed = Boolean(item.failed);
  const warns = cacheResultWarns(item);

  return (
    <button
      type="button"
      data-ndb-cache-item={item.execution}
      data-ndb-cache-execution={item.execution}
      data-ndb-cache-category={item.category}
      data-ndb-cache-failed={failed ? 'true' : 'false'}
      data-ndb-cache-search-text={item.search ?? ''}
      hidden={!visible}
      onClick={() => onSelect(item.execution)}
      aria-pressed={selected}
      className={cx(
        'ndb:grid ndb:h-auto ndb:w-full ndb:grid-cols-[4rem_minmax(0,1fr)_4.75rem] ndb:items-center ndb:gap-x-2 ndb:gap-y-0.5 ndb:px-3 ndb:py-2.5 ndb:text-left ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500',
        selected
          ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
          : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
    >
      <InspectorOperationBadge
        wide
        data-ndb-cache-operation=""
        className="ndb:col-start-1 ndb:row-span-2 ndb:row-start-1 ndb:self-center"
      >
        {item.operation_label}
      </InspectorOperationBadge>
      <span
        data-ndb-cache-key=""
        title={item.key_label}
        className="ndb:col-start-2 ndb:row-start-1 ndb:min-w-0 ndb:truncate ndb:text-xs ndb:font-semibold ndb:text-zinc-800 ndb:dark:text-zinc-200"
      >
        {item.key_label}
      </span>
      <span
        data-ndb-cache-result=""
        className={cx('ndb:col-start-3 ndb:row-start-1 ndb:w-full ndb:text-right ndb:text-xs ndb:font-bold', {
          'ndb:text-red-600 ndb:dark:text-red-300': failed,
          'ndb:text-amber-600 ndb:dark:text-amber-300': warns,
          'ndb:text-zinc-500 ndb:dark:text-zinc-400': !failed && !warns,
        })}
      >
        {item.result_label}
      </span>
      <span className="ndb:col-start-2 ndb:row-start-2 ndb:min-w-0 ndb:truncate ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
        {item.store_label}
      </span>
      <span
        data-ndb-cache-list-duration=""
        className="ndb:col-start-3 ndb:row-start-2 ndb:text-right ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400"
      >
        {item.duration_label}
      </span>
    </button>
  );
}
