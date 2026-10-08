import { useShell } from '../../app/hooks.js';
import { IconButton } from '../components/IconButton.jsx';
import { MobileRequestMetrics } from './MobileRequestMetrics.jsx';
import { RequestFacts } from './RequestFacts.jsx';
import { RequestSwitcher } from './RequestSwitcher.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { MobileActions } from './MobileActions.jsx';
import { WindowControls } from './WindowControls.jsx';

/** Renders responsive request facts and inspector window controls. */
export function InspectorHeader() {
  const shell = useShell();

  return (
    <header className="ndb:relative ndb:z-40 ndb:shrink-0 ndb:overflow-visible ndb:border-b ndb:border-zinc-200/80 ndb:bg-white ndb:p-1.5 ndb:dark:border-zinc-800/80 ndb:dark:bg-zinc-950">
      <div
        data-ndb-header-mobile-toolbar
        className="ndb:flex ndb:min-w-0 ndb:items-stretch ndb:gap-1 ndb:sm:hidden"
      >
        <RequestSwitcher scope="header-mobile" direction="below" className="ndb:min-w-0 ndb:flex-1" />

        <MobileRequestMetrics scope="header" data-ndb-header-mobile-control="metrics" />

        <MobileActions
          menu="header-actions"
          wrapperProps={{
            'data-ndb-header-mobile-control': 'actions',
            className: 'ndb:relative ndb:flex ndb:shrink-0',
          }}
          triggerProps={{ 'data-ndb-header-mobile-trigger': 'actions' }}
          popoverId="newdebugbar-header-mobile-actions"
          label="Inspector actions"
          ariaLabel="Show inspector actions"
          direction="below"
        />
      </div>

      <div
        data-ndb-header-toolbar
        className="ndb:hidden ndb:items-stretch ndb:gap-1 ndb:sm:flex ndb:sm:flex-nowrap"
      >
        <RequestSwitcher
          scope="header"
          direction="below"
          className="ndb:w-[9.5rem] ndb:flex-none ndb:md:w-[11.5rem] ndb:lg:w-auto ndb:lg:max-w-[18.5rem]"
        />

        <div
          data-ndb-header-facts
          className="ndb-scrollbar ndb:flex ndb:min-w-0 ndb:flex-1 ndb:gap-2 ndb:overflow-x-auto ndb:overscroll-x-contain ndb:pb-0.5 ndb:sm:order-none ndb:sm:ml-auto ndb:sm:w-auto ndb:sm:flex-none ndb:sm:gap-1 ndb:sm:overflow-visible ndb:sm:pb-0"
        >
          <RequestFacts scope="header" />
        </div>

        <div data-ndb-inspector-actions className="ndb:flex ndb:items-center ndb:gap-0.5">
          <div
            data-ndb-inspector-utility-actions
            role="group"
            aria-label="Tools"
            className="ndb:flex ndb:items-center ndb:gap-0.5"
          >
            <IconButton
              name="search"
              data-ndb-inspector-action="palette"
              onClick={() => shell.openPalette()}
              className="ndb:size-9 ndb:rounded-xl"
              aria-label="Open command palette"
            />
            <ThemeToggle scope="header" direction="below" data-ndb-inspector-action="theme" />
          </div>
          <WindowControls data-ndb-window-controls="expanded" />
        </div>
      </div>
    </header>
  );
}
