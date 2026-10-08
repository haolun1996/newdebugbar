import { cx } from '../../app/hooks.js';
import { Icon } from './Icon.jsx';

/**
 * Search input with a leading icon (search-field.blade.php). Props: label (screen-reader label), placeholder
 * (default 'Search'), className, and input attributes such as value/onChange/data-ndb-* (spread on the <input>).
 */
export function SearchField({ label, placeholder = 'Search', className, ...rest }) {
  return (
    <label className="ndb:relative ndb:block ndb:min-w-0">
      <span className="ndb:sr-only">{label}</span>
      <input
        type="search"
        placeholder={placeholder}
        {...rest}
        className={cx(
          'ndb:h-9 ndb:w-full ndb:rounded-lg ndb:border ndb:border-zinc-200 ndb:bg-white/70 ndb:pr-3 ndb:pl-8 ndb:text-xs ndb:outline-none ndb:transition ndb:placeholder:text-zinc-400 ndb:focus:border-indigo-400 ndb:focus:ring-2 ndb:focus:ring-indigo-500/15 ndb:dark:border-zinc-700 ndb:dark:bg-zinc-900/70',
          className,
        )}
      />
      <Icon
        name="search"
        size={4}
        className="ndb:pointer-events-none ndb:absolute ndb:top-1/2 ndb:left-2.5 ndb:-translate-y-1/2 ndb:text-zinc-400"
      />
    </label>
  );
}
