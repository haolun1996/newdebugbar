import { useCallback, useEffect, useState } from 'react';
import { registerScope, useShell, useStore } from '../../app/hooks.js';
import { attachMagics, createStore } from '../../app/store.js';
import { createLivewireInspector } from '../../inspectors/livewire/controller.js';
import { installLivewireTrace } from '../../livewire-trace.js';
import { defaultRuntime } from '../../runtime.js';
import { InspectorDetailBack } from '../components/InspectorDetailBack.jsx';
import { InspectorDetailEmpty } from '../components/InspectorDetailEmpty.jsx';
import { InspectorDetailPane } from '../components/InspectorDetailPane.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { LivewireActivityDetail } from './livewire/LivewireActivityDetail.jsx';
import { LivewireActivityList } from './livewire/LivewireActivityList.jsx';
import { LivewireComponentDetail } from './livewire/LivewireComponentDetail.jsx';
import { LivewireComponentList } from './livewire/LivewireComponentList.jsx';
import { LivewireControls } from './livewire/LivewireControls.jsx';

/**
 * Current-page Livewire activity and mounted host components in one shared workspace.
 * The state model lives in `inspectors/livewire/*.js`; it follows the host page's Livewire through the trace.
 */
export function LivewireInspector({ inspector, profileId }) {
  const shell = useShell();
  const [store] = useState(() =>
    createStore(
      attachMagics(
        createLivewireInspector({
          browser: defaultRuntime(),
          trace: installLivewireTrace(),
          shell,
          profileId,
        }),
      ),
    ),
  );
  const state = useStore(store);
  const payload = inspector.payload;

  const rootRef = useCallback(
    (element) => {
      if (!element) return;
      state.$root = element;
      registerScope(element, state);
    },
    [state],
  );

  useEffect(() => {
    state.$livewirePayload = payload ?? { components: [], activity_records: [] };
    state.refresh();
  }, [state, payload]);

  useEffect(() => {
    state.init();

    return () => state.destroy();
  }, [state]);

  const tab = state.livewireTab;
  const dropped = state.livewireTrace.dropped ?? {};
  const droppedCount = (dropped.components ?? 0) + (dropped.activity ?? 0);
  const filteredActivity = tab === 'activity' ? state.filteredLivewireActivity : [];
  const selectedActivity = tab === 'activity' ? state.selectedLivewireActivity : null;
  const matchingComponents = tab === 'components' ? state.matchingLivewireComponents : [];
  const selectedComponent = tab === 'components' ? state.selectedLivewireComponent : null;
  const closeDetail = () => {
    state.livewireDetailOpen = false;
  };

  return (
    <div
      data-ndb-livewire=""
      ref={rootRef}
      className="ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col"
    >
      <div
        hidden={!(droppedCount > 0)}
        role="status"
        className="ndb:mb-3 ndb:rounded-lg ndb:border ndb:border-amber-200 ndb:bg-amber-50/60 ndb:px-3 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:text-amber-800 ndb:sm:mb-4 ndb:dark:border-amber-950 ndb:dark:bg-amber-950/25 ndb:dark:text-amber-300"
      >
        Capture limit reached. <span>{dropped.activity}</span> activity records and{' '}
        <span>{dropped.components}</span> component records were omitted.
      </div>

      <InspectorWorkspace
        frame="top"
        data-ndb-livewire-workspace=""
        className="ndb:border-l-0 ndb:p-0 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white"
      >
        <InspectorListPanel
          detailOpen={state.livewireDetailOpen}
          controls={<LivewireControls state={state} />}
          list={
            tab === 'activity' ? (
              <div data-ndb-livewire-activity="">
                <LivewireActivityList state={state} items={filteredActivity} />
              </div>
            ) : (
              <div data-ndb-livewire-components="">
                <LivewireComponentList state={state} />
              </div>
            )
          }
          listProps={{ 'data-ndb-livewire-list': '', className: 'ndb:divide-y-0 ndb:p-0' }}
        />

        <InspectorDetailPane
          detailOpen={state.livewireDetailOpen}
          detailLabel="Selected Livewire details"
          backLabel="Livewire"
          onClose={closeDetail}
          id="newdebugbar-livewire-detail"
          data-ndb-livewire-detail-pane=""
          className="ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white"
          back={
            <InspectorDetailBack
              data-ndb-livewire-detail-back=""
              onClick={closeDetail}
              label="Livewire"
              className="ndb:bg-transparent"
            />
          }
        >
          {tab === 'activity' ? (
            <div className="ndb:flex ndb:min-h-0 ndb:flex-1 ndb:flex-col">
              {selectedActivity ? <LivewireActivityDetail state={state} item={selectedActivity} /> : null}

              <InspectorDetailEmpty
                data-ndb-livewire-activity-detail-empty="selection"
                label="Choose an interaction to inspect what changed."
                hidden={!(!selectedActivity && filteredActivity.length > 0)}
                className="ndb:flex-1"
              />
              <InspectorDetailEmpty
                data-ndb-livewire-activity-detail-empty="filter"
                label="No activity matches this view."
                hidden={filteredActivity.length !== 0}
                className="ndb:flex-1"
              />
            </div>
          ) : (
            <div className="ndb:flex ndb:min-h-0 ndb:flex-1 ndb:flex-col">
              {selectedComponent ? (
                <LivewireComponentDetail state={state} component={selectedComponent} />
              ) : null}

              <InspectorDetailEmpty
                data-ndb-livewire-component-detail-empty="selection"
                label="Choose a mounted component to inspect its state."
                hidden={!(!selectedComponent && matchingComponents.length > 0)}
                className="ndb:flex-1"
              />
              <InspectorDetailEmpty
                data-ndb-livewire-component-detail-empty="filter"
                label="No components match this search."
                hidden={matchingComponents.length !== 0}
                className="ndb:flex-1"
              />
            </div>
          )}
        </InspectorDetailPane>
      </InspectorWorkspace>
    </div>
  );
}
