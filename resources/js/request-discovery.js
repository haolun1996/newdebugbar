const PROFILE_HEADER = 'X-NewDebugBar-Profile';
const PROFILE_EVENT = 'newdebugbar-profile-discovered';
const PROFILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const XHR_URL = Symbol('newDebugBarUrl');
const XHR_LIVEWIRE_NAVIGATE = Symbol('newDebugBarLivewireNavigate');
const XHR_INERTIA = Symbol('newDebugBarInertia');
const XHR_INERTIA_PARTIAL = Symbol('newDebugBarInertiaPartial');

const header = (headers, name) => {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);

  if (Array.isArray(headers)) {
    return headers.find(([key]) => String(key).toLowerCase() === name.toLowerCase())?.[1] ?? null;
  }

  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : null;
};

const requestFacts = (runtime, input, init = {}) => {
  try {
    const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    const url = new URL(rawUrl, runtime.location.href);
    const livewireNavigate = header(init?.headers, 'X-Livewire-Navigate')
      ?? header(input?.headers, 'X-Livewire-Navigate');
    const inertia = header(init?.headers, 'X-Inertia')
      ?? header(input?.headers, 'X-Inertia');
    const inertiaPartial = header(init?.headers, 'X-Inertia-Partial-Component')
      ?? header(input?.headers, 'X-Inertia-Partial-Component');

    return {
      eligible: url.origin === runtime.location.origin
        && !url.pathname.startsWith('/__newdebugbar/'),
      foreground: inertia !== null && inertiaPartial === null,
      livewireNavigate: livewireNavigate !== null,
      url,
    };
  } catch {
    return { eligible: false, foreground: false, livewireNavigate: false, url: null };
  }
};

const notify = (runtime, response, transport, facts) => {
  try {
    if (!facts.eligible) return;
    if (facts.livewireNavigate) return;

    const responseUrl = response?.url ? new URL(response.url, runtime.location.href) : facts.url;
    if (!responseUrl || responseUrl.origin !== runtime.location.origin) return;

    const profileId = response.headers?.get?.(PROFILE_HEADER);
    if (!PROFILE_PATTERN.test(profileId ?? '')) return;

    runtime.dispatchEvent(new runtime.CustomEvent(PROFILE_EVENT, {
      detail: {
        profileId,
        transport,
        foreground: facts.foreground,
      },
    }));
  } catch {
    // Request discovery must never change host request behavior.
  }
};

const notifyAfterHostUpdate = (runtime, response, transport, facts) => {
  const notifyProfile = () => notify(runtime, response, transport, facts);

  if (typeof runtime.setTimeout === 'function') {
    runtime.setTimeout(notifyProfile, 0);
    return;
  }

  notifyProfile();
};

export function installProfileDiscoveryBridge(runtime = window) {
  if (runtime.__newDebugBarProfileDiscoveryBridge) return;
  runtime.__newDebugBarProfileDiscoveryBridge = true;

  runtime.addEventListener?.(PROFILE_EVENT, (event) => {
    try {
      const profileId = event.detail?.profileId;
      if (!PROFILE_PATTERN.test(profileId ?? '')) return;

      const root = runtime.document?.getElementById?.('newdebugbar');
      const state = root ? runtime.newDebugBarData?.(root) : null;

      state?.noticeProfile?.(profileId, event.detail?.foreground === true);
    } catch {
      // A stale or unavailable toolbar must never affect the host request.
    }
  });
}

export function installRequestDiscovery(runtime = window) {
  if (runtime.__newDebugBarRequestDiscovery) return;
  runtime.__newDebugBarRequestDiscovery = true;

  if (typeof runtime.fetch === 'function') {
    const originalFetch = runtime.fetch;
    runtime.fetch = function newDebugBarFetch(input, init) {
      const facts = requestFacts(runtime, input, init);

      return originalFetch.apply(this, arguments).then((response) => {
        notifyAfterHostUpdate(runtime, response, 'fetch', facts);
        return response;
      });
    };
  }

  const prototype = runtime.XMLHttpRequest?.prototype;
  if (!prototype?.open || !prototype?.send || !prototype?.setRequestHeader) return;

  const originalOpen = prototype.open;
  const originalSend = prototype.send;
  const originalSetRequestHeader = prototype.setRequestHeader;

  prototype.open = function newDebugBarOpen(_method, url) {
    this[XHR_URL] = url;
    this[XHR_LIVEWIRE_NAVIGATE] = false;
    this[XHR_INERTIA] = false;
    this[XHR_INERTIA_PARTIAL] = false;
    return originalOpen.apply(this, arguments);
  };

  prototype.setRequestHeader = function newDebugBarSetRequestHeader(name) {
    const normalized = String(name).toLowerCase();
    if (normalized === 'x-livewire-navigate') this[XHR_LIVEWIRE_NAVIGATE] = true;
    if (normalized === 'x-inertia') this[XHR_INERTIA] = true;
    if (normalized === 'x-inertia-partial-component') this[XHR_INERTIA_PARTIAL] = true;
    return originalSetRequestHeader.apply(this, arguments);
  };

  prototype.send = function newDebugBarSend() {
    const facts = requestFacts(runtime, this[XHR_URL]);
    facts.livewireNavigate = this[XHR_LIVEWIRE_NAVIGATE];
    facts.foreground = this[XHR_INERTIA] && !this[XHR_INERTIA_PARTIAL];
    this.addEventListener?.('loadend', () => notifyAfterHostUpdate(runtime, {
      url: this.responseURL,
      headers: { get: (name) => this.getResponseHeader?.(name) },
    }, 'xhr', facts), { once: true });

    return originalSend.apply(this, arguments);
  };
}
