import { cx } from '../../app/hooks.js';
import { Icon } from './Icon.jsx';

/**
 * Select with a chevron (select-field.blade.php). Props: label (screen-reader label), className, children
 * (<option>s), and select attributes such as value/onChange/data-ndb-* (spread on the <select>).
 */
export function SelectField({ label, className, children, ...rest }) {
  return (
    <label className="ndb:relative ndb:block">
      <span className="ndb:sr-only">{label}</span>
      <select
        {...rest}
        className={cx(
          'ndb:h-9 ndb:w-full ndb:appearance-none ndb:rounded-lg ndb:border ndb:border-zinc-200 ndb:bg-white/70 ndb:pr-8 ndb:pl-3 ndb:text-xs ndb:font-semibold ndb:outline-none ndb:transition ndb:focus:border-indigo-400 ndb:focus:ring-2 ndb:focus:ring-indigo-500/15 ndb:dark:border-zinc-700 ndb:dark:bg-zinc-900/70',
          className,
        )}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={3.5}
        className="ndb:pointer-events-none ndb:absolute ndb:top-1/2 ndb:right-2.5 ndb:-translate-y-1/2 ndb:text-zinc-400"
      />
    </label>
  );
}
