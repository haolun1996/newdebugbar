import { cx } from '../../app/hooks.js';

/**
 * Left-hand list column of a split workspace (inspector-list-panel.blade.php). Props: detailOpen (boolean; hides
 * the list on small screens while a detail is open), listRef (ref or callback ref for the scrolling list, the old
 * x-ref), controls + controlsProps, list + listProps (rows; listProps may carry data-ndb-* or hidden), empty +
 * emptyProps (node below the list), className.
 */
export function InspectorListPanel({
  detailOpen,
  listRef,
  controls,
  controlsProps = {},
  list,
  listProps = {},
  empty,
  emptyProps = {},
  className,
  ...rest
}) {
  const { className: controlsClass, ...controlsAttributes } = controlsProps;
  const { className: listClass, ...listAttributes } = listProps;
  const { className: emptyClass, ...emptyAttributes } = emptyProps;

  return (
    <div
      {...rest}
      className={cx(
        'ndb:min-h-0 ndb:flex-col ndb:border-b ndb:border-zinc-200/90 ndb:lg:border-r ndb:lg:border-b-0 ndb:dark:border-zinc-800',
        className,
        detailOpen ? 'ndb:hidden ndb:lg:flex' : 'ndb:flex',
      )}
    >
      {controls !== undefined ? (
        <div
          {...controlsAttributes}
          className={cx(
            'ndb:space-y-3 ndb:border-b ndb:border-zinc-200/90 ndb:p-3 ndb:dark:border-zinc-800',
            controlsClass,
          )}
        >
          {controls}
        </div>
      ) : null}

      <div
        ref={listRef}
        {...listAttributes}
        className={cx(
          'ndb-scrollbar ndb:min-h-0 ndb:flex-1 ndb:divide-y ndb:divide-zinc-200/80 ndb:overflow-y-auto ndb:dark:divide-zinc-800',
          listClass,
        )}
      >
        {list}
      </div>

      {empty !== undefined ? (
        <div {...emptyAttributes} className={cx('ndb:p-3', emptyClass)}>
          {empty}
        </div>
      ) : null}
    </div>
  );
}
