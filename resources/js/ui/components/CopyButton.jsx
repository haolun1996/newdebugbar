import { useEffect, useState } from 'react';
import { createStore } from '../../app/store.js';
import { cx, useShellContext, useStore } from '../../app/hooks.js';
import { Icon } from './Icon.jsx';

/**
 * Per-control clipboard feedback (Alpine `copyControl()`): returns the reactive control with
 * `copyStatus`, `copyWithFeedback(value)`, and `resetCopyFeedback()`. Feedback resets when `value` changes.
 */
export function useCopyControl(value) {
  const { store } = useShellContext();
  const [control] = useState(() => createStore(store.state.copyControl()));
  const state = useStore(control);

  useEffect(() => {
    state.syncCopyValue(value);
  }, [state, value]);

  useEffect(() => () => state.destroy(), [state]);

  return state;
}

/**
 * Copy-to-clipboard button with status feedback (copy-button.blade.php).
 * Props: copy (value to copy), icon (icon name; swaps to a check after copying), iconClass, label (accessible
 * label shown as a status tooltip; without it the children are replaced in place by the status), className, children.
 */
export function CopyButton({
  copy,
  icon,
  iconClass = 'ndb:size-3.5',
  label = null,
  className,
  children,
  'aria-label': ariaLabel,
  ...rest
}) {
  const control = useCopyControl(copy);
  const status = control.copyStatus;
  const accessibleLabel = label ?? ariaLabel ?? undefined;

  return (
    <button
      type="button"
      data-ndb-copy-button=""
      onClick={() => control.copyWithFeedback(copy)}
      aria-label={status || accessibleLabel || undefined}
      {...rest}
      className={cx('ndb:relative', className)}
    >
      {icon ? (
        <>
          <Icon name={icon} className={iconClass} hidden={status === 'Copied'} />
          <Icon name="check" className={iconClass} hidden={status !== 'Copied'} />
        </>
      ) : null}
      {label !== null ? (
        <span
          hidden={!status}
          role="status"
          className="ndb:pointer-events-none ndb:absolute ndb:bottom-full ndb:left-1/2 ndb:mb-1 ndb:-translate-x-1/2 ndb:rounded-md ndb:bg-zinc-900 ndb:px-2 ndb:py-1 ndb:text-xs ndb:whitespace-nowrap ndb:text-white ndb:dark:bg-zinc-100 ndb:dark:text-zinc-900"
        >
          {status}
        </span>
      ) : (
        <span className="ndb:relative ndb:block ndb:min-w-0">
          <span
            className={cx('ndb:block ndb:truncate', { 'ndb:invisible': status })}
            aria-hidden={status ? 'true' : undefined}
          >
            {children}
          </span>
          <span hidden={!status} role="status" className="ndb:absolute ndb:inset-0 ndb:text-left">
            {status}
          </span>
        </span>
      )}
    </button>
  );
}
