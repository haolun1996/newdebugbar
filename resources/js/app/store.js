/**
 * A small deep-reactive store for the bar's state objects.
 *
 * The shell modules are plain objects whose methods mutate `this`. Wrapping them in a
 * proxy lets those methods keep working unchanged while every write schedules one
 * batched notification that React subscribes to. Keys beginning with `$` hold
 * non-reactive helpers (`$refs`, `$root`, `$nextTick`, `$wire`), and frozen objects
 * are returned as-is so large immutable payloads are never proxied.
 */

const RAW = Symbol('newDebugBarRaw');

let tickCallbacks = [];
let tickScheduled = false;

const flushTicks = () => {
  tickScheduled = false;
  const callbacks = tickCallbacks;
  tickCallbacks = [];
  callbacks.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      console.error(error);
    }
  });
};

/**
 * Runs a callback after pending store notifications have rendered.
 * React flushes store-driven renders in a microtask, so a macrotask runs after the commit.
 */
export function nextTick(callback) {
  return new Promise((resolve) => {
    tickCallbacks.push(() => {
      callback?.();
      resolve();
    });

    if (tickScheduled) return;
    tickScheduled = true;
    setTimeout(flushTicks, 0);
  });
}

const reactiveCandidate = (value) => {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return false;
  if (Array.isArray(value)) return true;

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

export const toRaw = (value) => (value && typeof value === 'object' && value[RAW]) || value;

export function createStore(target) {
  const listeners = new Set();
  const proxies = new WeakMap();
  let version = 0;
  let notifyScheduled = false;

  const notify = () => {
    if (notifyScheduled) return;
    notifyScheduled = true;
    queueMicrotask(() => {
      notifyScheduled = false;
      version += 1;
      listeners.forEach((listener) => listener());
    });
  };

  const wrap = (value) => {
    if (!reactiveCandidate(value)) return value;

    let proxy = proxies.get(value);
    if (proxy) return proxy;

    proxy = new Proxy(value, {
      get(object, key, receiver) {
        if (key === RAW) return object;

        const result = Reflect.get(object, key, receiver);

        if (typeof key === 'symbol' || (typeof key === 'string' && key.startsWith('$'))) return result;

        return wrap(result);
      },
      set(object, key, next, receiver) {
        const raw = toRaw(next);
        const previous = object[key];
        const descriptor = Object.getOwnPropertyDescriptor(object, key);
        const result = descriptor?.set
          ? Reflect.set(object, key, raw, receiver)
          : Reflect.set(object, key, raw);

        if (
          (typeof key !== 'string' || !key.startsWith('$')) &&
          (previous !== raw || (Array.isArray(object) && key === 'length') || descriptor?.set)
        ) {
          notify();
        }

        return result;
      },
      deleteProperty(object, key) {
        const had = Object.prototype.hasOwnProperty.call(object, key);
        const result = Reflect.deleteProperty(object, key);
        if (had) notify();

        return result;
      },
    });
    proxies.set(value, proxy);

    return proxy;
  };

  return {
    state: wrap(target),
    raw: target,
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    getVersion: () => version,
    notify,
  };
}

/**
 * Gives a state object the helpers Alpine used to provide.
 * `$refs` is filled by React ref callbacks and `$root` by the component that owns the scope.
 */
export function attachMagics(target, { wire = null } = {}) {
  Object.defineProperties(target, {
    $refs: { value: {}, writable: true, enumerable: false },
    $root: { value: null, writable: true, enumerable: false },
    $nextTick: { value: nextTick, writable: true, enumerable: false },
    $wire: { value: wire, writable: true, enumerable: false },
  });

  return target;
}
