import { createContext } from 'react';
import { cx } from '../../app/hooks.js';

/** The enclosing InspectorFacts layout, read by InspectorFact (Blade @aware). */
export const InspectorFactLayout = createContext('grid');

const COLUMNS = {
  1: 'ndb:grid-cols-1',
  2: 'ndb:grid-cols-1 ndb:@xs:grid-cols-2',
  4: 'ndb:grid-cols-1 ndb:@xs:grid-cols-2 ndb:@2xl:grid-cols-4',
};

const LAYOUTS = {
  grid: 'ndb:grid ndb:gap-x-6 ndb:gap-y-3',
  inline: 'ndb:flex ndb:flex-wrap ndb:items-baseline ndb:gap-x-6 ndb:gap-y-2',
};

/**
 * Fact list (inspector-facts.blade.php). Props: columns (1 | 2 | 4, grid layout only), bordered (default true),
 * layout ('grid' | 'inline'; InspectorFact children follow it), className, children (InspectorFact).
 */
export function InspectorFacts({
  columns = 4,
  bordered = true,
  layout = 'grid',
  className,
  children,
  ...rest
}) {
  const columnClasses = COLUMNS[Number(columns)];
  if (!columnClasses) throw new Error(`Unsupported inspector fact column count [${columns}].`);
  if (!LAYOUTS[layout]) throw new Error(`Unknown inspector fact layout [${layout}].`);

  return (
    <dl
      data-ndb-inspector-facts={layout}
      {...rest}
      className={cx(
        'ndb:min-w-0 ndb:border-t-0 ndb:bg-transparent ndb:pt-0 ndb:text-zinc-700 ndb:dark:text-zinc-200',
        LAYOUTS[layout],
        layout === 'grid' && columnClasses,
        bordered && 'ndb:border-b ndb:border-zinc-200/90 ndb:pb-3 ndb:sm:pb-4 ndb:dark:border-zinc-800',
        className,
      )}
    >
      <InspectorFactLayout value={layout}>{children}</InspectorFactLayout>
    </dl>
  );
}
