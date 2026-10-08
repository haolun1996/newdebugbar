import { cx } from '../../app/hooks.js';
import { CopyButton } from './CopyButton.jsx';

const CLASSES =
  'ndb:inline-flex ndb:h-auto ndb:min-h-0 ndb:max-w-full ndb:items-center ndb:border-0 ndb:bg-transparent ndb:p-0 ndb:text-left ndb:text-xs ndb:font-semibold ndb:text-zinc-700 ndb:underline ndb:decoration-zinc-300 ndb:decoration-1 ndb:underline-offset-2 ndb:transition-colors ndb:hover:bg-transparent ndb:hover:text-zinc-950 ndb:hover:decoration-zinc-600 ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-zinc-200 ndb:dark:decoration-zinc-600 ndb:dark:hover:bg-transparent ndb:dark:hover:text-white ndb:dark:hover:decoration-zinc-300';

/**
 * Underlined source location that copies itself (inspector-source-link.blade.php). Props: copy (value to copy;
 * without it a plain button renders), valueProps (attributes for the truncating <span>), aria-label, className,
 * children (the visible location text).
 */
export function InspectorSourceLink({ copy = null, valueProps = {}, className, children, ...rest }) {
  const { className: valueClass, ...valueAttributes } = valueProps;
  const value = (
    <span {...valueAttributes} className={cx('ndb:min-w-0 ndb:truncate', valueClass)}>
      {children}
    </span>
  );

  if (copy !== null && copy !== undefined) {
    return (
      <CopyButton copy={copy} data-ndb-inspector-source-link="" {...rest} className={cx(CLASSES, className)}>
        {value}
      </CopyButton>
    );
  }

  return (
    <button type="button" data-ndb-inspector-source-link="" {...rest} className={cx(CLASSES, className)}>
      {value}
    </button>
  );
}
