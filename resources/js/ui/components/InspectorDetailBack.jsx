import { cx } from '../../app/hooks.js';
import { Icon } from './Icon.jsx';

/** Back-to-list button for detail panes (inspector-detail-back.blade.php). Props: label, persistent (also shown on lg), onClick, className. */
export function InspectorDetailBack({ label, persistent = false, className, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'ndb:m-0 ndb:inline-flex ndb:min-h-11 ndb:w-fit ndb:items-center ndb:gap-1.5 ndb:rounded-lg ndb:px-3 ndb:py-2 ndb:text-xs ndb:font-bold ndb:text-indigo-600 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-indigo-300',
        { 'ndb:lg:hidden': !persistent },
        className,
      )}
    >
      <Icon name="chevron-down" size={3.5} className="ndb:rotate-90" />
      {label}
    </button>
  );
}
