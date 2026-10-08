import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { registerScope, useApi, useInspectorController } from '../../app/hooks.js';
import { formatDuration } from '../../duration.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { SearchField } from '../components/SearchField.jsx';
import { SelectField } from '../components/SelectField.jsx';
import { InspectorSortHeading } from '../components/InspectorSortHeading.jsx';
import { countLabel } from './count-label.js';
import { QueryDetail } from './queries/QueryDetail.jsx';
import { QueryRow } from './queries/QueryRow.jsx';
import {
  EXPLAIN_FAILED,
  QUERY_DETAIL_TABS,
  QUERY_FILTERS,
  QUERY_FINDING_FILTERS,
  cachedExplains,
  executionCount,
  findingQuery,
  needsExplain,
  nextQuerySort,
  queryFilters,
  rememberExplain,
  selectedExecution,
  visibleQueries,
  withExplains,
} from './queries/query-view.js';

const NO_RECORDS = Object.freeze([]);

/** Renders captured database queries as a list-detail workspace. */
export function QueriesInspector({ inspector, profileId }) {
  const api = useApi();
  const payload = inspector.payload ?? {};
  const summary = inspector.summary ?? {};
  const capturedRecords = Array.isArray(payload.records) ? payload.records : NO_RECORDS;

  const [explains, setExplains] = useState(() => cachedExplains(profileId));
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ sort: 'execution', direction: 'asc' });
  const [selection, setSelection] = useState(() => ({
    key: capturedRecords[0]?.key ?? null,
    execution: capturedRecords[0]?.executions?.[0]?.execution ?? null,
  }));
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const [finding, setFinding] = useState(null);
  const [scrollRequest, setScrollRequest] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);

  const rootRef = useRef(null);
  const listRef = useRef(null);
  const detailRef = useRef(null);
  const returnFocus = useRef(null);
  const mounted = useRef(true);
  const scope = useRef({});

  const records = useMemo(() => withExplains(capturedRecords, explains), [capturedRecords, explains]);
  const filters = useMemo(
    () => payload.record_filters ?? queryFilters(capturedRecords),
    [payload.record_filters, capturedRecords],
  );
  const retainedCount = Number(filters.all?.[1] ?? executionCount(records));
  const visible = useMemo(
    () => visibleQueries(records, { filter, search, sort: sort.sort, direction: sort.direction }),
    [records, filter, search, sort],
  );
  const visibleCount = executionCount(visible);

  // A record hidden by the controls hands the selection to the first visible record.
  const first = visible[0] ?? null;
  if (!visible.some((record) => record.key === selection.key) && (first?.key ?? null) !== selection.key) {
    setSelection({ key: first?.key ?? null, execution: first?.executions?.[0]?.execution ?? null });
    setDetailTab('overview');
    returnFocus.current = null;
    if (first === null) setDetailOpen(false);
  }

  const selectedRecord = records.find((record) => record.key === selection.key) ?? null;
  const selectedQuery = selectedExecution(selectedRecord, selection.execution);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    Object.assign(scope.current, {
      queryRecords: records,
      queryFilter: filter,
      querySearch: search,
      querySort: sort.sort,
      querySortDirection: sort.direction,
      querySelected: selection.key,
      querySelectedExecution: selectedQuery?.execution ?? null,
      queryDetailOpen: detailOpen,
      queryDetailTab: detailTab,
      queryExplain: selectedQuery?.explain ?? null,
      queryExplainError: selectedQuery?.explain_error ?? null,
      queryExplainLoading: selectedQuery?.explain_loading === true,
      queryExplainExecution: selectedQuery?.execution ?? null,
      visibleQueryCount: visibleCount,
    });
    registerScope(rootRef.current, scope.current);
  });

  const storeExplain = (execution, result) => {
    const next = rememberExplain(profileId, execution, result);
    if (mounted.current) setExplains(next);
  };

  const runExplain = (query) => {
    if (!needsExplain(query)) return;

    const execution = query.execution;
    storeExplain(execution, { loading: true });
    Promise.resolve()
      .then(() => api.explainQuery(profileId, execution))
      .then((result) =>
        storeExplain(execution, {
          explain: result?.explain ?? null,
          error: result?.explain == null ? (result?.error ?? EXPLAIN_FAILED) : null,
        }),
      )
      .catch(() => storeExplain(execution, { explain: null, error: EXPLAIN_FAILED }));
  };

  const selectRecord = (key, focusTarget) => {
    const record = records.find((candidate) => candidate.key === key);
    if (!record) return;

    setSelection({ key: record.key, execution: record.executions?.[0]?.execution ?? null });
    setDetailOpen(true);
    setDetailTab('overview');
    returnFocus.current = focusTarget;
    setScrollRequest({ focus: window.innerWidth < 1024 });
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setFocusRequest({ key: selection.key, element: returnFocus.current });
    returnFocus.current = null;
  };

  const selectRun = (execution) => {
    if (!selectedRecord?.executions?.some((query) => query.execution === execution)) return;

    setSelection({ key: selectedRecord.key, execution });
  };

  const selectTab = (tab) => {
    if (!QUERY_DETAIL_TABS.includes(tab)) return;

    setDetailTab(tab);
    setScrollRequest({ focus: false });
    if (tab === 'explain') runExplain(selectedQuery);
  };

  const changeFilter = (next) => {
    if (!QUERY_FILTERS.includes(next)) return;

    setFilter(next);
    setFinding(null);
  };

  useInspectorController('queries', profileId, {
    receiveIntent(intent) {
      if (!QUERY_FINDING_FILTERS.includes(intent)) return;

      setFilter('attention');
      setFinding(intent);
    },
  });

  // A finding intent opens the first matching record once the attention filter has applied.
  useEffect(() => {
    if (finding === null) return;

    const record = findingQuery(visible, finding);
    if (!record) return;

    setFinding(null);
    selectRecord(record.key, null);
    listRef.current
      ?.querySelector(`[data-ndb-query-key="${CSS.escape(record.key)}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [finding, visible]);

  useEffect(() => {
    if (scrollRequest === null) return;

    detailRef.current?.scrollTo?.({ top: 0, behavior: 'instant' });
    if (scrollRequest.focus) detailRef.current?.focus?.({ preventScroll: true });
  }, [scrollRequest]);

  useEffect(() => {
    if (focusRequest === null) return;

    const row = listRef.current?.querySelector(
      `[data-ndb-query-key="${CSS.escape(String(focusRequest.key))}"]`,
    );
    const target = focusRequest.element?.isConnected ? focusRequest.element : row;
    const frame = window.requestAnimationFrame(() => target?.focus?.());

    return () => window.cancelAnimationFrame(frame);
  }, [focusRequest]);

  return (
    <div
      data-ndb-queries=""
      ref={rootRef}
      className="ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col"
    >
      {records.length > 0 ? (
        <InspectorWorkspace frame="top" data-ndb-query-workspace="" className="ndb:border-x-0">
          <InspectorListPanel
            detailOpen={detailOpen}
            listRef={listRef}
            controls={
              <>
                <p
                  data-ndb-query-summary=""
                  aria-live="polite"
                  aria-atomic="true"
                  className="ndb:min-w-0 ndb:text-xs ndb:font-semibold ndb:text-zinc-700 ndb:dark:text-zinc-200"
                >
                  <span data-ndb-query-summary-count="">{countLabel(retainedCount, 'query')}</span>{' '}
                  <span
                    hidden={visibleCount === retainedCount}
                    className="ndb:ml-1 ndb:text-xs ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400"
                  >
                    <span data-ndb-query-visible-count="">{visibleCount}</span> shown
                  </span>
                  <span
                    data-ndb-query-total-time=""
                    className="ndb:mt-0.5 ndb:block ndb:text-xs ndb:font-medium ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400"
                  >
                    {formatDuration(Number(summary.total_time_ms ?? 0))} total
                  </span>
                </p>

                <InspectorListControls
                  showSearch
                  search={
                    <SearchField
                      label="Search queries"
                      placeholder="Search SQL, bindings, or source"
                      data-ndb-query-search=""
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  }
                  filter={
                    <SelectField
                      label="Filter queries"
                      data-ndb-query-filter=""
                      value={filter}
                      onChange={(event) => changeFilter(event.target.value)}
                    >
                      {Object.entries(filters).map(([key, [label, count]]) => (
                        <option key={key} value={key}>
                          {label} ({count})
                        </option>
                      ))}
                    </SelectField>
                  }
                />
              </>
            }
            list={
              <>
                <div
                  data-ndb-query-list-heading=""
                  className="ndb:sticky ndb:top-0 ndb:z-10 ndb:grid ndb:grid-cols-[3.5rem_minmax(0,1fr)_4.75rem] ndb:items-center ndb:gap-3 ndb:border-b ndb:border-zinc-200/90 ndb:bg-white/95 ndb:px-3 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:backdrop-blur-sm ndb:dark:border-zinc-800 ndb:dark:bg-zinc-950/95"
                >
                  <span>Type</span>
                  <span>Query</span>
                  <span className="ndb:flex ndb:justify-end">
                    <InspectorSortHeading
                      label="Time"
                      align="right"
                      active={sort.sort === 'duration'}
                      direction={sort.direction}
                      data-ndb-query-sort-heading="duration"
                      onClick={() => setSort(nextQuerySort(sort.sort, sort.direction))}
                    />
                  </span>
                </div>

                {visible.map((record) => (
                  <QueryRow
                    key={record.key}
                    record={record}
                    selected={selection.key === record.key}
                    onSelect={(event) => selectRecord(record.key, event.currentTarget)}
                  />
                ))}
              </>
            }
            listProps={{ 'data-ndb-query-list': '' }}
            empty={<EmptyState label="No queries match these controls." />}
            emptyProps={{ hidden: visibleCount !== 0 }}
          />

          <QueryDetail
            detailOpen={detailOpen}
            detailRef={detailRef}
            record={selectedRecord}
            query={selectedQuery}
            tab={detailTab}
            onClose={closeDetail}
            onSelectRun={selectRun}
            onSelectTab={selectTab}
          />
        </InspectorWorkspace>
      ) : (
        <EmptyState label="No database queries were captured for this request." />
      )}
    </div>
  );
}
