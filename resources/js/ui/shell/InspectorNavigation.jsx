import { useEffect, useLayoutEffect, useRef } from 'react';
import Sortable from 'sortablejs';
import { cx, useShell, useShellContext } from '../../app/hooks.js';
import { Icon } from '../components/Icon.jsx';

const GROUPS = [
  ['favorites', true],
  ['inspectors', false],
];

/**
 * Lets SortableJS drive drag reordering without owning React's DOM: each move Sortable makes is
 * put back where React rendered it before the new order is committed to the shell, so React
 * performs the actual reorder on its next render.
 */
function useInspectorSort(listRef, renderedKeys) {
  const { store } = useShellContext();

  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;

    const config = store.state.inspectorSortConfig;
    const sortable = Sortable.create(list, {
      animation: 150,
      ...config,
      filter: '[data-ndb-toggle-favorite]',
      preventOnFilter: false,
      onChange: (event) => {
        const keys = renderedKeys.current;
        const next = keys[keys.indexOf(event.item.dataset.ndbInspector) + 1];
        const anchor = next
          ? [...list.children].find(
              (child) =>
                child !== event.item && child.dataset.ndbInspector === next && child !== Sortable.ghost,
            )
          : null;
        list.insertBefore(event.item, anchor ?? null);
        config.onChange?.(event);
      },
    });

    return () => sortable.destroy();
  }, [listRef, renderedKeys, store]);
}

function InspectorGroup({ group, favorite, mobile }) {
  const shell = useShell();
  const inspectors = shell.navigationInspectors(favorite);
  const listRef = useRef(null);
  const renderedKeys = useRef([]);
  useLayoutEffect(() => {
    renderedKeys.current = inspectors.map((inspector) => inspector.key);
  });
  useInspectorSort(listRef, renderedKeys);

  return (
    <div role="group" aria-label={favorite ? 'Favorites' : 'Inspectors'} hidden={inspectors.length === 0}>
      <p
        {...{ [`data-ndb-${group}-heading`]: '' }}
        hidden={!mobile && shell.favorites.length === 0}
        className="ndb:px-2.5 ndb:pb-1.5 ndb:pt-1 ndb:text-xs ndb:font-bold ndb:uppercase ndb:tracking-[0.14em] ndb:text-zinc-400"
      >
        {favorite ? 'Favorites' : 'Inspectors'}
      </p>
      <div ref={listRef} data-ndb-sort-group={group} className="ndb:flex ndb:flex-col ndb:gap-0.5">
        {inspectors.map((inspector) => (
          <InspectorLink key={inspector.key} inspector={inspector} mobile={mobile} />
        ))}
      </div>
    </div>
  );
}

function InspectorLink({ inspector, mobile }) {
  const shell = useShell();
  const key = inspector.key;
  const selected = shell.selected === key;
  const isFavorite = shell.isFavorite(key);
  const favoriteLabel = `${isFavorite ? 'Remove ' : 'Add '}${inspector.label}${isFavorite ? ' from favorites' : ' to favorites'}`;

  return (
    <div
      data-ndb-inspector={key}
      data-ndb-inspector-visible="true"
      data-ndb-favorite={isFavorite ? 'true' : 'false'}
      className={cx(
        'ndb:group ndb:relative ndb:flex ndb:w-full ndb:items-center ndb:rounded-lg ndb:pr-1 ndb:transition ndb:hover:bg-zinc-200/60 ndb:dark:hover:bg-zinc-800/60',
        selected ? 'ndb-inspector-active' : '',
      )}
    >
      <button
        type="button"
        data-ndb-select-inspector={key}
        aria-current={selected ? 'page' : undefined}
        aria-label={inspector.label}
        aria-description="Drag to reorder. On touch screens, hold before dragging. Shift and arrow keys also reorder."
        onClick={() => (mobile ? shell.openInspectorFromToolbar(key) : shell.selectInspector(key))}
        role={mobile ? 'menuitem' : undefined}
        onKeyDown={(event) => {
          if (!event.shiftKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
          event.preventDefault();
          event.stopPropagation();
          shell.moveInspector(key, event.key === 'ArrowUp' ? -1 : 1);
        }}
        className={cx(
          mobile ? 'ndb:h-11 ndb:text-sm' : 'ndb:h-9 ndb:text-xs',
          'ndb:flex ndb:min-w-0 ndb:flex-1 ndb:items-center ndb:gap-2 ndb:rounded-lg ndb:px-2.5 ndb:text-left ndb:font-semibold ndb:cursor-grab ndb:active:cursor-grabbing ndb:transition ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500',
          selected
            ? ''
            : 'ndb:text-zinc-600 ndb:hover:text-zinc-950 ndb:dark:text-zinc-400 ndb:dark:hover:text-white',
        )}
      >
        <span className="ndb-inspector-label ndb:truncate">{inspector.label}</span>
        <span className="ndb:ml-auto ndb:flex ndb:h-7 ndb:shrink-0 ndb:items-center ndb:gap-1.5">
          <span
            hidden={inspector.count === null}
            className={cx(
              'ndb-inspector-count ndb:inline-flex ndb:items-center ndb:text-xs ndb:leading-none ndb:tabular-nums',
              selected ? '' : 'ndb:text-zinc-400',
            )}
          >
            {inspector.count}
          </span>
        </span>
      </button>
      <button
        type="button"
        data-ndb-toggle-favorite={key}
        role={mobile ? 'menuitemcheckbox' : undefined}
        aria-checked={mobile ? isFavorite : undefined}
        aria-pressed={mobile ? undefined : isFavorite}
        aria-label={favoriteLabel}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        onClick={(event) => {
          event.stopPropagation();
          shell.toggleFavorite(key);
        }}
        className={cx(
          mobile
            ? 'ndb:size-11'
            : 'ndb:size-7 ndb:sm:opacity-0 ndb:sm:group-focus-within:opacity-100 ndb:sm:group-hover:opacity-100',
          'ndb-star-button ndb:inline-flex ndb:items-center ndb:justify-center ndb:rounded-lg ndb:text-zinc-400 ndb:transition ndb:hover:scale-105 ndb:hover:text-blue-600 ndb:focus-visible:opacity-100 ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-1 ndb:focus-visible:outline-blue-500 ndb:dark:text-zinc-500 ndb:dark:hover:text-blue-300',
          isFavorite || selected ? 'ndb:sm:opacity-100' : '',
        )}
      >
        {isFavorite ? (
          <span className="ndb:flex ndb:items-center ndb:justify-center ndb:leading-none">
            <Icon name="star-filled" className="ndb-favorite-star ndb:size-3.5" />
          </span>
        ) : (
          <span className="ndb-inspector-star-outline ndb:flex ndb:items-center ndb:justify-center ndb:leading-none">
            <Icon name="star" className="ndb:size-3.5" />
          </span>
        )}
      </button>
    </div>
  );
}

/** The favorites and inspectors lists, in the side navigation or inside a mobile menu. */
export function InspectorNavigation({ mobile = false, className, ...rest }) {
  return (
    <div
      data-ndb-inspector-list
      {...rest}
      className={cx(
        'ndb:flex ndb:min-h-0 ndb:flex-col ndb:gap-3',
        mobile ? 'ndb:shrink-0' : 'ndb:flex-1',
        className,
      )}
    >
      {GROUPS.map(([group, favorite]) => (
        <InspectorGroup key={group} group={group} favorite={favorite} mobile={mobile} />
      ))}
    </div>
  );
}
