import { createRoot } from 'react-dom/client';
import { createNewDebugBar } from '../state.js';
import { createApi } from './api.js';
import { ShellContext, scopeData } from './hooks.js';
import { attachMagics, createStore, nextTick } from './store.js';
import { createWire } from './wire.js';
import { DebugBar } from '../ui/DebugBar.jsx';

const MOUNT_ID = 'newdebugbar-mount';
const BOOT_ID = 'newdebugbar-boot';

let mounted = null;

const readBoot = () => {
  try {
    return JSON.parse(document.getElementById(BOOT_ID)?.textContent ?? 'null');
  } catch {
    return null;
  }
};

/** Mounts the bar into the injected container; host page navigation can replace it with a new one. */
export function mountNewDebugBar({ livewireTrace = null } = {}) {
  const container = document.getElementById(MOUNT_ID);
  if (!container || container === mounted?.container) return;

  const boot = readBoot();
  if (!boot?.summary?.id) return;

  unmountNewDebugBar();

  const api = createApi(boot.api);
  const target = createNewDebugBar(boot.summary, null, [], boot.profile_limit ?? 20, livewireTrace);
  target.inspectorData = null;
  const store = createStore(target);
  attachMagics(target, {
    wire: createWire({
      api,
      shell: () => store.state,
      dispatch: (event) => window.dispatchEvent(event),
      nextTick,
    }),
  });

  const root = createRoot(container);
  root.render(
    <ShellContext.Provider value={{ store, api }}>
      <DebugBar />
    </ShellContext.Provider>,
  );
  mounted = { container, root, store };
}

export function unmountNewDebugBar() {
  if (!mounted) return;

  const previous = mounted;
  mounted = null;

  try {
    previous.root.unmount();
  } catch {
    // A replaced page may already have removed the container.
  }
}

/** The state behind an element inside the bar, for tests and the request-discovery bridge. */
window.newDebugBarData = (element) => scopeData(element ?? document.getElementById('newdebugbar'));
