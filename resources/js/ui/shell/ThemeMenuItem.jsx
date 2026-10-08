import { cx, useShell } from '../../app/hooks.js';
import { Icon } from '../components/Icon.jsx';
import { THEMES } from './themes.js';

/** The color theme choices inside a mobile action menu. */
export function ThemeMenuItem({ className, ...rest }) {
  const shell = useShell();

  return (
    <div role="group" aria-label="Color theme" {...rest} className={cx('ndb:py-1', className)}>
      <p className="ndb:px-3 ndb:pb-1 ndb:pt-1 ndb:text-xs ndb:font-semibold ndb:uppercase ndb:tracking-wider ndb:text-zinc-400">
        Color theme
      </p>
      {THEMES.map(([theme, label, icon]) => (
        <button
          key={theme}
          type="button"
          role="menuitemradio"
          data-ndb-mobile-theme-option={theme}
          onClick={() => {
            shell.setTheme(theme);
            shell.closeMobileToolbarMenu();
          }}
          aria-checked={shell.theme === theme}
          className={cx(
            'ndb:flex ndb:min-h-11 ndb:w-full ndb:items-center ndb:gap-3 ndb:rounded-lg ndb:px-3 ndb:py-2 ndb:text-left ndb:transition-colors ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500',
            shell.theme === theme
              ? 'ndb:bg-indigo-50 ndb:text-indigo-700 ndb:dark:bg-indigo-950/70 ndb:dark:text-indigo-300'
              : 'ndb:hover:bg-zinc-100 ndb:dark:hover:bg-white/10',
          )}
        >
          <Icon name={icon} className="ndb:size-4 ndb:shrink-0 ndb:text-zinc-500 ndb:dark:text-zinc-400" />
          <span className="ndb:min-w-0 ndb:flex-1 ndb:text-sm ndb:font-medium">{label}</span>
          <span
            hidden={shell.theme !== theme}
            className="ndb:flex ndb:size-4 ndb:shrink-0 ndb:items-center ndb:justify-center"
          >
            <Icon name="check" className="ndb:size-4" />
          </span>
        </button>
      ))}
    </div>
  );
}
