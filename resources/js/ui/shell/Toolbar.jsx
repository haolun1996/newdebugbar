import { cx, useShell, useWindowEvent } from '../../app/hooks.js';
import { IconButton } from '../components/IconButton.jsx';
import { MobileRequestMetrics } from './MobileRequestMetrics.jsx';
import { MobileActions } from './MobileActions.jsx';
import { RequestFacts } from './RequestFacts.jsx';
import { RequestSwitcher } from './RequestSwitcher.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { WindowControls } from './WindowControls.jsx';

const CORNER_SURFACE =
  'ndb:h-14 ndb:w-[196px] ndb:gap-1 ndb:rounded-[18px] ndb:border-white/70 ndb:bg-white/80 ndb:p-1.5 ndb:shadow-[0_18px_60px_-18px_rgba(24,24,27,0.4)] ndb:backdrop-blur-xl ndb:backdrop-brightness-110 ndb:backdrop-saturate-125 ndb:dark:border-white/10 ndb:dark:bg-zinc-950/90 ndb:dark:shadow-[0_18px_60px_-18px_rgba(0,0,0,0.8)] ndb:dark:backdrop-brightness-75 ndb:dark:backdrop-saturate-100';
const CENTER_SURFACE =
  'ndb:w-[calc(100vw-24px)] ndb:max-w-[calc(100vw-24px)] ndb:gap-1 ndb:rounded-[18px] ndb:border-white/70 ndb:bg-white/80 ndb:py-1.5 ndb:pl-1.5 ndb:pr-1.5 ndb:shadow-[0_18px_60px_-18px_rgba(24,24,27,0.4)] ndb:backdrop-blur-xl ndb:backdrop-brightness-110 ndb:backdrop-saturate-125 ndb:sm:max-w-5xl ndb:sm:pr-3 ndb:dark:border-white/10 ndb:dark:bg-zinc-950/90 ndb:dark:shadow-[0_18px_60px_-18px_rgba(0,0,0,0.8)] ndb:dark:backdrop-brightness-75 ndb:dark:backdrop-saturate-100';

/** Renders the compact debug toolbar and its responsive action menu. */
export function Toolbar() {
  const shell = useShell();
  const corner = shell.toolbarIsCorner;

  useWindowEvent('pointermove', (event) => shell.moveToolbarDrag(event));
  useWindowEvent('pointerup', (event) => shell.endToolbarDrag(event));
  useWindowEvent('pointercancel', (event) => shell.cancelToolbarDrag(event));

  return (
    <div
      hidden={!(shell.barVisible && !shell.inspectorOpen)}
      role="toolbar"
      aria-label="Debug toolbar"
      aria-describedby="newdebugbar-toolbar-drag-hint"
      data-ndb-toolbar-shell
      data-ndb-placement={shell.toolbarPlacement}
      data-ndb-preferred-placement={shell.toolbarPreferredPlacement}
      data-ndb-dragging={shell.toolbarDragging ? 'true' : undefined}
      data-ndb-drag-target={shell.toolbarDragTarget}
      data-ndb-rebasing={shell.toolbarRebasing ? 'true' : undefined}
      data-ndb-snapping={shell.toolbarSnapping ? 'true' : undefined}
      data-ndb-form={corner ? 'corner' : 'center'}
      style={{
        '--ndb-toolbar-drag-x': `${shell.toolbarDragOffsetX}px`,
        '--ndb-toolbar-drag-y': `${shell.toolbarDragOffsetY}px`,
      }}
      onPointerDown={(event) => shell.startToolbarDrag(event)}
      onClickCapture={(event) => shell.consumeToolbarClick(event)}
      onDragStart={(event) => event.preventDefault()}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === 'transform')
          shell.finishToolbarSnap();
      }}
      className={cx(
        'ndb-toolbar-draggable ndb:pointer-events-auto ndb:fixed ndb:flex ndb:items-stretch ndb:border',
        shell.toolbarIsTop ? 'ndb:top-3' : 'ndb:bottom-3',
        shell.toolbarIsLeft
          ? 'ndb:left-3'
          : shell.toolbarIsRight
            ? 'ndb:right-3'
            : 'ndb:left-1/2 ndb:-translate-x-1/2',
        corner ? CORNER_SURFACE : CENTER_SURFACE,
      )}
    >
      <div
        hidden={corner}
        data-ndb-center-toolbar
        className="ndb:flex ndb:min-w-0 ndb:flex-1 ndb:items-stretch ndb:gap-1"
      >
        <RequestSwitcher
          scope="toolbar"
          className="ndb:min-w-0 ndb:flex-1 ndb:sm:w-[9.5rem] ndb:sm:flex-none ndb:md:w-[11.5rem] ndb:lg:w-auto ndb:lg:max-w-[18.5rem]"
        />

        <MobileRequestMetrics
          scope="toolbar"
          data-ndb-mobile-toolbar-control="metrics"
          className="ndb:sm:hidden"
        />

        <div
          data-ndb-toolbar-facts
          className="ndb-toolbar-facts ndb:hidden ndb:min-w-0 ndb:flex-1 ndb:items-stretch ndb:gap-1 ndb:sm:ml-auto ndb:sm:flex ndb:sm:flex-none"
        >
          <RequestFacts scope="toolbar" />
        </div>

        <MobileActions
          menu="actions"
          wrapperProps={{
            'data-ndb-mobile-toolbar-control': 'actions',
            className: 'ndb:relative ndb:flex ndb:shrink-0 ndb:sm:hidden',
          }}
          triggerProps={{ 'data-ndb-mobile-toolbar-trigger': 'actions' }}
          popoverId="newdebugbar-mobile-actions"
          label="Debug bar actions"
          ariaLabel="Show debug bar actions"
        />

        <div
          data-ndb-toolbar-actions
          className="ndb:hidden ndb:shrink-0 ndb:items-center ndb:gap-0.5 ndb:sm:flex"
        >
          <div
            data-ndb-toolbar-utility-actions
            role="group"
            aria-label="Tools"
            className="ndb:flex ndb:items-center ndb:gap-0.5"
          >
            <IconButton
              name="search"
              darkSurface
              data-ndb-toolbar="palette"
              onClick={() => shell.openPalette()}
              className="ndb:size-9 ndb:rounded-xl"
              aria-label="Open command palette"
              title="Command palette (Command or Control + Shift + P)"
            />
            <ThemeToggle scope="toolbar" darkSurface data-ndb-toolbar-action="theme" />
          </div>
          <WindowControls data-ndb-window-controls="compact" darkSurface />
        </div>
      </div>

      <div hidden={!corner} data-ndb-corner-toolbar className="ndb:flex ndb:h-full ndb:w-full">
        <RequestSwitcher scope="corner" className="ndb:w-full" />
      </div>
    </div>
  );
}
