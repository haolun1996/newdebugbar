import { cx } from '../../app/hooks.js';
import { Icon } from './Icon.jsx';

/**
 * Sortable column heading button (inspector-sort-heading.blade.php). Props: label, active (boolean), direction
 * ('asc' | 'desc'), align ('left' | 'right'), onClick, className, other button attributes (data-ndb-*).
 */
export function InspectorSortHeading({ label, active, direction, align = 'left', className, ...rest }) {
  if (!['left', 'right'].includes(align))
    throw new Error(`Unknown inspector sort heading alignment [${align}].`);

  return (
    <button
      type="button"
      aria-pressed={Boolean(active)}
      {...rest}
      className={cx(
        'ndb:inline-flex ndb:min-h-5 ndb:items-center ndb:gap-1 ndb:transition-colors ndb:focus-visible:rounded ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-2 ndb:focus-visible:outline-indigo-500',
        { 'ndb:justify-start': align === 'left', 'ndb:justify-end': align === 'right' },
        className,
        active
          ? 'ndb:text-indigo-600 ndb:dark:text-indigo-300'
          : 'ndb:text-zinc-400 ndb:hover:text-zinc-600 ndb:dark:hover:text-zinc-300',
      )}
    >
      <span aria-hidden="true" data-ndb-sort-indicator="" className="ndb:relative ndb:size-3 ndb:shrink-0">
        <Icon
          name="chevron-down"
          size={3}
          hidden={!active}
          className={cx('ndb:absolute ndb:inset-0 ndb:transition-transform', {
            'ndb:rotate-180': direction === 'asc',
          })}
        />
      </span>
      <span aria-hidden="true">{label}</span>
      <span className="ndb:sr-only">
        {active
          ? `${label}, sorted ${direction === 'asc' ? 'ascending' : 'descending'}`
          : `${label}, not sorted`}
      </span>
    </button>
  );
}
