import { cx, useShell } from '../../app/hooks.js';
import { Icon } from '../components/Icon.jsx';
import { PopoverSurface } from '../components/PopoverSurface.jsx';
import { RequestOption } from './RequestOption.jsx';
import { useClickOutside } from './useClickOutside.js';

const PRIMARY_HOOKS = {
  toolbar: { 'data-ndb-toolbar': 'request' },
  corner: { 'data-ndb-corner-request': '' },
  'header-mobile': { 'data-ndb-header-mobile-request': '' },
  header: { 'data-ndb-header-request': '' },
};
const PATH_HOOKS = {
  toolbar: { 'data-ndb-toolbar-request-path': '' },
  'header-mobile': { 'data-ndb-header-mobile-request-path': '' },
};
const STATUS_HOOKS = {
  toolbar: { 'data-ndb-toolbar-status': '' },
  'header-mobile': { 'data-ndb-header-mobile-status': '' },
  header: { 'data-ndb-header-status': '' },
};
const SIZE_HOOKS = {
  toolbar: { 'data-ndb-toolbar-response-size': '' },
  header: { 'data-ndb-header-response-size': '' },
};

function RequestGroup({ scope, group, heading, headingClass, hidden, requests, className }) {
  const headingId = `newdebugbar-${group}-request${group === 'current' ? '' : 's'}-${scope}`;

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      data-ndb-request-group={group}
      hidden={hidden}
      className={className}
    >
      <p id={headingId} className={headingClass}>
        {heading}
      </p>
      {requests.map((request) => (
        <RequestOption key={`${scope}-${group}-${request.id}`} request={request} />
      ))}
    </div>
  );
}

/** Shows the selected request and opens the bounded recent-request picker. */
export function RequestSwitcher({ scope, direction = 'dynamic', className, ...rest }) {
  const shell = useShell();
  const summary = shell.summary;
  const open = shell.requestPickerScope === scope;
  const switcherRef = useClickOutside(() => {
    if (shell.requestPickerScope === scope) shell.closeRequestPicker(false);
  });

  const onListKeyDown = (event) => {
    const listbox = event.currentTarget;
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      shell.closeRequestPicker();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      shell.moveRequestPicker(1, listbox);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      shell.moveRequestPicker(-1, listbox);
    } else if (event.key === 'Home') {
      event.preventDefault();
      shell.focusRequestPickerEdge('start', listbox);
    } else if (event.key === 'End') {
      event.preventDefault();
      shell.focusRequestPickerEdge('end', listbox);
    }
  };

  const current = shell.currentRequestProfile;
  const groupHeading =
    'ndb:px-2.5 ndb:py-1 ndb:text-xs ndb:font-bold ndb:uppercase ndb:tracking-wider ndb:text-zinc-400';

  return (
    <div
      ref={switcherRef}
      data-ndb-request-switcher={scope}
      {...rest}
      className={cx('ndb:relative ndb:flex ndb:min-w-0 ndb:self-stretch', className)}
    >
      <div
        data-ndb-request-control
        className={cx(
          'ndb:flex ndb:min-w-0 ndb:flex-1 ndb:overflow-visible ndb:rounded-xl ndb:border ndb:border-zinc-200/80 ndb:bg-white/35 ndb:transition-colors ndb:dark:border-white/10 ndb:dark:bg-white/5',
          open ? 'ndb:bg-zinc-100 ndb:dark:bg-white/10' : '',
        )}
      >
        <button
          type="button"
          {...PRIMARY_HOOKS[scope]}
          onClick={(event) => shell.openRequestInspector(event.currentTarget)}
          aria-label="Open current request in Requests"
          className="ndb:flex ndb:min-w-0 ndb:flex-1 ndb:items-center ndb:gap-1 ndb:rounded-l-xl ndb:py-1.5 ndb:pl-1.5 ndb:pr-1.5 ndb:text-left ndb:transition-colors ndb:hover:bg-zinc-100 ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:min-[360px]:gap-2 ndb:min-[360px]:pl-2.5 ndb:min-[360px]:pr-4 ndb:dark:hover:bg-white/10"
        >
          {scope === 'corner' ? (
            <span className="ndb:min-w-0 ndb:flex-1">
              <span className="ndb:flex ndb:min-w-0 ndb:items-baseline ndb:gap-1.5">
                <span
                  data-ndb-request-method="corner"
                  className="ndb:shrink-0 ndb:text-xs ndb:font-bold ndb:uppercase ndb:tracking-wider ndb:text-zinc-500 ndb:dark:text-zinc-400"
                >
                  {summary.method}
                </span>
                <span
                  data-ndb-corner-request-path
                  className="ndb:min-w-0 ndb:truncate ndb:text-xs ndb:font-semibold"
                  title={summary.path}
                >
                  {summary.path}
                </span>
              </span>
              <span className="ndb:flex ndb:items-center ndb:gap-1.5 ndb:whitespace-nowrap ndb:text-xs ndb:font-medium ndb:text-zinc-400">
                <span data-ndb-corner-request-status className={shell.requestStatusClass(summary.status)}>
                  {summary.status}
                </span>
                <span
                  className="ndb:hidden ndb:font-semibold ndb:text-zinc-500 ndb:lg:inline ndb:dark:text-zinc-300"
                  hidden={!summary.response_size}
                >
                  {summary.response_size}
                </span>
              </span>
            </span>
          ) : (
            <>
              <span
                data-ndb-request-method={scope}
                className="ndb:flex ndb:shrink-0 ndb:items-center ndb:justify-center ndb:rounded-md ndb:bg-indigo-100/60 ndb:px-1.5 ndb:py-0.5 ndb:text-xs ndb:font-bold ndb:uppercase ndb:tracking-wide ndb:text-indigo-700 ndb:dark:bg-white/10 ndb:dark:text-white"
              >
                {summary.method}
              </span>
              <span className="ndb:min-w-0">
                <span
                  {...PATH_HOOKS[scope]}
                  className="ndb:block ndb:truncate ndb:text-xs ndb:font-semibold"
                  title={summary.path}
                >
                  {summary.path}
                </span>
                <span className="ndb:flex ndb:items-center ndb:gap-1.5 ndb:whitespace-nowrap ndb:text-xs ndb:font-medium ndb:text-zinc-400">
                  <span {...STATUS_HOOKS[scope]} className={shell.requestStatusClass(summary.status)}>
                    {summary.status}
                  </span>
                  <span
                    {...SIZE_HOOKS[scope]}
                    className="ndb:hidden ndb:font-semibold ndb:text-zinc-500 ndb:lg:inline ndb:dark:text-zinc-300"
                    hidden={!summary.response_size}
                  >
                    {summary.response_size}
                  </span>
                </span>
              </span>
            </>
          )}
        </button>

        <button
          type="button"
          data-ndb-request-picker-trigger={scope}
          onClick={(event) => {
            event.stopPropagation();
            shell.toggleRequestPicker(scope, event.currentTarget);
          }}
          aria-expanded={open}
          disabled={!shell.hasOtherRequests}
          aria-controls={`newdebugbar-request-list-${scope}`}
          aria-haspopup="listbox"
          aria-label={shell.requestPickerButtonLabel}
          title={shell.requestPickerButtonLabel}
          className="ndb:relative ndb:flex ndb:shrink-0 ndb:items-center ndb:justify-center ndb:rounded-r-xl ndb:border-l ndb:border-zinc-200/80 ndb:px-0.5 ndb:text-zinc-400 ndb:transition-colors ndb:hover:bg-zinc-100 ndb:hover:text-zinc-700 ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:disabled:cursor-default ndb:disabled:text-zinc-300 ndb:disabled:hover:bg-transparent ndb:dark:border-white/10 ndb:dark:hover:bg-white/10 ndb:dark:hover:text-zinc-200 ndb:dark:disabled:text-zinc-700 ndb:dark:disabled:hover:bg-transparent"
        >
          <span
            className={cx(
              'ndb:flex ndb:transition-transform ndb:motion-reduce:transition-none',
              open ? 'ndb:rotate-180' : '',
            )}
          >
            <Icon name="chevron-down" className="ndb:size-3.5" />
          </span>
          <span
            hidden={!(shell.unreadRequestCount > 0)}
            data-ndb-request-badge={scope}
            aria-hidden="true"
            className="ndb:absolute ndb:-top-1.5 ndb:-right-1.5 ndb:flex ndb:h-4 ndb:min-w-4 ndb:items-center ndb:justify-center ndb:rounded-full ndb:bg-indigo-600 ndb:px-1 ndb:text-xs ndb:font-bold ndb:leading-none ndb:text-white ndb:tabular-nums ndb:dark:bg-indigo-600 ndb:dark:text-white"
          >
            {shell.requestBadgeCount}
          </span>
        </button>
      </div>

      <PopoverSurface
        id={`newdebugbar-request-list-${scope}`}
        hidden={!open}
        data-ndb-request-popover={scope}
        style={{ '--ndb-request-arrow-left': `${shell.requestPickerArrowLeft}px` }}
        direction={direction}
        align={scope === 'corner' ? 'dynamic' : 'left'}
        widthClass="ndb:w-[calc(100vw-1.5rem)] ndb:max-w-sm"
        surfaceClass="ndb:p-0"
        arrowClass="ndb:left-[var(--ndb-request-arrow-left)]"
      >
        <div
          data-ndb-request-popover-heading
          className="ndb:border-b ndb:border-zinc-200/80 ndb:px-3 ndb:py-2.5 ndb:dark:border-zinc-800"
        >
          <span className="ndb:text-xs ndb:font-bold">Requests</span>
        </div>

        <div
          role="listbox"
          aria-label="Recent requests"
          onKeyDown={onListKeyDown}
          className="ndb-scrollbar ndb:max-h-[min(24rem,60vh)] ndb:overflow-y-auto ndb:p-1.5"
        >
          <RequestGroup
            scope={scope}
            group="current"
            heading="Current request"
            headingClass="ndb:px-2.5 ndb:pt-1 ndb:pb-1 ndb:text-xs ndb:font-bold ndb:uppercase ndb:tracking-wider ndb:text-zinc-400"
            requests={current ? [current] : []}
          />
          <RequestGroup
            scope={scope}
            group="later"
            heading="Later requests"
            headingClass={groupHeading}
            hidden={!(shell.laterRequestCount > 0)}
            requests={shell.laterRequestProfiles}
            className="ndb:mt-1 ndb:pt-1"
          />
          <RequestGroup
            scope={scope}
            group="other"
            heading="Recent API requests"
            headingClass={groupHeading}
            hidden={!(shell.otherRequestProfiles.length > 0)}
            requests={shell.otherRequestProfiles}
            className="ndb:mt-1 ndb:pt-1"
          />
        </div>
      </PopoverSurface>
    </div>
  );
}
