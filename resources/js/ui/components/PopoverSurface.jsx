import { cx, useShell } from '../../app/hooks.js';

const DIRECTION = {
  below: 'ndb:top-[calc(100%+0.75rem)] ndb:origin-top',
  above: 'ndb:bottom-[calc(100%+0.75rem)] ndb:origin-bottom',
};

const ARROW_DIRECTION = {
  below: 'ndb:-top-[7px] ndb:rotate-180',
  above: 'ndb:-bottom-[7px]',
};

const ALIGNMENT = { left: 'ndb:left-0', right: 'ndb:right-0' };

/** Reads the toolbar placement only when a dynamic popover needs it. */
function useDynamicPlacement(enabled) {
  const shell = useShell();

  return enabled ? { top: shell.toolbarIsTop, right: shell.toolbarIsRight } : null;
}

/**
 * Floating popover with an arrow (popover-surface.blade.php). Props: anchored (positioned by the caller, no
 * direction/alignment classes), direction ('below' | 'above' | 'dynamic' follows shell.toolbarIsTop), widthClass,
 * surfaceClass, arrowClass, mobileMenu (adds data-ndb-mobile-toolbar-popover-* hooks), align ('left' | 'right' |
 * 'dynamic' follows shell.toolbarIsRight), className, children.
 */
export function PopoverSurface({
  anchored = false,
  direction = 'below',
  widthClass = 'ndb:w-64',
  surfaceClass = 'ndb:p-1.5',
  arrowClass = 'ndb:right-[14px]',
  mobileMenu = null,
  align = 'right',
  className,
  children,
  ...rest
}) {
  if (!anchored && direction !== 'dynamic' && !DIRECTION[direction]) {
    throw new Error(`Unsupported popover direction [${direction}].`);
  }
  if (!anchored && align !== 'dynamic' && !ALIGNMENT[align]) {
    throw new Error(`Unsupported popover alignment [${align}].`);
  }

  const dynamicDirection = !anchored && direction === 'dynamic';
  const dynamicAlign = !anchored && align === 'dynamic';
  const placement = useDynamicPlacement(dynamicDirection || dynamicAlign);

  const directionClass = anchored
    ? ''
    : dynamicDirection
      ? placement.top
        ? DIRECTION.below
        : DIRECTION.above
      : DIRECTION[direction];
  const arrowDirectionClass = anchored
    ? ''
    : dynamicDirection
      ? placement.top
        ? ARROW_DIRECTION.below
        : ARROW_DIRECTION.above
      : ARROW_DIRECTION[direction];
  const alignmentClass = anchored
    ? ''
    : dynamicAlign
      ? placement.right
        ? 'ndb:right-0'
        : 'ndb:left-0'
      : ALIGNMENT[align];

  return (
    <div
      {...rest}
      className={cx(
        'ndb:z-50',
        alignmentClass,
        widthClass,
        directionClass,
        { 'ndb:absolute': !anchored },
        className,
      )}
    >
      <span
        aria-hidden="true"
        data-ndb-popover-arrow=""
        data-ndb-mobile-toolbar-popover-arrow={mobileMenu ?? undefined}
        className={cx(
          'ndb:pointer-events-none ndb:absolute ndb:z-20 ndb:h-2 ndb:w-4',
          arrowClass,
          arrowDirectionClass,
        )}
      >
        <svg viewBox="0 0 16 8" className="ndb:block ndb:h-full ndb:w-full ndb:overflow-visible">
          <path d="M0 0H16L8 8Z" className="ndb:fill-white/90 ndb:dark:fill-zinc-900/90" />
          <path
            d="M0.75 0.5L8 7.75L15.25 0.5"
            fill="none"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ndb:stroke-zinc-300/90 ndb:dark:stroke-zinc-700/90"
          />
        </svg>
      </span>

      <div
        data-ndb-popover-surface=""
        data-ndb-mobile-toolbar-popover-surface={mobileMenu !== null ? '' : undefined}
        className={cx(
          'ndb:relative ndb:z-10 ndb:overflow-hidden ndb:rounded-2xl ndb:border ndb:border-zinc-200/80 ndb:bg-white/90 ndb:shadow-[0_18px_50px_-16px_rgba(24,24,27,0.45)] ndb:backdrop-blur-xl ndb:dark:border-zinc-700/80 ndb:dark:bg-zinc-900/90 ndb:dark:shadow-[0_18px_50px_-16px_rgba(0,0,0,0.85)]',
          surfaceClass,
        )}
      >
        {children}
      </div>
    </div>
  );
}
