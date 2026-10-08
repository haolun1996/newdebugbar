import { useEffect, useMemo, useRef, useState } from 'react';
import { cx, useApi, useShell } from '../../app/hooks.js';
import { nextTick } from '../../app/store.js';
import { formatNumber, plural } from '../../inspectors/models.js';
import {
  createViewDataLoader,
  defaultViewFilter,
  filterViews,
  findRender,
  firstRenderOrder,
} from '../../inspectors/views.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorDetailBack } from '../components/InspectorDetailBack.jsx';
import { InspectorDetailEmpty } from '../components/InspectorDetailEmpty.jsx';
import { InspectorDetailPane } from '../components/InspectorDetailPane.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { SearchField } from '../components/SearchField.jsx';
import { SelectField } from '../components/SelectField.jsx';
import { ViewDetail } from './views/ViewDetail.jsx';

const IDLE = { loading: false, loaded: false, error: false, value: null };

function ViewGroupRow({ group, selected, onSelect }) {
  const count = Number(group.count ?? 0);

  return (
    <button
      type="button"
      data-ndb-view-group={group.id}
      data-ndb-view-origin={group.origin}
      data-ndb-view-search-value={group.search}
      data-ndb-view-count={count}
      onClick={() => onSelect(group.id)}
      aria-pressed={selected}
      className={cx(
        'ndb:grid ndb:h-auto ndb:w-full ndb:min-w-0 ndb:grid-cols-[minmax(0,1fr)_auto] ndb:items-center ndb:gap-x-3 ndb:border-l-0 ndb:bg-transparent ndb:px-3 ndb:py-2.5 ndb:text-left ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:sm:py-3',
        selected
          ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
          : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
    >
      <span
        data-ndb-view-list-name=""
        className="ndb:min-w-0 ndb:truncate ndb:font-sans ndb:text-xs ndb:font-bold ndb:text-zinc-900 ndb:dark:text-zinc-100"
      >
        {group.display_name}
      </span>
      <span className="ndb:text-right ndb:text-xs ndb:font-bold ndb:tabular-nums">{formatNumber(count)}</span>
      <span className="ndb:min-w-0 ndb:truncate ndb:text-xs ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400">
        {group.origin === 'application' ? 'Application' : 'Framework'}
      </span>
      <span className="ndb:text-right ndb:text-xs ndb:font-medium ndb:text-zinc-400">
        {plural('render', count)}
      </span>
    </button>
  );
}

/** Application views first, with one active render detail whose data loads on demand (views.blade.php). */
export function ViewsInspector({ inspector, profileId }) {
  const shell = useShell();
  const api = useApi();
  const summary = inspector.summary ?? {};
  const groups = useMemo(() => Object.values(inspector.payload?.groups ?? []), [inspector]);
  const renderCount = Number(
    summary.count ?? groups.reduce((count, group) => count + Number(group.count ?? 0), 0),
  );
  const applicationCount = Number(summary.application_count ?? renderCount);
  const frameworkCount = Number(summary.framework_count ?? 0);

  const [filter, setFilter] = useState(() => defaultViewFilter(groups));
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [renderOrder, setRenderOrder] = useState(null);
  const [data, setData] = useState(IDLE);
  const [attempt, setAttempt] = useState(0);
  const listRef = useRef(null);
  const detailRef = useRef(null);
  const loader = useMemo(
    () => createViewDataLoader((order) => api.viewData(profileId, order)),
    [api, profileId],
  );

  const { visible, renders } = useMemo(
    () => filterViews(groups, { filter, search }),
    [groups, filter, search],
  );
  const selectedGroup = selected === null ? null : (visible.find((group) => group.id === selected) ?? null);
  const selectedRender = findRender(selectedGroup, renderOrder);

  if (selected !== null && selectedGroup === null) {
    setSelected(null);
    setDetailOpen(false);
    setRenderOrder(null);
    setData(IDLE);
  }

  useEffect(() => {
    if (selectedRender === null) return undefined;

    setData({ ...IDLE, loading: true });
    loader.load(selectedRender.render_order, {
      onLoad: (value) => setData({ ...IDLE, loaded: true, value }),
      onError: () => setData({ ...IDLE, error: true }),
    });

    return () => loader.cancel();
  }, [loader, selectedRender, attempt]);

  if (groups.length === 0) {
    return (
      <div
        data-ndb-views=""
        className="ndb:text-zinc-950 ndb:dark:text-white ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col"
      >
        <EmptyState label="No views were captured for this request." />
      </div>
    );
  }

  const select = (id) => {
    const group = groups.find((candidate) => candidate.id === id);
    if (!group) return;

    setSelected(id);
    setDetailOpen(true);
    setRenderOrder(firstRenderOrder(group));
    nextTick(() => {
      if (shell.$refs?.content) shell.$refs.content.scrollTop = 0;
      detailRef.current?.focus({ preventScroll: true });
    });
  };

  const selectRender = (order) => {
    if (!selectedGroup?.items?.some((view) => Number(view.render_order) === order)) return;
    setRenderOrder(order);
  };

  const close = () => {
    const id = selected;
    setDetailOpen(false);
    nextTick(() =>
      [...(listRef.current?.querySelectorAll('[data-ndb-view-group]') ?? [])]
        .find((group) => group.dataset.ndbViewGroup === id)
        ?.focus({ preventScroll: true }),
    );
  };

  const groupCount = visible.length;

  return (
    <div
      data-ndb-views=""
      className="ndb:text-zinc-950 ndb:dark:text-white ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col"
    >
      <InspectorWorkspace
        frame="top"
        data-ndb-view-workspace=""
        className="ndb:border-l-0 ndb:p-0 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white"
      >
        <InspectorListPanel
          detailOpen={detailOpen}
          listRef={listRef}
          data-ndb-view-list-panel=""
          className="ndb:border-l-0 ndb:bg-transparent ndb:p-0"
          controls={
            <InspectorListControls
              showSearch
              leading={
                <p
                  data-ndb-view-summary=""
                  aria-live="polite"
                  aria-atomic="true"
                  className="ndb:flex ndb:min-w-0 ndb:flex-col ndb:items-start ndb:text-xs ndb:text-zinc-700 ndb:dark:text-zinc-200"
                >
                  <strong className="ndb:font-bold">
                    <span data-ndb-view-visible-count="">{groupCount}</span>{' '}
                    <span>{plural('view', groupCount)}</span>
                  </strong>
                  <span className="ndb:mt-0.5 ndb:block ndb:text-xs ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400">
                    <span data-ndb-view-visible-render-count="">{renders}</span>{' '}
                    <span>{plural('render', renders)}</span> shown
                  </span>
                </p>
              }
              search={
                <SearchField
                  label="Search views"
                  placeholder="Search views or sources"
                  data-ndb-view-search=""
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="ndb:py-0"
                />
              }
              filter={
                <SelectField
                  label="Filter views by origin"
                  data-ndb-view-filter=""
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="ndb:py-0"
                >
                  <option value="application">Application ({formatNumber(applicationCount)})</option>
                  <option value="all">All ({formatNumber(renderCount)})</option>
                  <option value="framework">Framework ({formatNumber(frameworkCount)})</option>
                </SelectField>
              }
            />
          }
          listProps={{
            'data-ndb-view-list': '',
            'aria-label': 'Rendered views',
            className:
              'ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white',
          }}
          list={
            <>
              {visible.map((group) => (
                <ViewGroupRow
                  key={`view-group-${group.id}`}
                  group={group}
                  selected={selected === group.id}
                  onSelect={select}
                />
              ))}

              <div hidden={groupCount !== 0} className="ndb:p-3">
                <EmptyState label="No views match this origin and search." />
              </div>
            </>
          }
        />

        <InspectorDetailPane
          detailOpen={detailOpen}
          detailRef={detailRef}
          detailLabel="Selected view details"
          backLabel="Views"
          onClose={close}
          id="newdebugbar-view-detail"
          data-ndb-view-detail-pane=""
          className="ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white"
          back={
            <InspectorDetailBack
              data-ndb-view-detail-back=""
              onClick={close}
              label="Views"
              className="ndb:bg-transparent"
            />
          }
        >
          {selectedGroup !== null ? (
            <ViewDetail
              group={selectedGroup}
              render={selectedRender}
              renderOrder={renderOrder}
              onRender={selectRender}
              data={{ ...data, retry: () => setAttempt((count) => count + 1) }}
            />
          ) : null}

          <InspectorDetailEmpty
            data-ndb-view-detail-empty=""
            label="Select a view to inspect its renders, data, and source."
            hidden={selected !== null}
            className="ndb:flex-1"
          />
        </InspectorDetailPane>
      </InspectorWorkspace>
    </div>
  );
}
