import { cx } from '../../app/hooks.js';

const VARIANTS = {
  tabs: 'ndb:flex ndb:gap-1 ndb:overflow-x-auto',
  segmented:
    'ndb:grid ndb:auto-cols-fr ndb:grid-flow-col ndb:gap-0.5 ndb:overflow-x-auto ndb:rounded-lg ndb:border ndb:border-zinc-200/90 ndb:bg-zinc-100/80 ndb:p-0.5 ndb:dark:border-zinc-800 ndb:dark:bg-zinc-900/80',
};

/** Labelled group of FilterTab buttons (filter-tabs.blade.php). Props: label (aria-label), variant ('tabs' | 'segmented'), className, children. */
export function FilterTabs({ label, variant = 'tabs', className, children, ...rest }) {
  if (!VARIANTS[variant]) throw new Error(`Unknown filter tabs variant [${variant}].`);

  return (
    <div
      role="group"
      aria-label={label}
      data-ndb-filter-tabs=""
      data-ndb-filter-tabs-variant={variant}
      {...rest}
      className={cx(VARIANTS[variant], className)}
    >
      {children}
    </div>
  );
}
