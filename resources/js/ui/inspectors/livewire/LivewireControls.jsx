import { useState } from 'react';
import { FilterTab } from '../../components/FilterTab.jsx';
import { FilterTabs } from '../../components/FilterTabs.jsx';
import { InspectorListControls } from '../../components/InspectorListControls.jsx';
import { SearchField } from '../../components/SearchField.jsx';
import { SelectField } from '../../components/SelectField.jsx';

const activityTypeLabel = (type) =>
  String(type)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

/**
 * Mirrors a store-backed input value in React state so typing updates the input synchronously,
 * while resets from the store (switching views) still replace it.
 */
function useMirroredValue(value, write) {
  const [local, setLocal] = useState(value);
  const [seen, setSeen] = useState(value);

  if (value !== seen) {
    setSeen(value);
    setLocal(value);
  }

  return [
    local,
    (next) => {
      setLocal(next);
      write(next);
    },
  ];
}

/** View tabs plus the search and type filter for the active Livewire view. */
export function LivewireControls({ state }) {
  const tab = state.livewireTab;
  const [search, setSearch] = useMirroredValue(state.livewireSearch, (value) => {
    state.livewireSearch = value;
    state.syncLivewireSelection();
  });
  const searchField = (label, placeholder) => (
    <SearchField
      label={label}
      placeholder={placeholder}
      data-ndb-livewire-search=""
      value={search}
      onChange={(event) => setSearch(event.target.value)}
    />
  );

  return (
    <div>
      <FilterTabs label="Livewire view" variant="segmented" className="ndb:w-full">
        <FilterTab
          variant="segmented"
          data-ndb-livewire-tab="activity"
          onClick={() => state.setLivewireTab('activity')}
          aria-pressed={tab === 'activity'}
        >
          <span>Activity</span>
          <span className="ndb:text-xs ndb:font-bold ndb:tabular-nums ndb:opacity-65">
            {state.livewireActivity.length}
          </span>
        </FilterTab>
        <FilterTab
          variant="segmented"
          data-ndb-livewire-tab="components"
          onClick={() => state.setLivewireTab('components')}
          aria-pressed={tab === 'components'}
        >
          <span>Components</span>
          <span className="ndb:text-xs ndb:font-bold ndb:tabular-nums ndb:opacity-65">
            {state.livewireComponents.length}
          </span>
        </FilterTab>
      </FilterTabs>

      <div className="ndb:mt-3">
        {tab === 'activity' ? (
          <InspectorListControls
            showSearch
            search={searchField('Search Livewire activity', 'Search activity')}
            filter={
              <SelectField
                label="Filter Livewire activity"
                data-ndb-livewire-type=""
                value={state.livewireActivityType}
                onChange={(event) => state.setLivewireActivityType(event.target.value)}
              >
                <option value="all">All activity</option>
                {state.livewireActivityTypes.map((type) => (
                  <option key={type} value={type}>
                    {activityTypeLabel(type)}
                  </option>
                ))}
              </SelectField>
            }
          />
        ) : (
          <InspectorListControls
            showSearch
            search={searchField('Search mounted components', 'Search components')}
          />
        )}
      </div>
    </div>
  );
}
