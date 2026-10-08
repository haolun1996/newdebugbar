import { cx } from '../../../app/hooks.js';
import { RequestTraceIcon } from './RequestTraceIcon.jsx';

const TONES = {
  received: 'ndb:text-slate-500 ndb:dark:text-slate-400',
  matched: 'ndb:text-violet-500/70 ndb:dark:text-violet-300/70',
  success: 'ndb:text-emerald-600/80 ndb:dark:text-emerald-400/75',
  error: 'ndb:text-red-600/80 ndb:dark:text-red-400/80',
  neutral: 'ndb:text-zinc-500 ndb:dark:text-zinc-400',
};

/**
 * One request lifecycle stage aligned along the shared trace (request-step.blade.php).
 * Props: label, icon, tone, last (no connecting line), primary (headline evidence), children (supporting evidence).
 */
export function RequestStep({
  label,
  icon,
  tone = 'neutral',
  last = false,
  primary,
  className,
  children,
  ...rest
}) {
  if (!TONES[tone]) throw new Error(`Unsupported request stage tone [${tone}].`);

  return (
    <li
      {...rest}
      className={cx(
        'ndb:grid ndb:grid-cols-[2rem_minmax(0,1fr)] ndb:gap-x-3 ndb:lg:grid-cols-[2.5rem_7rem_minmax(0,1fr)] ndb:lg:gap-x-5',
        { 'ndb:pb-8 ndb:lg:pb-10': !last },
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="ndb:relative ndb:col-start-1 ndb:row-start-1 ndb:row-end-4 ndb:lg:row-end-3"
      >
        {!last && (
          <span
            data-ndb-request-line=""
            className="ndb:absolute ndb:top-4 ndb:-bottom-12 ndb:left-1/2 ndb:w-px ndb:-translate-x-1/2 ndb:bg-zinc-200 ndb:lg:top-5 ndb:lg:-bottom-15 ndb:dark:bg-zinc-800"
          />
        )}
        <span
          data-ndb-request-dot=""
          className={cx(
            'ndb:relative ndb:z-[1] ndb:grid ndb:size-8 ndb:place-items-center ndb:rounded-full ndb:bg-zinc-100 ndb:lg:size-10 ndb:dark:bg-zinc-900',
            TONES[tone],
          )}
        >
          <RequestTraceIcon name={icon} className="ndb:size-5 ndb:lg:size-6" />
        </span>
      </div>

      <h3 className="ndb:col-start-2 ndb:row-start-1 ndb:flex ndb:h-8 ndb:items-center ndb:text-sm ndb:font-semibold ndb:leading-5 ndb:lg:h-10 ndb:lg:text-base">
        {label}
      </h3>

      <div
        data-ndb-request-primary=""
        className="ndb:col-start-2 ndb:row-start-2 ndb:min-w-0 ndb:pt-2 ndb:text-base ndb:leading-7 ndb:lg:col-start-3 ndb:lg:row-start-1 ndb:lg:py-1.5 ndb:lg:text-lg"
      >
        {primary}
      </div>

      <div
        className={cx(
          'ndb:col-start-2 ndb:row-start-3 ndb:min-w-0 ndb:pt-2 ndb:lg:col-start-3 ndb:lg:row-start-2 ndb:lg:pt-1',
          { 'ndb:border-b ndb:border-zinc-200/80 ndb:pb-6 ndb:dark:border-zinc-800/80': !last },
        )}
      >
        {children}
      </div>
    </li>
  );
}
