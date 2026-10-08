import { useContext } from 'react';
import { cx } from '../../app/hooks.js';
import { InspectorFactLayout } from './InspectorFacts.jsx';

/**
 * One fact inside InspectorFacts (inspector-fact.blade.php). Props: label, valueProps (attributes for the <dd>,
 * e.g. data-ndb-* or hidden), className, children (value). Layout comes from the enclosing InspectorFacts.
 */
export function InspectorFact({ label, valueProps = {}, className, children, ...rest }) {
  const inline = useContext(InspectorFactLayout) === 'inline';
  const { className: valueClass, ...valueAttributes } = valueProps;

  return (
    <div
      data-ndb-inspector-fact=""
      {...rest}
      className={cx(
        'ndb:min-w-0 ndb:bg-transparent',
        { 'ndb:flex ndb:flex-wrap ndb:items-baseline ndb:gap-x-2 ndb:gap-y-1': inline },
        className,
      )}
    >
      <dt className="ndb:bg-transparent ndb:text-xs ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400">
        {label}
      </dt>
      <dd
        {...valueAttributes}
        className={cx(
          'ndb:min-w-0 ndb:break-words ndb:bg-transparent ndb:text-sm ndb:text-zinc-800 ndb:dark:text-zinc-200',
          { 'ndb:mt-1': !inline },
          valueClass,
        )}
      >
        {children}
      </dd>
    </div>
  );
}
