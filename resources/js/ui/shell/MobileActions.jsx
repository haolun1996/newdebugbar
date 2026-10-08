import { cx, useShell } from '../../app/hooks.js';
import { Icon } from '../components/Icon.jsx';
import { MobileToolbarPopover } from './MobileToolbarPopover.jsx';
import { useClickOutside } from './useClickOutside.js';

const MOBILE_TRIGGER =
  'ndb:inline-flex ndb:size-11 ndb:items-center ndb:justify-center ndb:text-zinc-700 ndb:transition-colors ndb:hover:text-indigo-600 ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-zinc-300 ndb:dark:hover:text-indigo-300';

/** The mobile "more" button and its action menu, for the toolbar or the inspector header. */
export function MobileActions({ menu, wrapperProps, triggerProps, popoverId, label, ariaLabel, direction }) {
  const shell = useShell();
  const open = shell.mobileToolbarMenu === menu;
  const wrapperRef = useClickOutside(() => {
    if (shell.mobileToolbarMenu === menu) shell.closeMobileToolbarMenu(false);
  });

  return (
    <div ref={wrapperRef} {...wrapperProps}>
      <button
        type="button"
        {...triggerProps}
        onClick={(event) => shell.toggleMobileToolbarMenu(menu, event.currentTarget)}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={ariaLabel}
        className={cx(MOBILE_TRIGGER, open ? 'ndb:text-indigo-600 ndb:dark:text-indigo-300' : '')}
      >
        <Icon name="ellipsis" className="ndb:size-5" />
      </button>

      <MobileToolbarPopover id={popoverId} menu={menu} label={label} direction={direction} />
    </div>
  );
}
