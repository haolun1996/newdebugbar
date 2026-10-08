import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx, useShell } from '../../../app/hooks.js';
import { HighlightedCode } from '../../components/CodeBlock.jsx';
import { Icon } from '../../components/Icon.jsx';
import { PopoverSurface } from '../../components/PopoverSurface.jsx';

const OFFSET = 12;
const PADDING = 5;

/**
 * Places the popover below the trigger's start edge, flipping above when only that side fits and shifting it
 * horizontally inside the viewport (the old `x-anchor.bottom-start.offset.12.fixed`).
 */
function anchorPosition(trigger, popover) {
  const anchor = trigger.getBoundingClientRect();
  const { width, height } = popover.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const below = anchor.bottom + OFFSET;
  const above = anchor.top - OFFSET - height;
  const fitsBelow = below + height <= viewportHeight;
  const fitsAbove = above >= 0;
  let top = below;

  if (!fitsBelow && (fitsAbove || anchor.top > viewportHeight - anchor.bottom)) top = above;
  top = Math.min(Math.max(top, 0), Math.max(0, viewportHeight - height));

  const left = Math.min(Math.max(anchor.left, PADDING), Math.max(PADDING, viewportWidth - width - PADDING));

  return { top, left };
}

/** Shows retained middleware in the shared anchored popover (request-middleware.blade.php). */
export function RequestMiddleware({ middleware }) {
  const shell = useShell();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const listRef = useRef(null);
  const id = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const triggerId = `newdebugbar-request-middleware-trigger-${id}`;
  const popoverId = `newdebugbar-request-middleware-popover-${id}`;
  const active = shell.selected === 'request' && shell.inspectorOpen && shell.barVisible;

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    setPosition(null);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  // The command palette takes focus from the popover and returns it to the trigger.
  useEffect(() => {
    if (!open) return;
    if (shell.paletteOpen) {
      shell.paletteReturnFocus = triggerRef.current;
      close();
    } else if (!active) {
      close();
    }
  }, [open, shell.paletteOpen, active, close, shell]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    const place = () => {
      if (triggerRef.current && popoverRef.current) {
        setPosition(anchorPosition(triggerRef.current, popoverRef.current));
      }
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const positioned = position !== null;

  useEffect(() => {
    if (open && positioned) listRef.current?.focus({ preventScroll: true });
  }, [open, positioned]);

  useEffect(() => {
    if (!open) return undefined;

    const outside = (event) => {
      if (popoverRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      close();
    };
    document.addEventListener('pointerdown', outside, true);

    return () => document.removeEventListener('pointerdown', outside, true);
  }, [open, close]);

  const root = typeof document === 'undefined' ? null : document.getElementById('newdebugbar');

  return (
    <div
      data-ndb-request-middleware=""
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }}
    >
      <button
        type="button"
        data-ndb-request-middleware-trigger=""
        ref={triggerRef}
        id={triggerId}
        aria-controls={popoverId}
        aria-expanded={open ? 'true' : 'false'}
        onClick={(event) => {
          event.stopPropagation();
          if (open) close();
          else setOpen(true);
        }}
        className="ndb:flex ndb:w-fit ndb:items-center ndb:gap-2 ndb:rounded-sm ndb:text-left ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-4 ndb:focus-visible:outline-indigo-500"
      >
        <span>{middleware.length} middleware</span>
        <Icon
          name="chevron-down"
          size={3.5}
          className={cx('ndb:text-zinc-400 ndb:transition', { 'ndb:rotate-180': open })}
        />
      </button>

      {open && root
        ? createPortal(
            <PopoverSurface
              anchored
              ref={popoverRef}
              onKeyDown={(event) => {
                if (event.key !== 'Escape' && event.key !== 'Tab') return;
                event.preventDefault();
                event.stopPropagation();
                close(true);
              }}
              data-ndb-request-middleware-popover=""
              id={popoverId}
              style={{
                position: 'fixed',
                top: `${position?.top ?? 0}px`,
                left: `${position?.left ?? 0}px`,
                visibility: positioned ? 'visible' : 'hidden',
              }}
              role="region"
              aria-label="Middleware"
              tabIndex={-1}
              widthClass="ndb:w-[min(32rem,calc(100vw-2rem))]"
              surfaceClass="ndb:p-0"
              arrowClass="ndb:hidden"
              className="ndb:pointer-events-auto"
            >
              <ol
                ref={listRef}
                tabIndex={0}
                aria-label="Middleware list"
                className="ndb:max-h-[min(24rem,60dvh)] ndb:space-y-3 ndb:overflow-y-auto ndb:overscroll-contain ndb:p-4 ndb:text-xs ndb:leading-5 ndb:focus-visible:outline-2 ndb:focus-visible:-outline-offset-2 ndb:focus-visible:outline-indigo-500"
              >
                {middleware.map((name, index) => (
                  <li key={`${index}-${name}`}>
                    <HighlightedCode
                      language="php"
                      source={String(name)}
                      className="ndb:[overflow-wrap:anywhere]"
                    />
                  </li>
                ))}
              </ol>
            </PopoverSurface>,
            root,
          )
        : null}
    </div>
  );
}
