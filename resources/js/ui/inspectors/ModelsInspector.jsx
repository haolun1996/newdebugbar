import { useMemo, useRef, useState } from 'react';
import { useShell } from '../../app/hooks.js';
import { nextTick } from '../../app/store.js';
import { formatNumber, modelRow, nextModelSort, plural, visibleModelRows } from '../../inspectors/models.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorDetailBack } from '../components/InspectorDetailBack.jsx';
import { InspectorDetailEmpty } from '../components/InspectorDetailEmpty.jsx';
import { InspectorDetailPane } from '../components/InspectorDetailPane.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorSortHeading } from '../components/InspectorSortHeading.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { SearchField } from '../components/SearchField.jsx';
import { ModelGroup } from './models/ModelGroup.jsx';
import { ModelGroupDetail } from './models/ModelGroupDetail.jsx';

const afterPaint = (callback) => requestAnimationFrame(() => requestAnimationFrame(callback));

const HEADINGS = [
  ['model', 'Model', 'ndb:flex ndb:justify-start'],
  ['retrieved', 'Retrieved', 'ndb:flex ndb:justify-end'],
  ['writes', 'Writes', 'ndb:flex ndb:justify-end'],
  ['reloads', 'Reloads', 'ndb:flex ndb:justify-end'],
];

/** Model activity as a compact sortable table with persistent details (models.blade.php). */
export function ModelsInspector({ inspector }) {
  const shell = useShell();
  const payload = inspector.payload ?? {};
  const rows = useMemo(
    () =>
      Object.values(payload.model_group_previews ?? payload.model_groups ?? []).map((group, index) =>
        modelRow(group, index),
      ),
    [payload],
  );

  const [search, setSearch] = useState('');
  const [order, setOrder] = useState({ sort: 'capture', direction: 'asc' });
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [tab, setTab] = useState('records');
  const listRef = useRef(null);
  const detailRef = useRef(null);
  const listScrollTop = useRef(0);

  const visible = useMemo(() => visibleModelRows(rows, { search, ...order }), [rows, search, order]);
  const selectedRow = selected === null ? null : (visible.find((row) => row.index === selected) ?? null);

  if (selected !== null && selectedRow === null) {
    setSelected(null);
    setDetailOpen(false);
    setTab('records');
  }

  if (rows.length === 0) {
    return (
      <div
        data-ndb-models=""
        className="ndb:text-zinc-950 ndb:[&_code]:bg-transparent ndb:[&_dd]:bg-transparent ndb:[&_dl]:bg-transparent ndb:[&_dt]:bg-transparent ndb:dark:text-white ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col"
      >
        <EmptyState label="No Eloquent model activity was captured for this request." />
      </div>
    );
  }

  const content = () => shell.$refs?.content;

  const select = (index) => {
    listScrollTop.current = Math.max(
      Number(listRef.current?.scrollTop ?? 0),
      Number(content()?.scrollTop ?? 0),
    );
    setSelected(index);
    setDetailOpen(true);
    setTab('records');
    nextTick(() => {
      content()?.scrollTo?.({ top: 0, behavior: 'instant' });
      detailRef.current?.scrollTo?.({ top: 0, behavior: 'instant' });
      afterPaint(() => detailRef.current?.focus({ preventScroll: true }));
    });
  };

  const selectTab = (next) => {
    setTab(next);
    nextTick(() => detailRef.current?.scrollTo?.({ top: 0, behavior: 'instant' }));
  };

  const close = () => {
    const index = selected;
    if (index === null || !detailOpen) return;

    setDetailOpen(false);
    nextTick(() => {
      listRef.current?.scrollTo?.({ top: listScrollTop.current, behavior: 'instant' });
      content()?.scrollTo?.({ top: listScrollTop.current, behavior: 'instant' });
      afterPaint(() =>
        listRef.current
          ?.querySelector(`[data-ndb-model-group][data-ndb-model-index="${index}"]`)
          ?.focus({ preventScroll: true }),
      );
    });
  };

  return (
    <div
      data-ndb-models=""
      className="ndb:text-zinc-950 ndb:[&_code]:bg-transparent ndb:[&_dd]:bg-transparent ndb:[&_dl]:bg-transparent ndb:[&_dt]:bg-transparent ndb:dark:text-white ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col"
    >
      <InspectorWorkspace
        frame="top"
        data-ndb-model-workspace=""
        className="ndb:border-l-0 ndb:p-0 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white ndb:lg:grid-cols-[minmax(20rem,0.72fr)_minmax(0,1.68fr)]"
      >
        <InspectorListPanel
          detailOpen={detailOpen}
          listRef={listRef}
          controls={
            <InspectorListControls
              showSearch
              leading={
                <p
                  data-ndb-model-summary=""
                  aria-live="polite"
                  aria-atomic="true"
                  className="ndb:min-w-0 ndb:text-xs ndb:text-zinc-700 ndb:dark:text-zinc-200"
                >
                  <span data-ndb-model-summary-count="" className="ndb:font-bold">
                    {formatNumber(rows.length)} {plural('model', rows.length)}
                  </span>{' '}
                  <span
                    hidden={visible.length === rows.length}
                    className="ndb:ml-1 ndb:text-xs ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400"
                  >
                    <span data-ndb-model-visible-count="">{visible.length}</span> shown
                  </span>
                </p>
              }
              search={
                <SearchField
                  label="Search models"
                  placeholder="Search models"
                  data-ndb-model-search=""
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              }
            />
          }
          listProps={{
            'data-ndb-model-list': '',
            className:
              'ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white',
          }}
          list={
            <>
              <div
                data-ndb-model-list-heading=""
                className="ndb:sticky ndb:top-0 ndb:z-10 ndb:hidden ndb:grid-cols-[minmax(7rem,1fr)_3.5rem_2.75rem_3.75rem] ndb:gap-2 ndb:border-l-0 ndb:border-b ndb:border-zinc-200/90 ndb:bg-white/95 ndb:px-3 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:backdrop-blur-sm ndb:dark:border-zinc-800 ndb:dark:bg-zinc-950/95 ndb:sm:grid"
              >
                {HEADINGS.map(([key, label, cellClass]) => (
                  <span
                    key={key}
                    className={cellClass}
                    title={key === 'reloads' ? 'Loads after the first for identified records' : undefined}
                  >
                    <InspectorSortHeading
                      label={label}
                      align={key === 'model' ? 'left' : 'right'}
                      active={order.sort === key}
                      direction={order.direction}
                      data-ndb-model-sort-heading={key}
                      className={key === 'model' ? 'ndb:-ml-4' : undefined}
                      onClick={() => setOrder((current) => nextModelSort(current, key))}
                    />
                  </span>
                ))}
              </div>

              {visible.map((row) => (
                <ModelGroup
                  key={`model-group-${row.index}`}
                  row={row}
                  selected={selected === row.index}
                  onSelect={select}
                />
              ))}

              <div hidden={visible.length !== 0} className="ndb:p-3">
                <EmptyState label="No models match this search." />
              </div>
            </>
          }
        />

        <InspectorDetailPane
          detailOpen={detailOpen}
          detailRef={detailRef}
          detailLabel="Selected model details"
          backLabel="Models"
          onClose={close}
          id="newdebugbar-model-detail"
          data-ndb-model-detail-pane=""
          className="ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white"
          back={
            <InspectorDetailBack
              data-ndb-model-detail-back=""
              onClick={close}
              label="Models"
              className="ndb:bg-transparent"
            />
          }
        >
          {selectedRow !== null ? (
            <div key={`model-detail-${selectedRow.index}`} className="ndb:flex ndb:flex-col">
              <ModelGroupDetail group={selectedRow.group} tab={tab} onTab={selectTab} />
            </div>
          ) : null}

          <InspectorDetailEmpty
            data-ndb-model-detail-empty=""
            label="Select a model to inspect its activity."
            hidden={selected !== null}
            className="ndb:flex-1"
          />
        </InspectorDetailPane>
      </InspectorWorkspace>
    </div>
  );
}
