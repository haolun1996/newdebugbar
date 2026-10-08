import { cx, useShell, useWindowEvent } from '../../app/hooks.js';
import { Icon } from '../components/Icon.jsx';
import { PopoverSurface } from '../components/PopoverSurface.jsx';
import { InspectorNavigation } from './InspectorNavigation.jsx';
import { ThemeMenuItem } from './ThemeMenuItem.jsx';

/** The mobile action menu for the compact toolbar or the expanded inspector header. */
export function MobileToolbarPopover({ id, menu, label, direction = 'dynamic' }) {
  const shell = useShell();
  const expanded = menu === 'header-actions';
  const actionAttribute = expanded ? 'data-ndb-header-mobile-action' : 'data-ndb-mobile-toolbar-action';
  const open = shell.mobileToolbarMenu === menu;
  const actions = [
    { key: 'palette', label: 'Command palette', icon: 'search', run: () => shell.openPalette() },
    expanded
      ? { key: 'shrink', label: 'Shrink inspector', icon: 'shrink', run: () => shell.closeInspector() }
      : { key: 'inspector', label: 'Open', icon: 'expand', run: () => shell.openInspector('request') },
    { key: 'dismiss', label: 'Hide until reload', icon: 'close', run: () => shell.dismissBar() },
  ];

  useWindowEvent('resize', () => shell.closeMobileToolbarMenu(false));

  const onKeyDown = (event) => {
    const popover = event.currentTarget;
    if (event.key === 'Tab') {
      event.stopPropagation();
      shell.keepFocusWithin(event, popover);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      shell.moveMobileToolbarMenu(-1, popover);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      shell.moveMobileToolbarMenu(1, popover);
    }
  };

  return (
    <PopoverSurface
      id={id}
      hidden={!open}
      role="menu"
      aria-label={label}
      onDragStart={(event) => event.stopPropagation()}
      onKeyDown={onKeyDown}
      data-ndb-mobile-toolbar-menu={menu}
      direction={direction}
      mobileMenu={menu}
      widthClass="ndb:w-80 ndb:max-w-[calc(100vw-2.5rem)]"
    >
      <div
        data-ndb-mobile-toolbar-popover-items
        className={cx(
          'ndb-scrollbar ndb:flex ndb:flex-col ndb:gap-0.5 ndb:overflow-y-auto ndb:overscroll-contain',
          expanded ? 'ndb:max-h-[calc(min(82dvh,780px)-6rem)]' : 'ndb:max-h-[calc(100dvh-6.5rem)]',
        )}
      >
        <div role="group" aria-label="Controls" className="ndb:flex ndb:shrink-0 ndb:flex-col ndb:gap-0.5">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              {...{ [actionAttribute]: action.key }}
              onClick={action.run}
              className="ndb:flex ndb:min-h-11 ndb:w-full ndb:items-center ndb:gap-3 ndb:rounded-lg ndb:px-3 ndb:py-2 ndb:text-left ndb:transition-colors ndb:hover:bg-zinc-100 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:hover:bg-white/10"
            >
              <Icon name={action.icon} className="ndb:size-4 ndb:text-zinc-500 ndb:dark:text-zinc-400" />
              <span className="ndb:text-sm ndb:font-medium">{action.label}</span>
            </button>
          ))}
        </div>
        <ThemeMenuItem {...{ [actionAttribute]: 'theme' }} />
        <div
          role="separator"
          className="ndb:mx-2 ndb:my-2 ndb:h-px ndb:shrink-0 ndb:bg-zinc-200 ndb:dark:bg-zinc-800"
        />
        {open && <InspectorNavigation mobile />}
      </div>
    </PopoverSurface>
  );
}
