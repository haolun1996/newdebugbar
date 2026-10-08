import { cx } from '../../app/hooks.js';
import { Icon } from './Icon.jsx';

/** Dashed empty placeholder (empty-state.blade.php). Props: label, description, centered, success, className. */
export function EmptyState({
  label,
  description = null,
  centered = false,
  success = false,
  className,
  ...rest
}) {
  return (
    <div
      {...rest}
      className={cx(
        'ndb:rounded-2xl ndb:border ndb:border-dashed ndb:border-zinc-300 ndb:px-3 ndb:py-6 ndb:text-center ndb:sm:px-6 ndb:sm:py-10 ndb:dark:border-zinc-700',
        { 'ndb:lg:my-auto ndb:lg:w-full ndb:lg:max-w-lg ndb:lg:self-center': centered },
        className,
      )}
    >
      <span
        className={cx('ndb:mx-auto ndb:grid ndb:size-10 ndb:place-items-center ndb:rounded-xl', {
          'ndb:bg-emerald-50 ndb:text-emerald-600 ndb:dark:bg-emerald-950 ndb:dark:text-emerald-300': success,
          'ndb:bg-zinc-100 ndb:text-zinc-400 ndb:dark:bg-zinc-900': !success,
        })}
      >
        <Icon name={success ? 'check' : 'code'} className="ndb:size-4" />
      </span>
      <p className="ndb:mt-3 ndb:text-sm ndb:font-semibold ndb:text-zinc-600 ndb:dark:text-zinc-300">
        {label}
      </p>
      {description !== null && description !== undefined ? (
        <p className="ndb:mt-2 ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}
