import { useMemo, useState } from 'react';
import { cx } from '../../app/hooks.js';
import { HighlightedCode } from '../components/CodeBlock.jsx';
import { CopyButton } from '../components/CopyButton.jsx';
import { Icon } from '../components/Icon.jsx';
import { IconButton } from '../components/IconButton.jsx';
import { InspectorOperationBadge } from '../components/InspectorOperationBadge.jsx';
import { detailGroupCopy, formatRequestValue, requestView } from './request/request.js';
import { RequestMiddleware } from './request/RequestMiddleware.jsx';
import { RequestStep } from './request/RequestStep.jsx';

const TERM = 'ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400';

function Fact({ label, className, valueClassName, children }) {
  return (
    <div className={cx('ndb:min-w-0', className)}>
      <dt className={TERM}>{label}</dt>
      <dd className={cx('ndb:mt-1', valueClassName)}>{children}</dd>
    </div>
  );
}

function RequestTrace({ view }) {
  return (
    <div data-ndb-request-trace="">
      <ol
        data-ndb-request-timeline=""
        className="ndb:list-none ndb:p-0 ndb:sm:px-6"
        aria-label="Request trace"
      >
        <RequestStep
          data-ndb-request-step="received"
          label="Received"
          icon="received"
          tone="received"
          primary={
            <div className="ndb:flex ndb:min-w-0 ndb:items-start ndb:gap-3">
              <InspectorOperationBadge data-ndb-request-method="" className="ndb:mt-1 ndb:leading-4">
                {view.method}
              </InspectorOperationBadge>
              <span
                data-ndb-request-path=""
                className="ndb:min-w-0 ndb:font-semibold ndb:[overflow-wrap:anywhere]"
              >
                {view.path}
              </span>
              {view.url !== '' && (
                <IconButton
                  data-ndb-request-copy=""
                  name="copy"
                  copy={view.url}
                  colorOnly
                  aria-label="Copy request URL"
                  className="ndb:size-7 ndb:shrink-0 ndb:rounded-md"
                />
              )}
            </div>
          }
        >
          {view.origin !== '' && (
            <p className="ndb:text-sm ndb:leading-5 ndb:text-zinc-500 ndb:[overflow-wrap:anywhere] ndb:dark:text-zinc-400">
              {view.origin}
            </p>
          )}
          {view.requestSize !== null && (
            <dl data-ndb-request-size="" className="ndb:mt-3 ndb:flex ndb:gap-3 ndb:text-sm ndb:leading-5">
              <dt className="ndb:text-zinc-500 ndb:dark:text-zinc-400">Request size</dt>
              <dd className="ndb:tabular-nums">{view.requestSize}</dd>
            </dl>
          )}
        </RequestStep>

        <RequestStep
          data-ndb-request-step="matched"
          label="Matched"
          icon="matched"
          tone="matched"
          primary={
            <HighlightedCode
              data-ndb-request-controller=""
              language="php"
              source={view.actionName}
              className="ndb:font-medium ndb:[overflow-wrap:anywhere]"
            />
          }
        >
          {view.actionNamespace !== '' && (
            <HighlightedCode
              language="php"
              source={view.actionNamespace}
              className="ndb:block ndb:text-sm ndb:leading-5 ndb:text-zinc-500 ndb:[overflow-wrap:anywhere] ndb:dark:text-zinc-400"
            />
          )}
          <dl className="ndb:mt-4 ndb:grid ndb:max-w-3xl ndb:grid-cols-2 ndb:gap-x-5 ndb:gap-y-4 ndb:text-sm ndb:leading-5 ndb:lg:grid-cols-3">
            <Fact label="Route" valueClassName="ndb:[overflow-wrap:anywhere]">
              {view.route}
            </Fact>
            <Fact label="Middleware">
              {view.middleware.length > 0 ? <RequestMiddleware middleware={view.middleware} /> : 'None'}
            </Fact>
            <Fact label="Guard" valueClassName="ndb:[overflow-wrap:anywhere]">
              {view.guard}
            </Fact>
            <Fact
              label="Authentication"
              className="ndb:col-span-full"
              valueClassName="ndb:[overflow-wrap:anywhere]"
            >
              {view.authenticationModel !== null ? (
                <HighlightedCode
                  language="php"
                  source={String(view.authenticationModel)}
                  className="ndb:text-sm"
                />
              ) : (
                view.authenticationLabel
              )}
            </Fact>
          </dl>
        </RequestStep>

        <RequestStep
          data-ndb-request-step="responded"
          label="Responded"
          icon={view.tone}
          tone={view.tone}
          last
          primary={
            <p
              data-ndb-request-status=""
              className={cx(
                'ndb:text-xl ndb:font-medium ndb:leading-7 ndb:tabular-nums ndb:[overflow-wrap:anywhere] ndb:lg:text-2xl',
                {
                  'ndb:text-emerald-600 ndb:dark:text-emerald-400': view.succeeded,
                  'ndb:text-red-600 ndb:dark:text-red-400': view.failed,
                },
              )}
            >
              {view.statusLabel}
            </p>
          }
        >
          <dl className="ndb:mt-2 ndb:grid ndb:max-w-3xl ndb:grid-cols-2 ndb:gap-x-5 ndb:gap-y-4 ndb:text-sm ndb:leading-5 ndb:lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Fact
              label="Content type"
              className="ndb:col-span-full ndb:lg:col-span-1"
              valueClassName="ndb:[overflow-wrap:anywhere]"
            >
              {view.contentType}
            </Fact>
            <Fact label="Response size" valueClassName="ndb:tabular-nums">
              {view.responseSize}
            </Fact>
            <Fact label="Total duration" valueClassName="ndb:tabular-nums">
              {view.duration}
            </Fact>
          </dl>
        </RequestStep>
      </ol>
    </div>
  );
}

function DetailTable({ items }) {
  return (
    <table className="ndb:w-full ndb:table-fixed ndb:border-collapse ndb:text-left">
      <thead>
        <tr className="ndb:border-b ndb:border-zinc-200/90 ndb:dark:border-zinc-800">
          <th
            scope="col"
            className="ndb:w-2/5 ndb:pb-2 ndb:pr-4 ndb:text-xs ndb:font-semibold ndb:uppercase ndb:tracking-wider ndb:text-zinc-400"
          >
            Name
          </th>
          <th
            scope="col"
            className="ndb:pb-2 ndb:text-xs ndb:font-semibold ndb:uppercase ndb:tracking-wider ndb:text-zinc-400"
          >
            Value
          </th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(items).map(([name, value]) => (
          <tr
            key={name}
            className="ndb:border-b ndb:border-zinc-200/70 ndb:last:border-b-0 ndb:dark:border-zinc-800/80"
          >
            <th
              scope="row"
              className="ndb:py-2 ndb:pr-4 ndb:align-top ndb:text-xs ndb:font-medium ndb:text-zinc-600 ndb:dark:text-zinc-300"
            >
              {name}
            </th>
            <td className="ndb:break-words ndb:py-2 ndb:align-top ndb:text-xs ndb:text-zinc-800 ndb:dark:text-zinc-200">
              {formatRequestValue(value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RequestDetails({ groups }) {
  const [selected, setSelected] = useState('headers');

  return (
    <details
      data-ndb-request-details=""
      className="ndb:group ndb:mt-4 ndb:overflow-hidden ndb:rounded-xl ndb:border ndb:border-zinc-200/90 ndb:bg-white/45 ndb:sm:mx-6 ndb:sm:mt-8 ndb:dark:border-zinc-800 ndb:dark:bg-zinc-900/25"
    >
      <summary className="ndb:flex ndb:cursor-pointer ndb:list-none ndb:items-center ndb:gap-3 ndb:px-3 ndb:py-3 ndb:focus-visible:outline-2 ndb:focus-visible:outline-inset ndb:focus-visible:outline-indigo-500 ndb:sm:px-4">
        <span className="ndb:min-w-0 ndb:flex-1">
          <span className="ndb:block ndb:text-sm ndb:font-semibold">Request details</span>
          <span className="ndb:mt-0.5 ndb:block ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
            Headers, input, query parameters, and session
          </span>
        </span>
        <Icon
          name="chevron-down"
          size={3.5}
          className="ndb:text-zinc-400 ndb:transition ndb:group-open:rotate-180"
        />
      </summary>
      <div className="ndb:border-t ndb:border-zinc-200/90 ndb:sm:grid ndb:sm:grid-cols-[11rem_minmax(0,1fr)] ndb:dark:border-zinc-800">
        <div className="ndb:grid ndb:grid-cols-2 ndb:gap-1 ndb:border-b ndb:border-zinc-200/90 ndb:bg-zinc-50/70 ndb:p-2 ndb:sm:block ndb:sm:border-r ndb:sm:border-b-0 ndb:dark:border-zinc-800 ndb:dark:bg-zinc-900/50">
          {groups.map((group) => (
            <button
              key={group.key}
              type="button"
              data-ndb-request-detail={group.key}
              onClick={() => setSelected(group.key)}
              aria-pressed={selected === group.key ? 'true' : 'false'}
              className={cx(
                'ndb:flex ndb:w-full ndb:min-w-0 ndb:items-center ndb:gap-2 ndb:rounded-lg ndb:px-3 ndb:py-2 ndb:text-left ndb:transition ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-1 ndb:focus-visible:outline-indigo-500',
                selected === group.key
                  ? 'ndb:bg-indigo-50 ndb:text-indigo-700 ndb:dark:bg-indigo-950/70 ndb:dark:text-indigo-300'
                  : 'ndb:text-zinc-600 ndb:hover:bg-white ndb:hover:text-zinc-950 ndb:dark:text-zinc-400 ndb:dark:hover:bg-zinc-800 ndb:dark:hover:text-white',
              )}
            >
              <span className="ndb:min-w-0 ndb:flex-1 ndb:truncate ndb:text-xs ndb:font-bold">
                {group.label}
              </span>
              <span
                data-ndb-request-detail-count=""
                className="ndb:shrink-0 ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-400"
              >
                {group.count}
              </span>
            </button>
          ))}
        </div>

        <div className="ndb:min-w-0 ndb:p-3 ndb:sm:p-4">
          {groups.map((group) => (
            <div key={group.key} data-ndb-request-detail-panel={group.key} hidden={selected !== group.key}>
              <div className="ndb:flex ndb:items-center ndb:justify-between ndb:gap-3">
                <div className="ndb:flex ndb:min-w-0 ndb:items-baseline ndb:gap-3">
                  <h3 className="ndb:text-xs ndb:font-bold">{group.label}</h3>
                  <span
                    data-ndb-request-detail-panel-count=""
                    className="ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-400"
                  >
                    {group.count}
                  </span>
                </div>
                <CopyButton
                  copy={detailGroupCopy(group.items)}
                  className="ndb:shrink-0 ndb:text-xs ndb:font-bold ndb:text-indigo-600 ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-indigo-300"
                >
                  Copy all
                </CopyButton>
              </div>

              <div className="ndb:mt-3 ndb:overflow-x-auto">
                {Object.keys(group.items).length > 0 ? (
                  <DetailTable items={group.items} />
                ) : (
                  <p className="ndb:rounded-lg ndb:bg-zinc-50 ndb:px-3 ndb:py-3 ndb:text-xs ndb:text-zinc-500 ndb:sm:py-4 ndb:dark:bg-zinc-900 ndb:dark:text-zinc-400">
                    No {group.label.toLowerCase()} were captured.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function RuntimeSummary({ facts }) {
  return (
    <div className="ndb:rounded-xl ndb:border ndb:border-zinc-200 ndb:p-3 ndb:sm:p-4 ndb:dark:border-zinc-800">
      <h3 className="ndb:text-xs ndb:font-bold">Runtime summary</h3>
      <dl className="ndb:mt-3 ndb:grid ndb:grid-cols-2 ndb:gap-x-3 ndb:gap-y-2 ndb:sm:mt-4 ndb:sm:grid-cols-4 ndb:sm:gap-x-5 ndb:sm:gap-y-3">
        {facts.map(([label, value]) => (
          <div key={label} className="ndb:min-w-0">
            <dt className="ndb:text-xs ndb:font-semibold ndb:uppercase ndb:tracking-wider ndb:text-zinc-400">
              {label}
            </dt>
            <dd className="ndb:mt-1 ndb:truncate ndb:text-xs ndb:font-semibold">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Renders the HTTP request trace and captured request data (request.blade.php). */
export function RequestInspector({ inspector, profile }) {
  const view = useMemo(() => requestView(inspector.payload, profile), [inspector.payload, profile]);

  if (!view.isHttp) return <RuntimeSummary facts={view.runtimeFacts} />;

  return (
    <>
      <RequestTrace view={view} />
      <RequestDetails groups={view.detailGroups} />
    </>
  );
}
