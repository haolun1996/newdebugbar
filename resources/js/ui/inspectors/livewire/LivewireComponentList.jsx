import { cx } from '../../../app/hooks.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { Icon } from '../../components/Icon.jsx';

function LivewireComponentRow({ state, component }) {
  const selected = state.livewireSelectedComponentId === component.id;
  const searchContext = state.livewireComponentIsSearchContext(component);
  const collapsed = state.livewireComponentCollapsed(component);

  return (
    <div
      data-ndb-livewire-component-row=""
      data-ndb-livewire-component-id={component.id}
      data-ndb-livewire-component-depth={component.depth}
      className={cx(
        'ndb:flex ndb:w-full ndb:min-w-0 ndb:items-stretch ndb:pr-3 ndb:transition-colors',
        selected
          ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
          : searchContext
            ? 'ndb:bg-zinc-50/50 ndb:text-zinc-500 ndb:dark:bg-zinc-900/35 ndb:dark:text-zinc-400'
            : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
      style={{ paddingLeft: `${12 + component.depth * 18}px` }}
    >
      <button
        hidden={!component.hasChildren}
        data-ndb-livewire-component-toggle=""
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          state.toggleLivewireComponent(component);
        }}
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${component.title}`}
        className="ndb:mx-1 ndb:my-auto ndb:grid ndb:size-5 ndb:shrink-0 ndb:place-items-center ndb:rounded ndb:border ndb:border-zinc-200 ndb:bg-zinc-100 ndb:text-zinc-500 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:hover:bg-zinc-200 ndb:hover:text-zinc-700 ndb:dark:border-zinc-700 ndb:dark:bg-zinc-800 ndb:dark:text-zinc-400 ndb:dark:hover:bg-zinc-700 ndb:dark:hover:text-zinc-200"
      >
        <Icon name="plus" size={3} hidden={!collapsed} />
        <Icon name="minus" size={3} hidden={collapsed} />
      </button>
      <span hidden={component.hasChildren} aria-hidden="true" className="ndb:mx-1 ndb:w-5 ndb:shrink-0" />

      <button
        data-ndb-livewire-component-select=""
        type="button"
        onClick={() => state.selectLivewireComponent(component.id)}
        aria-pressed={selected}
        className="ndb:grid ndb:h-auto ndb:min-w-0 ndb:flex-1 ndb:grid-cols-[minmax(0,1fr)_auto] ndb:items-center ndb:gap-3 ndb:px-2 ndb:py-2.5 ndb:text-left ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500"
      >
        <span className="ndb:min-w-0">
          <span
            data-ndb-livewire-component-title=""
            className="ndb:block ndb:truncate ndb:text-xs ndb:font-bold"
          >
            {component.title}
          </span>
          <span className="ndb:mt-0.5 ndb:flex ndb:min-w-0 ndb:flex-wrap ndb:items-baseline ndb:gap-x-2 ndb:text-xs ndb:font-medium ndb:text-zinc-400">
            <span data-ndb-livewire-component-property-count="">
              {state.livewireComponentPropertyCountLabel(component)}
            </span>
            <span hidden={!searchContext}>Parent component</span>
          </span>
        </span>
        <span
          hidden={component.status === 'idle'}
          className={cx(
            'ndb:text-xs ndb:font-bold',
            component.status === 'failed'
              ? 'ndb:text-red-600 ndb:dark:text-red-300'
              : component.status === 'updating'
                ? 'ndb:text-indigo-600 ndb:dark:text-indigo-300'
                : 'ndb:text-zinc-400',
          )}
        >
          {component.status === 'stale' ? 'Server only' : component.status}
        </span>
      </button>
    </div>
  );
}

/** Mounted components as a collapsible parent/child tree. */
export function LivewireComponentList({ state }) {
  const components = state.filteredLivewireComponents;

  return (
    <>
      <div
        data-ndb-livewire-component-list=""
        className="ndb:divide-y ndb:divide-zinc-200/80 ndb:dark:divide-zinc-800"
      >
        {components.map((component) => (
          <LivewireComponentRow key={component.id} state={state} component={component} />
        ))}
      </div>

      <div hidden={components.length !== 0} className="ndb:p-3">
        <EmptyState label="No mounted components match this search." />
      </div>
    </>
  );
}
