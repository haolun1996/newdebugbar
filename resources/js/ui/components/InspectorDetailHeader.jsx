import { cx } from '../../app/hooks.js';

const LAYOUTS = {
  grid: 'ndb:grid ndb:grid-cols-[minmax(0,1fr)_auto] ndb:items-start ndb:gap-x-3 ndb:gap-y-2',
  wrap: 'ndb:flex ndb:min-w-0 ndb:flex-wrap ndb:items-center ndb:justify-between ndb:gap-3',
};

/**
 * Detail pane header (inspector-detail-header.blade.php). Props: layout ('grid' | 'wrap'), title (node, usually an
 * <h3>), aside (node beside the title), identity + identityProps (boxed identity block), metadata + metadataProps
 * (<dl> of metadata; pass <dt>/<dd> children), className.
 */
export function InspectorDetailHeader({
  layout = 'grid',
  title,
  aside,
  identity,
  identityProps = {},
  metadata,
  metadataProps = {},
  className,
  ...rest
}) {
  if (!LAYOUTS[layout]) throw new Error(`Unknown inspector detail header layout [${layout}].`);

  const { className: identityClass, ...identityAttributes } = identityProps;
  const { className: metadataClass, ...metadataAttributes } = metadataProps;

  return (
    <header
      {...rest}
      className={cx(
        'ndb:border-b ndb:border-zinc-200/90 ndb:p-3 ndb:sm:p-4 ndb:dark:border-zinc-800',
        className,
      )}
    >
      <div data-ndb-inspector-detail-header-primary="" className={LAYOUTS[layout]}>
        {title}
        {aside}
      </div>

      {identity !== undefined ? (
        <div
          {...identityAttributes}
          className={cx(
            'ndb:mt-3 ndb:rounded-lg ndb:bg-zinc-50/85 ndb:px-3 ndb:py-2.5 ndb:ring-1 ndb:ring-inset ndb:ring-zinc-200/70 ndb:dark:bg-zinc-900/65 ndb:dark:ring-zinc-800',
            identityClass,
          )}
        >
          {identity}
        </div>
      ) : null}

      {metadata !== undefined ? (
        <dl
          {...metadataAttributes}
          className={cx(
            'ndb:mt-2.5 ndb:flex ndb:flex-wrap ndb:items-center ndb:gap-x-3 ndb:gap-y-1 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400',
            metadataClass,
          )}
        >
          {metadata}
        </dl>
      ) : null}
    </header>
  );
}
