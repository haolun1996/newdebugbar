import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Calls the handler for document clicks outside the returned ref's element, like Alpine's `@click.outside`:
 * clicks on detached targets and clicks while the element is not rendered are ignored.
 */
export function useClickOutside(handler) {
  const ref = useRef(null);
  const latest = useRef(handler);

  useLayoutEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    const listener = (event) => {
      const element = ref.current;
      if (!element || element.contains(event.target) || event.target?.isConnected === false) return;
      if (element.offsetWidth < 1 && element.offsetHeight < 1) return;

      latest.current(event);
    };
    document.addEventListener('click', listener);

    return () => document.removeEventListener('click', listener);
  }, []);

  return ref;
}
