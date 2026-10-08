import { cx } from '../../app/hooks.js';
import { CopyButton } from './CopyButton.jsx';
import { Icon } from './Icon.jsx';

/**
 * Square icon control (icon-button.blade.php). Props: name (icon), copy (when not undefined/null, renders a
 * CopyButton using `aria-label` as its label and `name ?? 'copy'` as its icon), iconClass, darkSurface, colorOnly,
 * className, children (rendered when there is no icon name).
 */
export function IconButton({
  name = null,
  copy = null,
  iconClass = 'ndb:size-4',
  darkSurface = false,
  colorOnly = false,
  className,
  children,
  ...rest
}) {
  const classes = cx(
    'ndb:inline-flex ndb:items-center ndb:justify-center ndb:text-zinc-500 ndb:transition ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-2 ndb:focus-visible:outline-indigo-500 ndb:disabled:pointer-events-none ndb:disabled:opacity-25',
    {
      'ndb:hover:bg-zinc-100 ndb:hover:text-zinc-950 ndb:dark:hover:text-white': !colorOnly,
      'ndb:hover:text-indigo-600 ndb:dark:hover:text-indigo-300': colorOnly,
      'ndb:dark:text-zinc-300 ndb:dark:hover:bg-white/10': darkSurface && !colorOnly,
      'ndb:dark:text-zinc-300': darkSurface && colorOnly,
      'ndb:dark:text-zinc-400 ndb:dark:hover:bg-zinc-800': !darkSurface && !colorOnly,
      'ndb:dark:text-zinc-400': !darkSurface && colorOnly,
    },
    className,
  );

  if (copy !== null && copy !== undefined) {
    const { 'aria-label': label = null, ...attributes } = rest;

    return (
      <CopyButton
        copy={copy}
        icon={name ?? 'copy'}
        iconClass={iconClass}
        label={label}
        {...attributes}
        className={classes}
      />
    );
  }

  return (
    <button type="button" {...rest} className={classes}>
      {name ? <Icon name={name} className={iconClass} /> : children}
    </button>
  );
}
