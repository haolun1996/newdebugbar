const MAX_COMPONENTS = 200;
const MAX_ACTIVITY = 500;
const MAX_VALUE_DEPTH = 5;
const MAX_VALUE_ITEMS = 100;
const PROFILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const primitive = (value) =>
  value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string';

const humanize = (value = '') =>
  String(value)
    .replace(/^\$/, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();

const valueType = (value) => {
  if (value === null) return 'Null';
  if (Array.isArray(value)) return 'Array';
  if (value instanceof Date) return 'Date';
  if (typeof value === 'boolean') return 'Boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'Integer' : 'Float';
  if (typeof value === 'string') return 'String';

  return 'Object';
};

const cloneValue = (value, depth = 0, seen = new WeakSet()) => {
  if (primitive(value)) return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_VALUE_DEPTH) return '[maximum depth reached]';
  if (typeof value !== 'object') return `[${typeof value}]`;
  if (seen.has(value)) return '[circular]';

  seen.add(value);
  const entries = Array.isArray(value)
    ? value.slice(0, MAX_VALUE_ITEMS).map((item, index) => [index, item])
    : Object.entries(value).slice(0, MAX_VALUE_ITEMS);
  const copy = Array.isArray(value) ? [] : {};

  entries.forEach(([key, item]) => {
    copy[key] = cloneValue(item, depth + 1, seen);
  });

  if (Object.keys(value).length > MAX_VALUE_ITEMS) {
    copy.__truncated__ = Object.keys(value).length - MAX_VALUE_ITEMS;
  }

  seen.delete(value);

  return copy;
};

const getPath = (value, path) =>
  String(path)
    .split('.')
    .reduce((current, segment) => current?.[segment], value);

const sameValue = (left, right) => JSON.stringify(cloneValue(left)) === JSON.stringify(cloneValue(right));

const componentName = (component) => component?.name ?? component?.snapshot?.memo?.name ?? 'livewire-component';

// Ignore anything rendered inside the bar itself; every other Livewire component belongs to the host.
const isHostComponent = (component) => Boolean(component) && !component.el?.closest?.('#newdebugbar');

const errorMessage = (error, fallback = 'The Livewire update failed.') => {
  const validation = error?.errors;

  if (validation && typeof validation === 'object') {
    const first = Object.values(validation)
      .flat()
      .find((message) => typeof message === 'string');
    if (first) return first;
  }

  return typeof error?.message === 'string' && error.message !== '' ? error.message : fallback;
};

export function createLivewireTrace(runtime = globalThis) {
  const components = new Map();
  const instances = new Map();
  const activity = new Map();
  const serverComponents = new Map();
  const messageActivity = new WeakMap();
  const subscribers = new Set();
  const cleanupCallbacks = [];
  let componentSequence = 0;
  let activitySequence = 0;
  let droppedComponents = 0;
  let droppedActivity = 0;
  let installedLivewire = null;
  let pageSequence = 1;

  const now = () => Math.round((runtime.performance?.now?.() ?? Date.now()) * 1000) / 1000;
  const wallNow = () => runtime.Date?.now?.() ?? Date.now();

  const snapshotComponent = (component, previous = {}) => {
    const name = componentName(component);
    const state = component?.reactive ?? component?.canonical ?? {};
    const canonical = component?.canonical ?? {};
    const parentElement = component?.el?.parentElement?.closest?.('[wire\\:id]');
    const parent = parentElement?.__livewire;

    return {
      id: String(component.id),
      name,
      title: humanize(name.split('.').at(-1)),
      parentId: isHostComponent(parent) ? String(parent.id) : null,
      sequence: previous.sequence ?? ++componentSequence,
      mounted: true,
      status: previous.status === 'failed' ? 'failed' : 'idle',
      latestActivityId: previous.latestActivityId ?? null,
      properties: Object.entries(state).map(([path, value]) => ({
        path,
        type: valueType(value),
        value: cloneValue(value),
      })),
      serverProperties: Object.entries(canonical).map(([path, value]) => ({
        path,
        type: valueType(value),
        value: cloneValue(value),
      })),
    };
  };

  const publicSnapshot = () => ({
    ready: installedLivewire !== null,
    pageSequence,
    components: [...components.values()].map((component) => cloneValue(component)),
    activity: [...activity.values()].map((item) => cloneValue(item)),
    dropped: { components: droppedComponents, activity: droppedActivity },
  });

  const notify = () => {
    const snapshot = publicSnapshot();
    subscribers.forEach((subscriber) => {
      try {
        subscriber(snapshot);
      } catch {
        /* Debug UI subscribers cannot affect the host app. */
      }
    });
  };

  const upsertComponent = (component, status = null) => {
    if (!isHostComponent(component) || !component.id) return null;

    const id = String(component.id);
    const previous = components.get(id);

    if (!previous && components.size >= MAX_COMPONENTS) {
      droppedComponents++;
      notify();

      return null;
    }

    instances.set(id, component);
    const next = snapshotComponent(component, previous);
    if (status) next.status = status;
    components.set(id, next);

    return next;
  };

  const updateActivity = (id, changes) => {
    const current = activity.get(id);
    if (!current) return;

    activity.set(id, { ...current, ...changes });
    const component = components.get(current.componentId);
    if (component) {
      components.set(current.componentId, {
        ...component,
        status: changes.componentStatus ?? component.status,
        latestActivityId: id,
      });
    }
    notify();
  };

  const addActivity = (component, values) => {
    if (activity.size >= MAX_ACTIVITY) {
      droppedActivity++;
      notify();

      return null;
    }

    const currentComponent = upsertComponent(component, values.componentStatus ?? 'updating');
    if (!currentComponent) return null;

    const id = `${component.id}-browser-${++activitySequence}`;
    const item = {
      id,
      sequence: activitySequence,
      componentId: String(component.id),
      componentName: currentComponent.name,
      componentTitle: currentComponent.title,
      title: values.title,
      kind: values.kind,
      status: values.status ?? 'updating',
      occurredAt: wallNow(),
      startedAt: now(),
      finishedAt: null,
      durationMs: null,
      profileIds: [],
      actions: values.actions ?? [],
      changes: values.changes ?? [],
      events: values.events ?? [],
      effects: {},
      phases: [{ name: 'Queued', at: now(), status: 'complete' }],
      error: null,
    };
    activity.set(id, item);
    components.set(currentComponent.id, {
      ...currentComponent,
      latestActivityId: id,
    });
    notify();

    return id;
  };

  const finishActivity = (id, status = 'complete', changes = {}) => {
    const item = activity.get(id);
    if (!item) return;

    const finishedAt = now();
    updateActivity(id, {
      ...changes,
      status,
      finishedAt,
      durationMs: Math.max(0, Math.round((finishedAt - item.startedAt) * 1000) / 1000),
      componentStatus: status === 'failed' ? 'failed' : 'idle',
    });
  };

  const phase = (id, name, changes = {}) => {
    const item = activity.get(id);
    if (!item) return;
    const phaseAt = now();
    const durationMs =
      item.finishedAt === null
        ? item.durationMs
        : Math.max(item.durationMs ?? 0, Math.round((phaseAt - item.startedAt) * 1000) / 1000);
    updateActivity(id, {
      ...changes,
      durationMs,
      phases: [...item.phases, { name, at: phaseAt, status: 'complete' }],
    });
  };

  const actionDetails = (message) =>
    [...(message.actions ?? [])].map((action) => ({
      name: action.name,
      params: cloneValue(action.params ?? []),
      metadata: cloneValue(action.metadata ?? {}),
    }));

  const updateDetails = (message) =>
    Object.entries(message.updates ?? {}).map(([path, submitted]) => ({
      path,
      submitted: cloneValue(submitted),
      before: cloneValue(getPath(message.component?.canonical ?? {}, path)),
      server: null,
      serverKnown: false,
    }));

  const activityCause = (actions, changes) => {
    if (actions.some((action) => action.metadata?.type === 'poll')) return 'poll';
    if (actions.some((action) => action.name === '__dispatch')) return 'event';
    if (changes.length > 0 || actions.some((action) => action.name === '$set')) return 'mutation';

    return 'action';
  };

  const activityTitle = (actions, changes, cause) => {
    if (cause === 'poll') return 'Polled component';
    if (cause === 'event')
      return `${humanize(actions.find((action) => action.name === '__dispatch')?.params?.[0])} received`;
    if (changes.length === 1) return `${humanize(changes[0].path)} changed`;
    if (changes.length > 1) return `${changes.length} properties changed`;

    const meaningful = actions.filter((action) => !['$commit', '$set'].includes(action.name));
    if (meaningful.length === 1) return `${humanize(meaningful[0].name)} ran`;
    if (meaningful.length > 1) return `${meaningful.length} actions ran`;

    return 'Component updated';
  };

  const correlateRecipient = (id, actions) => {
    const receiver = activity.get(id);
    const eventName = actions.find((action) => action.name === '__dispatch')?.params?.[0];
    if (!receiver || !eventName) return;

    const source = [...activity.values()]
      .reverse()
      .find((item) =>
        item.events.some(
          (event) => event.name === eventName && !event.observedRecipientIds.includes(receiver.componentId),
        ),
      );
    if (!source) return;

    updateActivity(source.id, {
      events: source.events.map((event) =>
        event.name === eventName
          ? {
              ...event,
              observedRecipientIds: [...event.observedRecipientIds, receiver.componentId],
            }
          : event,
      ),
    });
  };

  const captureMessage = ({
    message,
    onSend,
    onCancel,
    onFailure,
    onError,
    onStream,
    onSuccess,
    onSkipped,
    onFinish,
  }) => {
    if (!isHostComponent(message.component)) return;

    const validationBefore = cloneValue(message.component?.snapshot?.memo?.errors ?? {});
    const actions = actionDetails(message);
    const changes = updateDetails(message);
    const cause = activityCause(actions, changes);
    const id = addActivity(message.component, {
      title: activityTitle(actions, changes, cause),
      kind: cause,
      actions,
      changes,
    });
    if (!id) return;

    messageActivity.set(message, id);
    correlateRecipient(id, actions);

    onSend(() => phase(id, 'Sent', { status: 'updating' }));
    onCancel(() => finishActivity(id, 'cancelled'));
    onFailure(({ error }) => finishActivity(id, 'failed', { error: errorMessage(error) }));
    onError(({ response }) =>
      finishActivity(id, 'failed', {
        error: `Livewire returned HTTP ${response?.status ?? 'error'}.`,
      }),
    );
    onStream(() => phase(id, 'Streamed'));
    onSkipped(() => finishActivity(id, 'skipped'));
    onSuccess(({ payload, onSync, onEffect, onMorph, onRender }) => {
      const returnedValidationErrors = (payload?.effects?.returnsMeta ?? [])
        .map((metadata) => metadata?.errors)
        .find((errors) => errors && typeof errors === 'object');
      const memoValidationErrors = payload?.snapshot?.memo?.errors;
      const validationErrors =
        returnedValidationErrors ??
        (memoValidationErrors &&
        Object.keys(memoValidationErrors).length > 0 &&
        !sameValue(memoValidationErrors, validationBefore)
          ? memoValidationErrors
          : null);
      if (validationErrors) {
        updateActivity(id, {
          status: 'failed_validation',
          error: errorMessage({ errors: validationErrors }, 'Livewire validation failed.'),
        });
      }
      phase(id, 'Responded');
      onSync(() => {
        const refreshed = upsertComponent(message.component, 'updating');
        const item = activity.get(id);
        phase(id, 'Synced', {
          changes: (item?.changes ?? []).map((change) => ({
            ...change,
            server: cloneValue(getPath(message.component?.canonical ?? {}, change.path)),
            serverKnown: true,
          })),
        });
        if (refreshed) notify();
      });
      onEffect(() => {
        const effects = cloneValue(payload?.effects ?? {});
        const events = (payload?.effects?.dispatches ?? []).map((event) => ({
          name: event.name,
          params: cloneValue(event.params ?? {}),
          mode: event.component ? 'component' : event.self ? 'self' : 'bubble',
          declaredTarget: event.component ?? event.ref ?? event.el ?? null,
          observedRecipientIds: [],
        }));
        phase(id, 'Effects', { effects, events });
      });
      onMorph(() => phase(id, 'Morphed'));
      onRender(() => phase(id, 'Rendered'));
    });
    onFinish(() => {
      const current = activity.get(id);
      const status = current?.status;
      if (!['failed', 'failed_validation', 'cancelled', 'skipped'].includes(status)) {
        finishActivity(id);
      } else if (current?.finishedAt === null) {
        finishActivity(id, status);
      }
      upsertComponent(message.component, ['failed', 'failed_validation'].includes(status) ? 'failed' : 'idle');
      notify();
    });
  };

  const captureRequest = ({ request, onResponse }) => {
    onResponse(({ response }) => {
      const profileId = response?.headers?.get?.('X-NewDebugBar-Profile');
      if (!PROFILE_PATTERN.test(profileId ?? '')) return;

      [...(request.messages ?? [])].forEach((message) => {
        const id = messageActivity.get(message);
        const item = activity.get(id);
        if (item && !item.profileIds.includes(profileId)) {
          updateActivity(id, { profileIds: [...item.profileIds, profileId] });
        }
      });
    });
  };

  const registerComponent = (component, cleanup = null) => {
    const record = upsertComponent(component);
    if (!record) return;

    addActivity(component, {
      title: `${record.title} mounted`,
      kind: 'mount',
      status: 'complete',
      componentStatus: 'idle',
    });
    cleanup?.(() => {
      if (!components.has(record.id)) return;
      const current = components.get(record.id);
      components.delete(record.id);
      instances.delete(record.id);
      const id = addActivity(component, {
        title: `${record.title} unmounted`,
        kind: 'unmount',
        status: 'complete',
        componentStatus: 'idle',
      });
      if (id) {
        components.delete(record.id);
        activity.set(id, { ...activity.get(id), mounted: false });
      }
      if (current) notify();
    });
    notify();
  };

  const resetPage = () => {
    pageSequence++;
    components.clear();
    instances.clear();
    activity.clear();
    serverComponents.clear();
    droppedComponents = 0;
    droppedActivity = 0;
    notify();
  };

  const install = (Livewire) => {
    if (!Livewire || installedLivewire === Livewire) return;
    installedLivewire = Livewire;
    cleanupCallbacks.push(
      Livewire.hook?.('component.init', ({ component, cleanup }) => {
        registerComponent(component, cleanup);
      }),
    );
    cleanupCallbacks.push(Livewire.interceptMessage?.(captureMessage));
    cleanupCallbacks.push(Livewire.interceptRequest?.(captureRequest));
    (Livewire.all?.() ?? []).forEach((component) => {
      if (!instances.has(String(component.id))) registerComponent(component);
    });
    notify();
  };

  const mergeServerComponents = (descriptors = []) => {
    descriptors.forEach((descriptor) => {
      if (descriptor?.id) serverComponents.set(String(descriptor.id), cloneValue(descriptor));
    });
  };

  const mutationDescriptor = (componentId, path) => {
    const root = String(path).split('.')[0];
    return (serverComponents.get(String(componentId))?.properties ?? []).find((descriptor) => descriptor.path === root);
  };

  const applyMutation = async ({ componentId, path, baseline, value }) => {
    const id = String(componentId);
    const component = instances.get(id);
    const descriptor = mutationDescriptor(id, path);
    const nested = String(path).includes('.');

    if (!component || !components.has(id)) throw new Error('This component is no longer mounted.');
    if (!descriptor?.write_allowed || (nested ? !descriptor.array_leaf_writable : !descriptor.writable)) {
      throw new Error('This property is read only.');
    }
    const current = getPath(component.reactive ?? component.canonical ?? {}, path);
    if (!primitive(current)) throw new Error('Only primitive property values can be changed.');
    if (!sameValue(current, baseline))
      throw new Error('The property changed. Reload its current value before applying.');

    upsertComponent(component, 'updating');
    notify();

    try {
      await component.$wire.$set(path, value, true);
      upsertComponent(component, 'idle');
      notify();

      return cloneValue(getPath(component.reactive ?? component.canonical ?? {}, path));
    } catch (error) {
      upsertComponent(component, 'failed');
      notify();
      throw new Error(errorMessage(error));
    }
  };

  return {
    install,
    resetPage,
    mergeServerComponents,
    applyMutation,
    snapshot: publicSnapshot,
    subscribe(callback) {
      subscribers.add(callback);
      try {
        callback(publicSnapshot());
      } catch {
        /* Debug UI subscribers cannot affect the host app. */
      }

      return () => subscribers.delete(callback);
    },
    destroy() {
      cleanupCallbacks.filter((cleanup) => typeof cleanup === 'function').forEach((cleanup) => cleanup());
      cleanupCallbacks.length = 0;
      subscribers.clear();
      installedLivewire = null;
    },
  };
}

export function installLivewireTrace(browser = window) {
  if (browser.newDebugBarLivewireTrace) return browser.newDebugBarLivewireTrace;

  const trace = createLivewireTrace(browser);
  browser.newDebugBarLivewireTrace = trace;
  const install = () => trace.install(browser.Livewire);
  browser.addEventListener?.('livewire:init', install);
  browser.addEventListener?.('livewire:navigate', () => trace.resetPage());
  install();

  return trace;
}

export { cloneValue, humanize, primitive, valueType };
