import { useState } from 'react';
import { useShellContext } from '../../../app/hooks.js';
import { CodeBlock } from '../../components/CodeBlock.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { FilterTab } from '../../components/FilterTab.jsx';
import { InspectorAction } from '../../components/InspectorAction.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorDetailTabs } from '../../components/InspectorDetailTabs.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { InspectorStack } from '../../components/InspectorStack.jsx';
import { countLabel } from '../count-label.js';
import { exceptionCauses, exceptionSourceText, exceptionTabs, filled } from './exception-view.js';

function Causes({ causes, truncated }) {
  return (
    <section data-ndb-exception-detail-panel="causes" className="ndb:p-3 ndb:sm:p-4">
      <div className="ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800">
        {causes.map((cause, causeIndex) => (
          <article
            key={causeIndex}
            data-ndb-exception-cause={causeIndex}
            className="ndb:border-l-0 ndb:bg-transparent ndb:px-0 ndb:py-3 ndb:first:pt-0 ndb:last:pb-0"
          >
            <div className="ndb:flex ndb:min-w-0 ndb:flex-wrap ndb:items-center ndb:justify-between ndb:gap-2">
              <p className="ndb:text-xs ndb:font-bold ndb:text-zinc-500 ndb:dark:text-zinc-400">
                Cause {causeIndex + 1}
              </p>
              {cause.file != null && cause.line != null ? (
                <InspectorSourceLink copy={`${cause.file}:${cause.line}`} aria-label="Copy cause source">
                  {cause.file}:{cause.line}
                </InspectorSourceLink>
              ) : null}
            </div>
            <code className="ndb:mt-2 ndb:block ndb:min-w-0 ndb:break-words ndb:bg-transparent ndb:font-mono ndb:text-xs ndb:font-semibold ndb:text-zinc-900 ndb:dark:text-zinc-100">
              {cause.class ?? 'Throwable'}
            </code>
            <p className="ndb:mt-1 ndb:break-words ndb:text-xs ndb:font-medium ndb:leading-5 ndb:text-zinc-700 ndb:[overflow-wrap:anywhere] ndb:dark:text-zinc-200">
              {filled(cause.message) ? cause.message : 'No exception message was captured.'}
            </p>
          </article>
        ))}
      </div>

      {truncated ? (
        <p className="ndb:mt-3 ndb:text-xs ndb:font-semibold ndb:text-amber-700 ndb:sm:mt-4 ndb:dark:text-amber-300">
          More causes exist, but only the first five were retained.
        </p>
      ) : null}
    </section>
  );
}

/** One exception's header, source, stacks, and retained causes. */
export function ExceptionDetail({ exception, index, profileActionLabel = 'Open request' }) {
  const { store } = useShellContext();
  const [tab, setTab] = useState('source');
  const applicationFrames = Object.values(exception.frames?.application ?? {});
  const vendorFrames = Object.values(exception.frames?.vendor ?? {});
  const causes = exceptionCauses(exception);
  const sourceText = exceptionSourceText(Object.values(exception.source?.lines ?? {}));
  const location = `${exception.file}:${exception.line}`;

  return (
    <article data-ndb-exception-detail={index}>
      <InspectorDetailHeader
        title={
          <div data-ndb-exception-header-copy="" className="ndb:min-w-0">
            <h3 className="ndb:min-w-0 ndb:text-sm ndb:font-bold">
              <code className="ndb:block ndb:break-words ndb:font-mono">{exception.class}</code>
            </h3>
            <p className="ndb:mt-1 ndb:text-xs ndb:font-semibold ndb:leading-5">
              {exception.message || 'No exception message was captured.'}
            </p>
          </div>
        }
        aside={
          <InspectorSourceLink
            data-ndb-copy-exception-callsite={index}
            copy={location}
            aria-label="Copy exception source"
          >
            {location}
          </InspectorSourceLink>
        }
      />

      <InspectorDetailTabs
        label="Exception detail"
        aside={
          <InspectorAction
            icon="external-link"
            data-ndb-exception-context-action=""
            onClick={() => store.state.navigateToInspector('request')}
          >
            {profileActionLabel}
          </InspectorAction>
        }
      >
        {exceptionTabs(causes).map(([key, label]) => (
          <FilterTab
            key={key}
            variant="segmented"
            data-ndb-exception-detail-tab={key}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
          >
            {label}
          </FilterTab>
        ))}
      </InspectorDetailTabs>

      {tab === 'source' ? (
        <section data-ndb-exception-detail-panel="source">
          {sourceText !== null ? (
            <CodeBlock language="php" className="ndb:rounded-none ndb:border-0" source={sourceText} />
          ) : (
            <EmptyState label="No source context was captured for this exception." />
          )}
        </section>
      ) : null}

      {tab === 'stack' ? (
        <section data-ndb-exception-detail-panel="stack" className="ndb:p-3 ndb:sm:p-4">
          <InspectorStack
            frames={applicationFrames}
            emptyLabel="No application frames were captured."
            className="ndb:mt-0"
          />

          <details className="ndb:group ndb:mt-4 ndb:border-t ndb:border-zinc-200/90 ndb:pt-3 ndb:sm:mt-5 ndb:dark:border-zinc-800">
            <summary className="ndb:flex ndb:cursor-pointer ndb:list-none ndb:items-center ndb:justify-between ndb:gap-3 ndb:text-xs ndb:font-bold ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500">
              <span>Vendor stack</span>
              <span className="ndb:text-xs ndb:font-medium ndb:tabular-nums ndb:text-zinc-400">
                {countLabel(vendorFrames.length, 'frame')}
              </span>
            </summary>
            <InspectorStack
              frames={vendorFrames}
              showHeading={false}
              emptyLabel="No vendor frames were captured."
              className="ndb:mt-2"
            />
          </details>
        </section>
      ) : null}

      {tab === 'causes' && causes.length > 0 ? (
        <Causes causes={causes} truncated={Boolean(exception.chain_truncated)} />
      ) : null}
    </article>
  );
}
