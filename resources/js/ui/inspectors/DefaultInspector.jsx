import { CodeBlock } from '../components/CodeBlock.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { countLabel } from './count-label.js';
import { fallbackItemLabel, prettyJson } from './fallback-view.js';

/** Renders collector data that has no specialized inspector view. */
export function DefaultInspector({ inspector }) {
  const items = Object.values(inspector.payload?.items ?? {});
  const label = String(inspector.label ?? '');

  if (items.length === 0) return <EmptyState label={`No ${label.toLowerCase()} were captured.`} />;

  return (
    <div className="ndb:flex ndb:min-h-0 ndb:flex-1 ndb:flex-col">
      <InspectorWorkspace
        mode="stream"
        frame="top"
        data-ndb-fallback-workspace=""
        controls={
          <InspectorListControls
            showSearch={false}
            leading={
              <p className="ndb:text-xs ndb:font-semibold ndb:text-zinc-600 ndb:dark:text-zinc-300">
                {countLabel(items.length, 'entry')}
              </p>
            }
          />
        }
        body={items.map((item, index) => (
          <details key={index} className="ndb:group ndb:m-0 ndb:bg-transparent ndb:p-0">
            <summary className="ndb:flex ndb:cursor-pointer ndb:list-none ndb:items-center ndb:gap-3 ndb:px-3 ndb:py-3 ndb:text-xs ndb:font-semibold ndb:focus-visible:outline-2 ndb:focus-visible:outline-inset ndb:focus-visible:outline-indigo-500 ndb:sm:px-4">
              <span className="ndb:text-xs ndb:font-bold ndb:tabular-nums ndb:text-zinc-400">
                {index + 1}
              </span>
              <span className="ndb:min-w-0 ndb:flex-1 ndb:truncate">{fallbackItemLabel(item, label)}</span>
              <span className="ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:group-open:hidden">
                Show
              </span>
              <span className="ndb:hidden ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:group-open:inline">
                Hide
              </span>
            </summary>
            <CodeBlock
              language="json"
              className="ndb:rounded-none ndb:border-t ndb:border-zinc-200 ndb:dark:border-zinc-800"
              source={prettyJson(item)}
            />
          </details>
        ))}
        bodyProps={{ className: 'ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800' }}
      />
    </div>
  );
}
