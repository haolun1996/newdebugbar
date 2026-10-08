import { cx } from '../../../app/hooks.js';
import { InspectorOperationBadge } from '../../components/InspectorOperationBadge.jsx';

const SELECTED = {
  slow: 'ndb:bg-red-50/90 ndb:ring-1 ndb:ring-inset ndb:ring-red-200 ndb:dark:bg-red-950/35 ndb:dark:ring-red-900/80',
  repeated:
    'ndb:bg-amber-50/90 ndb:ring-1 ndb:ring-inset ndb:ring-amber-200 ndb:dark:bg-amber-950/35 ndb:dark:ring-amber-900/80',
  default:
    'ndb:bg-indigo-50/90 ndb:ring-1 ndb:ring-inset ndb:ring-indigo-200 ndb:dark:bg-indigo-950/35 ndb:dark:ring-indigo-800/80',
};

const IDLE = {
  slow: 'ndb:bg-red-50/70 ndb:hover:bg-red-100/75 ndb:dark:bg-red-950/25 ndb:dark:hover:bg-red-950/40',
  repeated:
    'ndb:bg-amber-50/70 ndb:hover:bg-amber-100/75 ndb:dark:bg-amber-950/25 ndb:dark:hover:bg-amber-950/40',
  default: 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
};

const flag = (value) => (value ? 'true' : 'false');

/** One query record in the list; a repeated pattern is one row for all of its runs. */
export function QueryRow({ record, selected, onSelect }) {
  const tone = record.slow ? 'slow' : record.repeated ? 'repeated' : 'default';

  return (
    <button
      type="button"
      data-ndb-query-item={record.key}
      data-ndb-query-key={record.key}
      data-ndb-execution={record.execution}
      data-ndb-duration={record.duration_ms}
      data-ndb-query-type={record.query_type}
      data-ndb-attention={flag(record.attention)}
      data-ndb-slow={flag(record.slow)}
      data-ndb-repeated={flag(record.repeated)}
      data-ndb-search={record.search}
      data-ndb-query-execution-count={record.count}
      aria-controls="newdebugbar-query-detail"
      data-ndb-query-group={record.repeated ? record.key : undefined}
      aria-pressed={selected}
      onClick={onSelect}
      className={cx(
        'ndb:grid ndb:h-auto ndb:w-full ndb:grid-cols-[3.5rem_minmax(0,1fr)_4.75rem] ndb:items-center ndb:gap-3 ndb:px-3 ndb:py-2.5 ndb:text-left ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500',
        selected ? SELECTED[tone] : IDLE[tone],
      )}
    >
      <span className="ndb:flex ndb:min-w-0 ndb:items-center">
        <InspectorOperationBadge compact data-ndb-query-type-badge="">
          {record.query_type}
        </InspectorOperationBadge>
        {record.slow ? (
          <span className="ndb:sr-only">{record.repeated ? 'Slow repeated query.' : 'Slow query.'}</span>
        ) : record.repeated ? (
          <span className="ndb:sr-only">Repeated query.</span>
        ) : null}
      </span>

      <code
        data-ndb-query-list-sql=""
        title={record.sql}
        className="ndb:block ndb:max-h-10 ndb:min-w-0 ndb:overflow-hidden ndb:break-words ndb:text-xs ndb:font-semibold ndb:leading-5 ndb:text-zinc-800 ndb:dark:text-zinc-200"
      >
        {record.sql}
      </code>

      <span
        data-ndb-query-list-outcome=""
        className="ndb:flex ndb:min-w-0 ndb:flex-col ndb:items-end ndb:gap-0.5 ndb:text-right ndb:text-xs ndb:tabular-nums"
      >
        <span
          data-ndb-query-list-driver=""
          title={record.driver}
          className="ndb:h-auto ndb:max-w-full ndb:truncate ndb:bg-transparent ndb:[font-family:inherit] ndb:text-xs ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400"
        >
          {record.driver}
        </span>
        <strong
          data-ndb-query-list-duration=""
          className="ndb:font-bold ndb:text-zinc-700 ndb:dark:text-zinc-200"
        >
          {record.duration_label}
        </strong>
      </span>
    </button>
  );
}
