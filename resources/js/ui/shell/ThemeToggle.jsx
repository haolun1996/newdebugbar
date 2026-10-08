import { cx, useShell } from '../../app/hooks.js';
import { Icon } from '../components/Icon.jsx';
import { IconButton } from '../components/IconButton.jsx';
import { PopoverSurface } from '../components/PopoverSurface.jsx';
import { THEMES } from './themes.js';
import { useClickOutside } from './useClickOutside.js';

/** The color theme button and its menu for one toolbar scope. */
export function ThemeToggle({ scope, direction = 'dynamic', darkSurface = false, className, ...rest }) {
  const shell = useShell();
  const open = shell.themeMenuScope === scope;
  const current = THEMES.find(([theme]) => theme === shell.theme) ?? THEMES[0];
  const label = `Color theme: ${shell.theme === 'system' ? 'System' : shell.theme === 'light' ? 'Light' : 'Dark'}`;
  const controlRef = useClickOutside(() => {
    if (shell.themeMenuScope === scope) shell.closeThemeMenu(false);
  });

  const onMenuKeyDown = (event) => {
    const menu = event.currentTarget;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      shell.moveThemeMenu(1, menu);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      shell.moveThemeMenu(-1, menu);
    } else if (event.key === 'Home') {
      event.preventDefault();
      menu.querySelector('[data-ndb-theme-option]')?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      menu.querySelector('[data-ndb-theme-option]:last-child')?.focus();
    }
  };

  return (
    <div ref={controlRef} data-ndb-theme-control={scope} className="ndb:relative ndb:flex ndb:shrink-0">
      <IconButton
        darkSurface={darkSurface}
        data-ndb-theme-trigger={scope}
        onClick={(event) => shell.toggleThemeMenu(scope, event.currentTarget)}
        aria-expanded={open}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-controls={`newdebugbar-theme-menu-${scope}`}
        {...rest}
        className={cx('ndb:size-9 ndb:rounded-xl', className)}
      >
        <span key={current[0]} className="ndb:flex ndb:items-center ndb:justify-center ndb:leading-none">
          <Icon name={current[2]} className="ndb:size-4" />
        </span>
      </IconButton>

      <PopoverSurface
        direction={direction}
        align="right"
        widthClass="ndb:w-44"
        surfaceClass="ndb:p-1.5"
        hidden={!open}
      >
        <div
          id={`newdebugbar-theme-menu-${scope}`}
          data-ndb-theme-menu={scope}
          role="menu"
          aria-label="Color theme"
          onKeyDown={onMenuKeyDown}
        >
          {THEMES.map(([theme, themeLabel, icon]) => (
            <button
              key={theme}
              type="button"
              role="menuitemradio"
              data-ndb-theme-option={theme}
              onClick={() => {
                shell.setTheme(theme);
                shell.closeThemeMenu();
              }}
              aria-checked={shell.theme === theme}
              className={cx(
                'ndb:flex ndb:min-h-10 ndb:w-full ndb:items-center ndb:gap-3 ndb:rounded-lg ndb:px-3 ndb:py-2 ndb:text-left ndb:transition-colors ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500',
                shell.theme === theme
                  ? 'ndb:bg-indigo-50 ndb:text-indigo-700 ndb:dark:bg-indigo-950/70 ndb:dark:text-indigo-300'
                  : 'ndb:text-zinc-700 ndb:hover:bg-zinc-100 ndb:dark:text-zinc-200 ndb:dark:hover:bg-white/10',
              )}
            >
              <Icon
                name={icon}
                className="ndb:size-4 ndb:shrink-0 ndb:text-zinc-500 ndb:dark:text-zinc-400"
              />
              <span className="ndb:min-w-0 ndb:flex-1 ndb:text-sm ndb:font-medium">{themeLabel}</span>
              <span
                hidden={shell.theme !== theme}
                className="ndb:flex ndb:size-4 ndb:shrink-0 ndb:items-center ndb:justify-center"
              >
                <Icon name="check" className="ndb:size-4" />
              </span>
            </button>
          ))}
        </div>
      </PopoverSurface>
    </div>
  );
}
