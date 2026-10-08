import { FilterTab } from '../../components/FilterTab.jsx';
import { InspectorAction } from '../../components/InspectorAction.jsx';
import { InspectorDetailBack } from '../../components/InspectorDetailBack.jsx';
import { InspectorDetailEmpty } from '../../components/InspectorDetailEmpty.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorDetailPane } from '../../components/InspectorDetailPane.jsx';
import { InspectorDetailTabs } from '../../components/InspectorDetailTabs.jsx';
import { InspectorEvidence } from '../../components/InspectorEvidence.jsx';
import { InspectorExplanation } from '../../components/InspectorExplanation.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorSourceFact } from '../../components/InspectorSourceFact.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { InspectorSourcePanel } from '../../components/InspectorSourcePanel.jsx';
import { SelectField } from '../../components/SelectField.jsx';
import { formatQueryEvidence, formatQueryType, hasQuerySource } from './query-view.js';

function Overview({ record, query, onSelectRun }) {
  return (
    <section data-ndb-query-detail-panel="overview">
      <div className="ndb:space-y-3 ndb:p-3 ndb:sm:space-y-4 ndb:sm:p-4">
        {record.repeated ? (
          <div className="ndb:max-w-sm">
            <p className="ndb:mb-1.5 ndb:text-xs ndb:font-bold ndb:uppercase ndb:tracking-wide ndb:text-zinc-400">
              {`Repeated runs (${record.count})`}
            </p>
            <SelectField
              label="Choose a repeated run"
              data-ndb-query-execution-select=""
              value={query.execution}
              onChange={(event) => onSelectRun(Number(event.target.value))}
            >
              {(record.executions ?? []).map((execution) => (
                <option key={execution.execution} value={execution.execution}>
                  {`#${execution.execution} — ${execution.duration_label}`}
                </option>
              ))}
            </SelectField>
          </div>
        ) : null}

        <InspectorFacts bordered={false}>
          <InspectorFact label="Duration" valueProps={{ className: 'ndb:font-bold ndb:tabular-nums' }}>
            {query.duration_label}
          </InspectorFact>
          <InspectorFact label="Query time" valueProps={{ className: 'ndb:font-semibold ndb:tabular-nums' }}>
            {`${Number(query.query_time_percent).toFixed(1)}%`}
          </InspectorFact>
          <InspectorFact label="Type" valueProps={{ className: 'ndb:font-semibold' }}>
            {formatQueryType(query.query_type)}
          </InspectorFact>
          <InspectorFact
            label="Connection"
            valueProps={{ title: query.connection, className: 'ndb:truncate ndb:font-semibold' }}
          >
            {query.connection}
          </InspectorFact>
        </InspectorFacts>

        <InspectorEvidence
          label="Full query"
          language="sql"
          aside={
            <InspectorAction icon="copy" data-ndb-query-copy-sql="" copy={query.display_sql}>
              Copy query
            </InspectorAction>
          }
          value={query.display_sql}
          valueProps={{ 'data-ndb-query-sql': '' }}
        />

        <p
          data-ndb-query-incomplete-bindings=""
          hidden={Boolean(query.display_sql_complete)}
          className="ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400"
        >
          Some binding values were not retained, so the remaining placeholders cannot be filled in.
        </p>

        <InspectorExplanation
          hidden={!record.likely_n_plus_one}
          title="Why this may be an N+1 query"
          description="The same application call site ran this query at least three times with different bindings. If those loads happen inside a loop, trace the application call site and consider eager loading or batching."
        />
      </div>

      {hasQuerySource(query) ? (
        <InspectorSourcePanel
          frames={query.stack ?? []}
          columns={1}
          emptyLabel="No application stack was captured for this query."
          className="ndb:border-t ndb:border-zinc-200/90 ndb:dark:border-zinc-800"
        >
          <InspectorSourceFact label="Source" hidden={!query.source_available}>
            <InspectorSourceLink
              title={query.source_available ? `Copy ${query.source_label}` : undefined}
              disabled={!query.source_available}
              copy={query.source_label}
            >
              {query.source_label}
            </InspectorSourceLink>
          </InspectorSourceFact>
        </InspectorSourcePanel>
      ) : null}
    </section>
  );
}

function Explain({ query }) {
  const explain = query.explain ?? null;
  const error = query.explain_error ?? null;

  return (
    <section
      data-ndb-query-detail-panel="explain"
      className="ndb:space-y-3 ndb:p-3 ndb:sm:space-y-4 ndb:sm:p-4"
    >
      <p
        hidden={Boolean(query.explain_available)}
        className="ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400"
      >
        {query.explain_unavailable_reason}
      </p>

      <p
        hidden={query.explain_loading !== true}
        data-ndb-query-explain-loading=""
        role="status"
        className="ndb:flex ndb:items-center ndb:gap-2 ndb:text-xs ndb:font-semibold ndb:text-zinc-500 ndb:dark:text-zinc-400"
      >
        <span className="ndb:size-1.5 ndb:shrink-0 ndb:rounded-full ndb:bg-indigo-500"></span>
        <span>Running EXPLAIN…</span>
      </p>

      {explain !== null ? (
        <div data-ndb-query-explain-result="" className="ndb:space-y-3 ndb:sm:space-y-4">
          <InspectorFacts columns={2} bordered={false}>
            <InspectorFact label="Mode" valueProps={{ className: 'ndb:font-semibold' }}>
              {explain.mode}
            </InspectorFact>
            <InspectorFact label="Driver" valueProps={{ className: 'ndb:font-semibold' }}>
              {explain.driver}
            </InspectorFact>
          </InspectorFacts>
          <InspectorEvidence
            label="Plan"
            language="json"
            value={formatQueryEvidence(explain.rows)}
            valueProps={{ 'data-ndb-query-explain-plan': '' }}
          />
        </div>
      ) : null}

      <div
        hidden={error === null}
        role="alert"
        className="ndb:rounded-lg ndb:border ndb:border-red-200 ndb:bg-red-50/60 ndb:p-3 ndb:dark:border-red-950 ndb:dark:bg-red-950/20"
      >
        <p className="ndb:text-xs ndb:font-semibold ndb:leading-5 ndb:text-red-700 ndb:dark:text-red-300">
          EXPLAIN could not run
        </p>
        <p
          data-ndb-query-explain-error=""
          className="ndb:mt-1 ndb:text-xs ndb:leading-5 ndb:text-zinc-600 ndb:dark:text-zinc-300"
        >
          {error}
        </p>
      </div>
    </section>
  );
}

/** Shows only the selected query execution and the active evidence tab. */
export function QueryDetail({
  detailOpen,
  detailRef,
  record,
  query,
  tab,
  onClose,
  onSelectRun,
  onSelectTab,
}) {
  return (
    <InspectorDetailPane
      detailOpen={detailOpen}
      detailRef={detailRef}
      detailLabel="Selected query details"
      backLabel="Queries"
      onClose={onClose}
      id="newdebugbar-query-detail"
      data-ndb-query-detail=""
      className="ndb:border-x-0"
      back={<InspectorDetailBack data-ndb-query-detail-back="" onClick={onClose} label="Queries" />}
    >
      {record && query ? (
        <div data-ndb-query-active-detail="" className="ndb:flex ndb:flex-col">
          <InspectorDetailHeader
            data-ndb-query-detail-header=""
            title={
              <h3
                data-ndb-query-detail-title=""
                className="ndb:min-w-0 ndb:text-sm ndb:font-bold ndb:leading-5"
              >
                {record.repeated ? 'Repeated query pattern' : `Query #${query.execution}`}
              </h3>
            }
          />

          <InspectorDetailTabs label="Query evidence">
            <FilterTab
              variant="segmented"
              data-ndb-query-detail-tab="overview"
              onClick={() => onSelectTab('overview')}
              aria-pressed={tab === 'overview'}
              className="ndb:h-auto ndb:min-h-8"
            >
              Overview
            </FilterTab>
            <FilterTab
              variant="segmented"
              data-ndb-query-detail-tab="explain"
              onClick={() => onSelectTab('explain')}
              aria-pressed={tab === 'explain'}
              className="ndb:h-auto ndb:min-h-8"
            >
              EXPLAIN
            </FilterTab>
          </InspectorDetailTabs>

          {tab === 'overview' ? <Overview record={record} query={query} onSelectRun={onSelectRun} /> : null}
          {tab === 'explain' ? <Explain query={query} /> : null}
        </div>
      ) : null}

      <InspectorDetailEmpty
        data-ndb-query-detail-empty=""
        label="Choose a query to inspect its evidence."
        hidden={Boolean(query)}
        className="ndb:flex-1"
      />
    </InspectorDetailPane>
  );
}
