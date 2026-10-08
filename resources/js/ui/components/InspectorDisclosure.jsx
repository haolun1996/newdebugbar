import { useEffect, useRef, useState } from 'react';
import { cx } from '../../app/hooks.js';
import { Icon } from './Icon.jsx';

/**
 * Collapsible <details> whose content mounts only while open (inspector-disclosure.blade.php). Props: label,
 * summary (node replacing the label), count + countProps (trailing count), resetKey (any value; the disclosure
 * closes whenever it changes, the old reset-on expression), className, children (content).
 */
export function InspectorDisclosure({
  label,
  summary,
  count,
  countProps = {},
  resetKey,
  className,
  children,
  ...rest
}) {
  const [open, setOpen] = useState(false);
  const element = useRef(null);
  const { className: countClass, ...countAttributes } = countProps;

  useEffect(() => {
    if (element.current) element.current.open = false;
    setOpen(false);
  }, [resetKey]);

  return (
    <details
      ref={element}
      data-ndb-inspector-disclosure=""
      onToggle={(event) => setOpen(event.currentTarget.open)}
      {...rest}
      className={cx(
        'ndb:group/disclosure ndb:min-w-0 ndb:border-t ndb:border-zinc-200/90 ndb:dark:border-zinc-800',
        className,
      )}
    >
      <summary className="ndb:flex ndb:min-h-11 ndb:cursor-pointer ndb:list-none ndb:items-center ndb:gap-3 ndb:rounded-md ndb:py-3 ndb:text-sm ndb:font-medium ndb:text-zinc-700 ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-zinc-200 ndb:[&::-webkit-details-marker]:hidden">
        <Icon
          name="chevron-down"
          size={3.5}
          className="ndb:shrink-0 ndb:-rotate-90 ndb:text-zinc-400 ndb:transition-transform ndb:group-open/disclosure:rotate-0 ndb:motion-reduce:transition-none"
        />
        <span className="ndb:min-w-0 ndb:flex-1">{summary !== undefined ? summary : label}</span>
        {count !== undefined ? (
          <span
            {...countAttributes}
            className={cx(
              'ndb:shrink-0 ndb:text-xs ndb:font-normal ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400',
              countClass,
            )}
          >
            {count}
          </span>
        ) : null}
      </summary>
      {open ? (
        <div data-ndb-inspector-disclosure-content="" className="ndb:min-w-0 ndb:pb-4 ndb:text-sm">
          {children}
        </div>
      ) : null}
    </details>
  );
}
