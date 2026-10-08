import { composeState } from '../../runtime.js';
import { formatDuration } from '../../duration.js';
import { createActivity } from './activity.js';
import { createComponents } from './components.js';
import { createProperties } from './properties.js';

/**
 * Owns Livewire inspector state and interactions. The React view hands over the loaded inspector payload as
 * `$livewirePayload` (non-reactive) and the shell refreshes it through `refresh()`.
 */
export function createController(context) {
  const { browser, trace } = context;
  return composeState(createActivity(context), createComponents(context), createProperties(context), {
    $livewirePayload: null,
    formatDuration,

    refresh() {
      this.initialized = true;
      if (this.$livewirePayload) this.mergeLivewireServer(this.$livewirePayload);
    },
    activate() {
      if (this.stopLivewireTrace || this.destroyed) return;
      this.stopLivewireTrace =
        trace?.subscribe?.((snapshot) => {
          if (
            this.livewireTrace.pageSequence !== undefined &&
            snapshot.pageSequence !== this.livewireTrace.pageSequence
          ) {
            this.livewireSelectedActivityId = null;
            this.livewireSelectedComponentId = null;
            this.livewireActivitySelectionPinned = false;
            this.livewireCollapsedComponents = [];
            this.livewireKnownComponentParents = [];
          }
          this.livewireTrace = snapshot;
          this.syncLivewireSelection();
        }) ?? null;
      this.livewireClockRunning = true;
      this.scheduleLivewireClock();
    },
    deactivate() {
      this.stopLivewireTrace?.();
      this.stopLivewireTrace = null;
      this.livewireClockRunning = false;
      browser.cancelSchedule?.(this.livewireClockTimer);
      this.livewireClockTimer = null;
      this.closeLivewireDrafts();
    },

    livewireTab: 'activity',
    livewireSearch: '',
    livewireDetailTab: 'properties',
    livewireDetailOpen: false,
    livewireTrace: {
      ready: false,
      components: [],
      activity: [],
      dropped: { components: 0, activity: 0 },
    },

    livewireServerComponents: [],
    stopLivewireTrace: null,

    mergeLivewireServer(payload = {}) {
      this.initialized = true;
      const byId = new Map(
        this.livewireServerComponents.map((component) => [String(component.id), component]),
      );
      (payload.components ?? []).forEach((component) => {
        if (component?.id) byId.set(String(component.id), component);
      });
      this.livewireServerComponents = [...byId.values()];
      this.livewireServerActivity = Array.isArray(payload.activity_records) ? payload.activity_records : [];
      trace?.mergeServerComponents?.(payload.components ?? []);
      this.syncLivewireSelection();
    },

    syncLivewireSelection() {
      this.syncLivewireComponentCollapseState();

      const visibleActivity = this.filteredLivewireActivity;
      const selectedActivityIsVisible = visibleActivity.some(
        (item) => item.id === this.livewireSelectedActivityId,
      );
      const defaultActivityId = visibleActivity[0]?.id ?? null;

      if (!this.livewireActivitySelectionPinned) {
        this.livewireSelectedActivityId = defaultActivityId;
      } else if (!selectedActivityIsVisible) {
        this.livewireSelectedActivityId = defaultActivityId;
      }

      const search = this.livewireSearch.toLowerCase().trim();
      const selectableComponents = search === '' ? this.livewireComponents : this.matchingLivewireComponents;
      if (!selectableComponents.some((component) => component.id === this.livewireSelectedComponentId)) {
        this.closeLivewireDrafts();
        this.livewireSelectedComponentId = selectableComponents[0]?.id ?? null;
      }
    },

    setLivewireTab(tab) {
      if (!['activity', 'components'].includes(tab)) return;
      this.closeLivewireDrafts();
      this.livewireTab = tab;
      this.livewireDetailTab = 'properties';
      this.livewireDetailOpen = false;
      this.livewireSearch = '';
      this.syncLivewireSelection();
    },

    setLivewireDetailTab(tab) {
      if (this.livewireTab !== 'components' || !['properties', 'source'].includes(tab)) return;

      this.livewireDetailTab = tab;
    },
  });
}

/**
 * A mounted Livewire inspector: the controller plus its shell lifecycle. `init()` registers it with the shell,
 * which activates it while the Livewire inspector is visible; `destroy()` detaches it for good.
 */
export function createLivewireInspector(context) {
  const { shell, profileId } = context;
  const controller = createController(context);
  const instance = Symbol('livewire');

  return composeState(controller, {
    profileId,
    initialized: false,
    destroyed: false,
    init() {
      shell.mountInspector('livewire', profileId, this, instance);
    },
    destroy() {
      this.destroyed = true;
      this.deactivate();
      shell.unmountInspector(instance);
    },
    refresh() {
      if (this.destroyed || profileId !== shell.summary.id) return;
      controller.refresh.call(this);
    },
  });
}
