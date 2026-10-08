import { cx } from '../../../app/hooks.js';
import { formatNumber } from '../../../inspectors/models.js';

/** One model context as a compact selection row (model-group.blade.php). */
export function ModelGroup({ row, selected, onSelect }) {
  const { index, shortName, connection, table, retrieved, writes, reloads } = row;

  return (
    <button
      type="button"
      data-ndb-model-group=""
      data-ndb-model-index={index}
      data-ndb-model-short-name={shortName}
      data-ndb-model-sort-name={row.sortName}
      data-ndb-model-sort-retrieved={retrieved}
      data-ndb-model-sort-writes={writes}
      data-ndb-model-sort-reloads={reloads}
      data-ndb-model-search-value={row.search}
      aria-controls="newdebugbar-model-detail"
      onClick={() => onSelect(index)}
      aria-pressed={selected}
      className={cx(
        'ndb:grid ndb:h-auto ndb:w-full ndb:min-w-0 ndb:cursor-pointer ndb:grid-cols-[minmax(0,1fr)_auto] ndb:items-center ndb:gap-x-3 ndb:gap-y-1 ndb:border-l-0 ndb:bg-transparent ndb:px-3 ndb:py-2.5 ndb:text-left ndb:text-xs ndb:text-zinc-950 ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-white ndb:sm:grid-cols-[minmax(7rem,1fr)_3.5rem_2.75rem_3.75rem] ndb:sm:gap-x-2 ndb:sm:gap-y-2 ndb:sm:py-3',
        selected
          ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
          : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
    >
      <span className="ndb:col-start-1 ndb:row-start-1 ndb:min-w-0">
        <span data-ndb-model-name="" className="ndb:block ndb:truncate ndb:text-xs ndb:font-bold">
          {shortName}
        </span>
        <span
          className="ndb:mt-0.5 ndb:block ndb:truncate ndb:text-xs ndb:text-zinc-400"
          title={`${connection} connection, ${table} table`}
        >
          {connection}, {table}
        </span>
      </span>

      <span className="ndb:col-span-2 ndb:row-start-2 ndb:flex ndb:min-w-0 ndb:flex-wrap ndb:gap-x-4 ndb:gap-y-1 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400 ndb:sm:hidden">
        <span>
          <span className="ndb:text-zinc-400">Retrieved</span>{' '}
          <strong className="ndb:font-semibold ndb:tabular-nums ndb:text-zinc-700 ndb:dark:text-zinc-300">
            {formatNumber(retrieved)}
          </strong>
        </span>
        <span>
          <span className="ndb:text-zinc-400">Writes</span>{' '}
          <strong className="ndb:font-semibold ndb:tabular-nums ndb:text-zinc-700 ndb:dark:text-zinc-300">
            {formatNumber(writes)}
          </strong>
        </span>
        <span>
          <span className="ndb:text-zinc-400">Reloads</span>{' '}
          <strong
            className={cx('ndb:font-semibold ndb:tabular-nums', {
              'ndb:text-amber-700 ndb:dark:text-amber-300': reloads > 0,
              'ndb:text-zinc-700 ndb:dark:text-zinc-300': reloads === 0,
            })}
          >
            {formatNumber(reloads)}
          </strong>
        </span>
      </span>

      <span
        data-ndb-model-retrieved-column=""
        className="ndb:col-start-2 ndb:row-start-1 ndb:hidden ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-right ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-700 ndb:dark:text-zinc-300 ndb:sm:block"
      >
        {formatNumber(retrieved)}
      </span>
      <span
        data-ndb-model-write-column=""
        className="ndb:col-start-3 ndb:row-start-1 ndb:hidden ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-right ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-700 ndb:dark:text-zinc-300 ndb:sm:block"
      >
        {formatNumber(writes)}
      </span>
      <span
        data-ndb-model-extra-column=""
        className={cx(
          'ndb:col-start-4 ndb:row-start-1 ndb:hidden ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-right ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:sm:block',
          {
            'ndb:text-amber-700 ndb:dark:text-amber-300': reloads > 0,
            'ndb:text-zinc-500 ndb:dark:text-zinc-400': reloads === 0,
          },
        )}
      >
        {formatNumber(reloads)}
      </span>
    </button>
  );
}
