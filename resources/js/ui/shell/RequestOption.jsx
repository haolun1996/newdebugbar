import { cx, useShell } from '../../app/hooks.js';
import { Icon } from '../components/Icon.jsx';

/** One fixed-column request option shared by the current, later, and other request groups. */
export function RequestOption({ request }) {
  const shell = useShell();
  const selected = request.id === shell.summary.id;
  const pending = shell.requestSelectionPending === request.id;
  const unread = shell.requestIsUnread(request);

  return (
    <button
      type="button"
      role="option"
      data-ndb-request-option
      data-ndb-profile-id={request.id}
      aria-selected={selected}
      aria-busy={pending ? 'true' : undefined}
      onClick={() => shell.selectRequest(request.id)}
      className={cx(
        'ndb:flex ndb:w-full ndb:min-w-0 ndb:items-center ndb:gap-2.5 ndb:rounded-xl ndb:px-2.5 ndb:py-2 ndb:text-left ndb:transition-colors ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500',
        selected
          ? 'ndb:bg-indigo-100/60 ndb:text-indigo-950 ndb:dark:bg-indigo-950/70 ndb:dark:text-indigo-100'
          : pending
            ? 'ndb:opacity-60'
            : 'ndb:hover:bg-zinc-100/70 ndb:dark:hover:bg-white/10',
      )}
    >
      <span
        data-ndb-request-unread
        className={cx(
          'ndb:size-1.5 ndb:shrink-0 ndb:rounded-full ndb:bg-blue-500',
          unread ? 'ndb:opacity-100' : 'ndb:opacity-0',
        )}
      >
        <span className="ndb:sr-only">{unread ? 'Unread' : ''}</span>
      </span>
      <span
        data-ndb-request-method
        className="ndb:flex ndb:w-12 ndb:shrink-0 ndb:items-center ndb:justify-center ndb:rounded-md ndb:bg-zinc-100/70 ndb:py-0.5 ndb:text-xs ndb:font-bold ndb:uppercase ndb:tracking-wide ndb:text-zinc-600 ndb:dark:bg-white/10 ndb:dark:text-white"
      >
        {request.method}
      </span>
      <span className="ndb:min-w-0 ndb:flex-1">
        <span
          className="ndb:block ndb:truncate ndb:text-xs ndb:font-semibold"
          title={request.title ?? 'Request'}
        >
          {request.title ?? 'Request'}
        </span>
        <span className="ndb:mt-0.5 ndb:flex ndb:flex-wrap ndb:items-center ndb:gap-x-2 ndb:gap-y-0.5 ndb:text-xs ndb:font-medium ndb:text-zinc-400">
          <span>{request.request_type_label ?? 'Request'}</span>
          <span className="ndb:tabular-nums">{request.duration_label}</span>
          <span className="ndb:tabular-nums">
            {`${request.query_count}${request.query_count === 1 ? ' query' : ' queries'}`}
          </span>
          <time dateTime={request.recorded_at}>{shell.relativeRequestTime(request)}</time>
        </span>
      </span>
      <span
        data-ndb-request-status
        className={cx(
          'ndb:w-8 ndb:shrink-0 ndb:self-center ndb:text-center ndb:text-xs ndb:font-bold ndb:tabular-nums',
          shell.requestStatusClass(request.status),
        )}
      >
        {request.status}
      </span>
      <span
        data-ndb-request-current
        aria-hidden="true"
        className={cx(
          'ndb:flex ndb:size-4 ndb:shrink-0 ndb:self-center ndb:items-center ndb:justify-center ndb:text-indigo-600 ndb:transition-opacity ndb:dark:text-indigo-300',
          selected ? 'ndb:opacity-100' : 'ndb:opacity-0',
        )}
      >
        <Icon name="check" className="ndb:size-3.5" />
      </span>
    </button>
  );
}
