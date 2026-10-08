import { useLayoutEffect, useRef } from 'react';
import { anchorPosition } from '../../../inspectors/livewire/anchor.js';

/**
 * Keeps a fixed floating element anchored to `reference` (an element) while anything scrolls, resizes, or
 * re-renders. The element stays invisible until its first position is known.
 */
export function useAnchor(floatingRef, reference, placement = 'bottom-start') {
  const update = useRef(() => {});

  useLayoutEffect(() => {
    const floating = floatingRef.current;
    if (!floating || !reference) return undefined;

    update.current = () => {
      if (!reference.isConnected || !floating.isConnected) return;

      const { x, y } = anchorPosition(
        reference.getBoundingClientRect(),
        floating.getBoundingClientRect(),
        { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
        placement,
      );
      floating.style.left = `${x}px`;
      floating.style.top = `${y}px`;
      floating.style.visibility = 'visible';
    };

    floating.style.position = 'fixed';
    floating.style.left = '0px';
    floating.style.top = '0px';
    floating.style.visibility = 'hidden';
    update.current();

    const listener = () => update.current();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(listener) : null;
    observer?.observe(reference);
    observer?.observe(floating);
    document.addEventListener('scroll', listener, { capture: true, passive: true });
    window.addEventListener('resize', listener);

    return () => {
      update.current = () => {};
      observer?.disconnect();
      document.removeEventListener('scroll', listener, { capture: true });
      window.removeEventListener('resize', listener);
    };
  }, [floatingRef, reference, placement]);

  // Content changes can move the reference without a scroll or resize.
  useLayoutEffect(() => update.current());
}
