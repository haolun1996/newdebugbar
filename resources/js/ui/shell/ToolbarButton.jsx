import { cx, useShell } from '../../app/hooks.js';

/** A toolbar fact; with an inspector it is a button that opens that inspector, otherwise inert text. */
export function ToolbarButton({ inspector = null, className, children, ...rest }) {
  const shell = useShell();

  if (inspector) {
    return (
      <button
        type="button"
        onClick={() => shell.openInspector(inspector)}
        {...rest}
        className={cx(
          'ndb:self-stretch ndb:items-center ndb:gap-2 ndb:rounded-xl ndb:px-2.5 ndb:py-1.5 ndb:text-left ndb:transition ndb:hover:bg-zinc-100 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:hover:bg-white/10',
          className,
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <div
      {...rest}
      className={cx(
        'ndb:self-stretch ndb:items-center ndb:gap-2 ndb:px-2.5 ndb:py-1.5 ndb:text-left',
        className,
      )}
    >
      {children}
    </div>
  );
}
