import { cx } from '../../app/hooks.js';

const TONES = {
  default: ['ndb:text-zinc-700 ndb:dark:text-zinc-200', 'ndb:text-zinc-600 ndb:dark:text-zinc-300'],
  danger: ['ndb:text-red-700 ndb:dark:text-red-300', 'ndb:text-red-700 ndb:dark:text-red-300'],
};

/**
 * Term/value row (inspector-definition-row.blade.php). Props: label (plain term), term + termProps (rich term
 * replacing label), tone ('default' | 'danger'), valueProps (attributes for the <dd>), className, children (value).
 */
export function InspectorDefinitionRow({
  label = null,
  term,
  termProps = {},
  tone = 'default',
  valueProps = {},
  className,
  children,
  ...rest
}) {
  if (!TONES[tone]) throw new Error(`Unknown inspector definition tone [${tone}].`);

  const [termClasses, valueClasses] = TONES[tone];
  const { className: termClass, ...termAttributes } = termProps;
  const { className: valueClass, ...valueAttributes } = valueProps;

  return (
    <div
      {...rest}
      className={cx(
        'ndb:grid ndb:min-w-0 ndb:gap-1 ndb:py-3 ndb:first:pt-0 ndb:@sm:grid-cols-[8rem_minmax(0,1fr)] ndb:@sm:gap-4',
        className,
      )}
    >
      <dt
        {...(term !== undefined ? termAttributes : {})}
        className={cx('ndb:text-xs ndb:font-medium', termClasses, termClass)}
      >
        {term !== undefined ? term : label}
      </dt>
      <dd
        {...valueAttributes}
        className={cx('ndb:min-w-0 ndb:break-words ndb:text-sm ndb:leading-5', valueClasses, valueClass)}
      >
        {children}
      </dd>
    </div>
  );
}
