import { cx } from '../../app/hooks.js';

/**
 * Grid of list controls above a list (inspector-list-controls.blade.php). Props: showSearch (render `search`),
 * layout ('responsive' | 'compact'), leading (summary node), search (SearchField), filter, secondaryFilter
 * (SelectFields), className. Omitted slots are left undefined.
 */
export function InspectorListControls({
  showSearch,
  layout = 'responsive',
  leading,
  search,
  filter,
  secondaryFilter,
  className,
  ...rest
}) {
  if (!['responsive', 'compact'].includes(layout)) {
    throw new Error(`Unknown inspector list controls layout [${layout}].`);
  }

  const hasLeading = leading !== undefined;
  const hasFilter = filter !== undefined;
  const hasSecondaryFilter = secondaryFilter !== undefined;
  const isCompact = layout === 'compact';

  return (
    <div
      data-ndb-inspector-list-controls=""
      {...rest}
      className={cx(
        'ndb:grid ndb:items-start ndb:gap-x-2 ndb:gap-y-3',
        {
          'ndb:grid-cols-2': hasSecondaryFilter && isCompact,
          'ndb:grid-cols-2 ndb:sm:grid-cols-[minmax(0,1fr)_minmax(8.75rem,0.35fr)_minmax(8.75rem,0.35fr)]':
            hasSecondaryFilter && !isCompact,
          'ndb:grid-cols-[minmax(0,1fr)_8.75rem]': hasFilter && !hasSecondaryFilter,
          'ndb:grid-cols-1': !hasFilter && !hasSecondaryFilter,
        },
        className,
      )}
    >
      {hasLeading ? (
        <div className={cx('ndb:min-w-0 ndb:self-center', { 'ndb:col-span-full': showSearch })}>
          {leading}
        </div>
      ) : null}

      {showSearch && search !== undefined ? (
        <div
          className={cx('ndb:min-w-0', {
            'ndb:col-span-full': !hasFilter && !hasSecondaryFilter,
            'ndb:col-span-2': hasSecondaryFilter,
            'ndb:sm:col-span-1': hasSecondaryFilter && !isCompact,
          })}
        >
          {search}
        </div>
      ) : null}

      {hasFilter ? (
        <div className={cx('ndb:min-w-0', { 'ndb:col-span-2': !showSearch && !hasLeading })}>{filter}</div>
      ) : null}

      {hasSecondaryFilter ? <div className="ndb:min-w-0">{secondaryFilter}</div> : null}
    </div>
  );
}
