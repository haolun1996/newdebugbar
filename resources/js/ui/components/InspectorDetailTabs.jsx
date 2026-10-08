import { cx } from '../../app/hooks.js';
import { FilterTabs } from './FilterTabs.jsx';

const ALIGNMENTS = {
  center: [
    'ndb:grid ndb:grid-cols-1 ndb:justify-items-center ndb:gap-2 ndb:sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
    'ndb:sm:col-start-2',
    'ndb:sm:col-start-3 ndb:sm:row-start-1 ndb:sm:justify-self-end',
  ],
  left: ['ndb:flex ndb:flex-wrap ndb:items-center ndb:justify-between ndb:gap-2', '', 'ndb:ml-auto'],
};

/**
 * Segmented tab bar under a detail header (inspector-detail-tabs.blade.php). Props: label (group aria-label),
 * align ('center' | 'left'), aside + asideProps (node at the end), className, children (FilterTab variant="segmented").
 */
export function InspectorDetailTabs({
  align = 'center',
  label,
  aside,
  asideProps = {},
  className,
  children,
  ...rest
}) {
  if (!ALIGNMENTS[align]) throw new Error(`Unknown inspector detail tab alignment [${align}].`);

  const [containerClasses, tabsClasses, asideClasses] = ALIGNMENTS[align];
  const { className: asideClass, ...asideAttributes } = asideProps;

  return (
    <div
      {...rest}
      className={cx(
        'ndb:border-b ndb:border-zinc-200/90 ndb:px-3 ndb:py-2.5 ndb:sm:px-4 ndb:dark:border-zinc-800',
        containerClasses,
        className,
      )}
    >
      <FilterTabs label={label} variant="segmented" className={cx('ndb:min-w-0', tabsClasses)}>
        {children}
      </FilterTabs>

      {aside !== undefined ? (
        <div {...asideAttributes} className={cx(asideClasses, asideClass)}>
          {aside}
        </div>
      ) : null}
    </div>
  );
}
