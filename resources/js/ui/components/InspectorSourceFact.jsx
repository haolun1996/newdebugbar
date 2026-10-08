import { cx } from '../../app/hooks.js';

/**
 * Source term/value row inside InspectorSourcePanel (inspector-source-fact.blade.php). Props: label (plain term),
 * term + termProps (rich term replacing label), code (render the value in a monospace <code>), valueProps (wraps
 * the value in a <code> or <span> carrying these attributes), className, children (value).
 */
export function InspectorSourceFact({
  code = false,
  label = null,
  term,
  termProps = {},
  valueProps,
  className,
  children,
  ...rest
}) {
  const { className: termClass, ...termAttributes } = term !== undefined ? termProps : {};
  const { className: valueClass, ...valueAttributes } = valueProps ?? {};

  let value = children;
  if (code) {
    value = (
      <code
        {...valueAttributes}
        className={cx('ndb:block ndb:min-w-0 ndb:break-all ndb:font-mono ndb:text-xs', valueClass)}
      >
        {children}
      </code>
    );
  } else if (valueProps !== undefined) {
    value = (
      <span {...valueAttributes} className={cx('ndb:block ndb:min-w-0', valueClass)}>
        {children}
      </span>
    );
  }

  return (
    <div
      data-ndb-inspector-source-fact=""
      {...rest}
      className={cx(
        'ndb:grid ndb:min-w-0 ndb:gap-1 ndb:border-0 ndb:bg-transparent ndb:px-0 ndb:py-3 ndb:text-sm ndb:text-zinc-700 ndb:@sm:grid-cols-[8rem_minmax(0,1fr)] ndb:@sm:items-baseline ndb:@sm:gap-4 ndb:dark:text-zinc-200',
        className,
      )}
    >
      <dt
        {...termAttributes}
        className={cx('ndb:text-xs ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400', termClass)}
      >
        {term !== undefined ? term : label}
      </dt>
      <dd className="ndb:min-w-0 ndb:break-words ndb:text-sm ndb:leading-5 ndb:text-zinc-700 ndb:dark:text-zinc-200">
        {value}
      </dd>
    </div>
  );
}
