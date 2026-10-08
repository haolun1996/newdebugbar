import { cx } from '../../../app/hooks.js';
import { formatDuration } from '../../../duration.js';
import { httpClientFilterOptions } from '../../../inspectors/http-client.js';
import { InspectorListControls } from '../../components/InspectorListControls.jsx';
import { InspectorOperationBadge } from '../../components/InspectorOperationBadge.jsx';
import { InspectorSortHeading } from '../../components/InspectorSortHeading.jsx';
import { SearchField } from '../../components/SearchField.jsx';
import { SelectField } from '../../components/SelectField.jsx';

const number = (value) => Number(value).toLocaleString('en-US');

/** Summary line plus search and filter (http-client-controls.blade.php). */
export function HttpClientControls({ summary, requests, visibleCount, search, onSearch, filter, onFilter }) {
  const retainedCount = requests.length;
  const totalCount = Math.max(retainedCount, Math.trunc(Number(summary.count ?? retainedCount)) || 0);

  return (
    <>
      <p
        data-ndb-http-client-summary=""
        className="ndb:min-w-0 ndb:text-xs ndb:font-semibold ndb:text-zinc-700 ndb:dark:text-zinc-200"
      >
        <span data-ndb-http-client-summary-count="">
          {number(totalCount)} {totalCount === 1 ? 'request' : 'requests'}
        </span>{' '}
        <span
          hidden={visibleCount === retainedCount}
          className="ndb:ml-1 ndb:text-[11px] ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400"
        >
          <span data-ndb-http-client-visible-count="">{visibleCount}</span> shown
        </span>{' '}
        <span
          data-ndb-http-client-summary-runtime=""
          className="ndb:mt-0.5 ndb:flex ndb:flex-wrap ndb:gap-x-2 ndb:text-[11px] ndb:font-medium ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400"
        >
          {retainedCount < totalCount ? (
            <span data-ndb-http-client-summary-available="">{number(retainedCount)} available</span>
          ) : null}
          <span>{formatDuration(summary.duration_ms ?? 0)} total</span>
        </span>
      </p>

      <InspectorListControls
        showSearch
        search={
          <SearchField
            label="Search outbound HTTP requests"
            placeholder="Search requests"
            data-ndb-http-client-search=""
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        }
        filter={
          <SelectField
            label="Filter outbound HTTP requests"
            data-ndb-http-client-filter=""
            value={filter}
            onChange={(event) => onFilter(event.target.value)}
          >
            {httpClientFilterOptions(requests).map(([value, label, count]) => (
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

/** Sticky column heading with the Time sort (http-client-list-heading.blade.php). */
export function HttpClientListHeading({ sort, direction, onSort }) {
  return (
    <div
      data-ndb-http-client-list-heading=""
      className="ndb:sticky ndb:top-0 ndb:z-10 ndb:grid ndb:h-auto ndb:grid-cols-[3rem_minmax(0,1fr)_3.5rem_4.75rem] ndb:items-center ndb:gap-x-2 ndb:border-b ndb:border-zinc-200/90 ndb:bg-white/95 ndb:px-3 ndb:py-2 ndb:text-[11px] ndb:font-semibold ndb:text-zinc-400 ndb:backdrop-blur-sm ndb:dark:border-zinc-800 ndb:dark:bg-zinc-950/95"
    >
      <span>Method</span>
      <span>Request</span>
      <span className="ndb:text-right">Status</span>
      <span className="ndb:flex ndb:justify-end">
        <InspectorSortHeading
          label="Time"
          align="right"
          active={sort === 'duration'}
          direction={direction}
          data-ndb-http-client-sort-heading="duration"
          onClick={() => onSort('duration')}
        />
      </span>
    </div>
  );
}

const numeric = (value) =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));

/** One request row (http-client-list-item.blade.php). */
export function HttpClientListItem({ item, visible, selected, onSelect }) {
  const failed = Boolean(item.failed);
  const slow = Boolean(item.slow);

  return (
    <button
      type="button"
      data-ndb-http-client-item={item.execution}
      data-ndb-execution={item.execution}
      data-ndb-duration={numeric(item.duration_ms) ? item.duration_ms : -1}
      data-ndb-failed={failed ? 'true' : 'false'}
      data-ndb-slow={slow ? 'true' : 'false'}
      data-ndb-search={item.search ?? ''}
      hidden={!visible}
      onClick={() => onSelect(item.execution)}
      aria-pressed={selected}
      className={cx(
        'ndb:grid ndb:h-auto ndb:w-full ndb:grid-cols-[3rem_minmax(0,1fr)_3.5rem_4.75rem] ndb:items-center ndb:gap-x-2 ndb:px-3 ndb:py-2.5 ndb:text-left ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500',
        selected
          ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
          : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
    >
      <InspectorOperationBadge data-ndb-http-client-method="">{item.method}</InspectorOperationBadge>
      <span title={item.url} className="ndb:min-w-0">
        <span
          data-ndb-http-client-host=""
          className="ndb:block ndb:truncate ndb:text-xs ndb:font-bold ndb:text-zinc-800 ndb:dark:text-zinc-100"
        >
          {item.host}
        </span>
        <span className="ndb:mt-0.5 ndb:block ndb:truncate ndb:text-[11px] ndb:text-zinc-500 ndb:dark:text-zinc-400">
          {item.path}
          {item.query !== null && item.query !== undefined ? `?${item.query}` : ''}
        </span>
      </span>
      <span
        data-ndb-http-client-list-status=""
        className={cx(
          'ndb:w-full ndb:text-right ndb:text-[11px] ndb:font-bold ndb:tabular-nums',
          failed ? 'ndb:text-red-600 ndb:dark:text-red-300' : 'ndb:text-zinc-500 ndb:dark:text-zinc-400',
        )}
      >
        {item.list_status_label}
      </span>
      <span
        data-ndb-http-client-list-duration=""
        className="ndb:flex ndb:min-w-0 ndb:items-center ndb:justify-end"
      >
        <span
          className={cx(
            'ndb:whitespace-nowrap ndb:text-[11px] ndb:font-semibold ndb:tabular-nums',
            slow ? 'ndb:text-amber-600 ndb:dark:text-amber-300' : 'ndb:text-zinc-500 ndb:dark:text-zinc-400',
          )}
        >
          {item.duration_label}
        </span>
        {slow ? <span className="ndb:sr-only">Slow request</span> : null}
      </span>
    </button>
  );
}
