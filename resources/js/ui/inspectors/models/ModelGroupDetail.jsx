import { formatActivity, formatNumber, sourceLocation } from '../../../inspectors/models.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { FilterTab } from '../../components/FilterTab.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorDetailTabs } from '../../components/InspectorDetailTabs.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { ModelRecords } from './ModelRecords.jsx';
import { ModelWrites } from './ModelWrites.jsx';

const TABS = [
  ['records', 'Records'],
  ['source', 'Source'],
];

const PANEL = 'ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white';

const text = (value) => (typeof value === 'string' && value !== '' ? value : '—');

function ModelSource({ source }) {
  const callsite = source.callsite ?? null;
  const path = sourceLocation(callsite);
  const templateFile =
    callsite?.kind === 'compiled_view' && typeof callsite.template_file === 'string'
      ? callsite.template_file
      : null;

  return (
    <article
      data-ndb-model-source=""
      className="ndb:grid ndb:min-w-0 ndb:gap-2 ndb:border-l-0 ndb:bg-transparent ndb:px-0 ndb:py-3 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white ndb:sm:grid-cols-[minmax(0,1fr)_10rem] ndb:sm:items-start ndb:sm:gap-3"
    >
      <div className="ndb:min-w-0">
        {templateFile !== null ? (
          <>
            <p
              data-ndb-model-compiled-source=""
              className="ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-xs ndb:font-semibold ndb:text-zinc-400"
            >
              Blade template
            </p>
            <InspectorSourceLink
              data-ndb-model-source-path="template"
              copy={templateFile}
              className="ndb:mt-0.5 ndb:break-all ndb:text-xs"
            >
              {templateFile}
            </InspectorSourceLink>
            <p className="ndb:mt-2 ndb:text-xs ndb:text-zinc-400">Compiled location</p>
            <p
              data-ndb-model-source-path="compiled"
              className="ndb:mt-0.5 ndb:break-all ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400"
            >
              {path ?? 'Source unavailable'}
            </p>
          </>
        ) : path !== null ? (
          <InspectorSourceLink
            data-ndb-model-source-path="application"
            copy={path}
            className="ndb:break-all ndb:text-xs"
          >
            {path}
          </InspectorSourceLink>
        ) : (
          <span className="ndb:text-xs ndb:text-zinc-400">Source unavailable</span>
        )}
      </div>
      <div className="ndb:sm:text-right">
        <p className="ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:sm:hidden">Activity</p>
        <p className="ndb:mt-0.5 ndb:text-xs ndb:text-zinc-600 ndb:dark:text-zinc-300 ndb:sm:mt-0">
          {formatActivity(Number(source.retrieval_count ?? 0), Number(source.change_count ?? 0))}
        </p>
      </div>
    </article>
  );
}

function ModelSources({ group }) {
  const sources = Array.isArray(group.sources) ? group.sources : [];

  return (
    <section data-ndb-model-sources="" className={PANEL}>
      {sources.length > 0 ? (
        <>
          <div
            data-ndb-model-source-list=""
            className="ndb:border-y ndb:border-zinc-200/90 ndb:dark:border-zinc-800"
          >
            <div
              data-ndb-model-source-heading=""
              aria-hidden="true"
              className="ndb:hidden ndb:grid-cols-[minmax(0,1fr)_10rem] ndb:gap-3 ndb:border-b ndb:border-zinc-200/90 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:dark:border-zinc-800 ndb:sm:grid"
            >
              <span>Source</span>
              <span className="ndb:text-right">Activity</span>
            </div>

            <div className="ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800">
              {sources.map((source, index) => (
                <ModelSource key={index} source={source} />
              ))}
            </div>
          </div>

          {Number(group.hidden_source_count ?? 0) > 0 ? (
            <p className="ndb:mt-2 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
              Showing {formatNumber(sources.length)} of {formatNumber(group.source_count ?? 0)} application
              sources.
            </p>
          ) : null}
        </>
      ) : (
        <div
          data-ndb-model-source-gap=""
          className="ndb:mt-3 ndb:border-l-0 ndb:border-y ndb:border-zinc-200/90 ndb:bg-transparent ndb:px-0 ndb:py-3 ndb:text-xs ndb:text-zinc-950 ndb:dark:border-zinc-800 ndb:dark:text-white"
        >
          <p className="ndb:text-xs ndb:font-semibold">Source unavailable</p>
        </div>
      )}
    </section>
  );
}

/** One model context's records and sources; only the active tab is mounted (model-group-detail.blade.php). */
export function ModelGroupDetail({ group, tab, onTab }) {
  const retrievals = Number(group.load_count ?? 0);
  const operations = Array.isArray(group.change_operations)
    ? group.change_operations
    : Object.values(group.change_operations ?? {});

  return (
    <div data-ndb-model-detail="" className={PANEL}>
      <InspectorDetailHeader
        data-ndb-model-header=""
        className="ndb:border-l-0 ndb:bg-transparent ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white"
        title={
          <h3
            data-ndb-model-class=""
            className="ndb:min-w-0 ndb:break-all ndb:text-base ndb:font-semibold ndb:leading-6 ndb:text-zinc-950 ndb:dark:text-white"
          >
            {group.model}
          </h3>
        }
        metadataProps={{ className: 'ndb:gap-x-3 ndb:gap-y-2 ndb:sm:gap-x-8' }}
        metadata={
          <>
            <div className="ndb:min-w-0">
              <dt className="ndb:text-xs ndb:font-semibold ndb:text-zinc-400">Connection</dt>
              <dd className="ndb:text-sm ndb:font-semibold ndb:text-zinc-700 ndb:dark:text-zinc-300">
                {text(group.connection)}
              </dd>
            </div>
            <div className="ndb:min-w-0">
              <dt className="ndb:text-xs ndb:font-semibold ndb:text-zinc-400">Table</dt>
              <dd className="ndb:text-sm ndb:font-semibold ndb:text-zinc-700 ndb:dark:text-zinc-300">
                {text(group.table)}
              </dd>
            </div>
          </>
        }
      />

      <InspectorDetailTabs label="Model detail">
        {TABS.map(([key, label]) => (
          <FilterTab
            key={key}
            variant="segmented"
            data-ndb-model-detail-tab={key}
            onClick={() => onTab(key)}
            aria-pressed={tab === key}
            className="ndb:h-auto"
          >
            {label}
          </FilterTab>
        ))}
      </InspectorDetailTabs>

      <div className="ndb:p-3 ndb:sm:p-4">
        {tab === 'records' ? (
          <div data-ndb-model-detail-panel="records" className={PANEL}>
            {retrievals > 0 ? <ModelRecords group={group} /> : null}
            {operations.length > 0 ? <ModelWrites group={group} operations={operations} /> : null}
            {retrievals === 0 && operations.length === 0 ? (
              <EmptyState label="No model retrievals were captured for this context." />
            ) : null}
          </div>
        ) : null}

        {tab === 'source' ? (
          <div data-ndb-model-detail-panel="source" className={PANEL}>
            <ModelSources group={group} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
