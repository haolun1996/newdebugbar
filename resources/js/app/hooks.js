import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';

/** The shell store, its reactive state, and the API client. */
export const ShellContext = createContext(null);

const scopes = new WeakMap();

/** Lets browser tests and the request-discovery bridge reach the state behind an element. */
export function registerScope(element, state) {
  if (element) scopes.set(element, state);
}

export function scopeData(element) {
  for (let current = element; current; current = current.parentElement) {
    if (scopes.has(current)) return scopes.get(current);
  }

  return null;
}

/** Re-renders the calling component after any change to the store. */
export function useStore(store) {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);

  return store.state;
}

export function useShellContext() {
  return useContext(ShellContext);
}

/** The reactive shell state; components re-render whenever it changes. */
export function useShell() {
  return useStore(useShellContext().store);
}

export function useApi() {
  return useShellContext().api;
}

/** A callback ref that publishes an element as `state.$refs[name]`, like Alpine's x-ref. */
export function useRefBinding(state, name) {
  return useCallback(
    (element) => {
      if (element) state.$refs[name] = element;
      else if (state.$refs[name] && !state.$refs[name].isConnected) delete state.$refs[name];
    },
    [state, name],
  );
}

/** Subscribes to a window event for the component's lifetime with the latest handler. */
export function useWindowEvent(name, handler, options) {
  const latest = useRef(handler);
  useLayoutEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    const listener = (event) => latest.current(event);
    window.addEventListener(name, listener, options);

    return () => window.removeEventListener(name, listener, options);
  }, [name]);
}

/**
 * Registers a mounted inspector with the shell lifecycle.
 * The controller may implement activate, deactivate, refresh, and receiveIntent(filter).
 */
export function useInspectorController(inspector, profileId, controller) {
  const shell = useShell();
  const latest = useRef(controller);
  useLayoutEffect(() => {
    latest.current = controller;
  });
  useEffect(() => {
    const instance = Symbol(inspector);
    const proxy = {
      initialized: true,
      activate: () => latest.current?.activate?.(),
      deactivate: () => latest.current?.deactivate?.(),
      refresh: () => latest.current?.refresh?.(),
      receiveIntent: (filter) => latest.current?.receiveIntent?.(filter),
    };
    shell.mountInspector(inspector, profileId, proxy, instance);

    return () => shell.unmountInspector(instance);
  }, [inspector, profileId]);
}

/** Joins class names; accepts strings, falsy values, arrays, and { className: condition } maps. */
export function cx(...values) {
  const classes = [];

  const add = (value) => {
    if (!value) return;
    if (typeof value === 'string') classes.push(value);
    else if (Array.isArray(value)) value.forEach(add);
    else if (typeof value === 'object')
      Object.entries(value).forEach(([name, enabled]) => enabled && classes.push(name));
  };

  values.forEach(add);

  return classes.join(' ');
}
