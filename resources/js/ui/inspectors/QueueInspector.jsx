import { useEffect, useMemo, useRef, useState } from 'react';
import { cx, useInspectorController, useShell } from '../../app/hooks.js';
import { formatDuration } from '../../duration.js';
import {
  QUEUE_FILTERS,
  effectiveQueueFilter,
  queueStatusClass,
  queueSummary,
  queueView,
} from '../../inspectors/queue.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { Icon } from '../components/Icon.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { SearchField } from '../components/SearchField.jsx';
import { SelectField } from '../components/SelectField.jsx';
import { QueueDetail } from './queue/QueueDetail.jsx';

/** One queued, processed, or failed job row. */
function QueueListItem({ item, visible, selected, onSelect }) {
  return (
    <button
      type="button"
      data-ndb-queue-item={item.execution}
      data-ndb-queue-execution={item.execution}
      data-ndb-queue-status={item.status}
      data-ndb-queue-group={item.status_group}
      aria-controls="newdebugbar-queue-detail"
      hidden={!visible}
      onClick={() => onSelect(item.execution)}
      aria-pressed={selected}
      className={cx(
        'ndb:grid ndb:h-auto ndb:min-h-0 ndb:w-full ndb:min-w-0 ndb:grid-cols-[4.75rem_minmax(0,1fr)_4.5rem] ndb:items-center ndb:gap-x-2 ndb:border-l-0 ndb:bg-transparent ndb:px-3 ndb:py-2.5 ndb:text-left ndb:text-xs ndb:text-zinc-950 ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-white',
        selected
          ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
          : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
    >
      <span
        className={cx(
          'ndb:row-span-2 ndb:inline-flex ndb:w-fit ndb:rounded-md ndb:px-2 ndb:py-1 ndb:text-xs ndb:font-bold',
          queueStatusClass(item.status),
        )}
      >
        {item.status_label}
      </span>
      <span className="ndb:min-w-0 ndb:truncate ndb:text-xs ndb:font-bold" title={item.job}>
        {item.job_label}
      </span>
      <span className="ndb:text-right ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400">
        {item.kind === 'queued' ? item.delay_label : item.duration_label}
      </span>
      <span className="ndb:min-w-0 ndb:truncate ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
        {`${item.connection}, ${item.queue}`}
      </span>
      <span className="ndb:text-right ndb:text-xs ndb:text-zinc-400">
        {item.attempt === null || item.attempt === undefined ? '' : `Attempt ${item.attempt}`}
      </span>
    </button>
  );
}

/** Queue activity: jobs this request queued or ran, with worker outcomes linked from later profiles. */
export function QueueInspector({ inspector, profile, profileId }) {
  const shell = useShell();
  const activities = useMemo(() => Object.values(inspector.payload?.records ?? {}), [inspector]);
  const figures = useMemo(
    () => queueSummary(inspector.summary ?? {}, activities, formatDuration),
    [inspector, activities],
  );
  const [requestedFilter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => activities[0]?.execution ?? null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);
  const listRef = useRef(null);
  const detailRef = useRef(null);

  useInspectorController('queue', profileId, {});

  // Background refreshes can remove every job from the chosen group; fall back to all.
  const filter = effectiveQueueFilter(activities, requestedFilter);
  if (filter !== requestedFilter) setFilter(filter);

  const view = useMemo(
    () => queueView(activities, { filter, search, selected }),
    [activities, filter, search, selected],
  );

  // A filter, search, or refreshed payload that hides the selection moves it to the first visible job.
  if (view.selected !== selected) {
    setSelected(view.selected);
    if (view.selected === null) setDetailOpen(false);
  }

  useEffect(() => {
    if (focusRequest === null) return;
    if (focusRequest.target === 'detail') {
      shell.$refs?.content?.scrollTo?.({ top: 0, behavior: 'instant' });
      detailRef.current?.scrollTo?.({ top: 0, behavior: 'instant' });
      detailRef.current?.focus?.({ preventScroll: true });
    } else {
      listRef.current
        ?.querySelector(`[data-ndb-queue-item="${focusRequest.execution}"]`)
        ?.focus?.({ preventScroll: true });
    }
  }, [focusRequest]);

  const selectActivity = (execution) => {
    if (!activities.some((activity) => activity.execution === execution)) return;

    setSelected(execution);
    setDetailOpen(true);
    setFocusRequest({ target: 'detail', execution });
  };

  const closeDetail = () => {
    if (!detailOpen) return;

    setDetailOpen(false);
    setFocusRequest({ target: 'row', execution: view.selected });
  };

  const activity = activities.find((item) => item.execution === view.selected) ?? null;

  return (
    <div
      data-ndb-queue=""
      className="ndb:border-l-0 ndb:bg-transparent ndb:text-zinc-950 ndb:dark:text-white ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col"
    >
      {activities.length > 0 ? (
        <InspectorWorkspace frame="top" data-ndb-queue-workspace="" className="ndb:border-x-0">
          <InspectorListPanel
            detailOpen={detailOpen}
            listRef={listRef}
            controls={
              <>
                <div className="ndb:flex ndb:items-start ndb:justify-between ndb:gap-3">
                  <div className="ndb:min-w-0">
                    <p className="ndb:text-xs ndb:font-bold ndb:text-zinc-700 ndb:dark:text-zinc-200">
                      {figures.countLabel}{' '}
                      <span
                        hidden={view.visibleCount === activities.length}
                        className="ndb:ml-1 ndb:text-xs ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400"
                      >
                        <span data-ndb-queue-visible-count="">{view.visibleCount}</span> shown
                      </span>
                    </p>
                    <p className="ndb:mt-0.5 ndb:text-xs ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400">
                      {figures.line}
                    </p>
                  </div>
                  {profile?.background_activity?.pending === true ? (
                    <button
                      type="button"
                      data-ndb-background-refresh=""
                      onClick={() => shell.refreshBackgroundActivity(true)}
                      className="ndb:inline-flex ndb:h-9 ndb:min-h-0 ndb:shrink-0 ndb:items-center ndb:gap-1.5 ndb:rounded-lg ndb:border ndb:border-zinc-200 ndb:bg-transparent ndb:px-2.5 ndb:text-xs ndb:font-bold ndb:text-indigo-600 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:border-zinc-700 ndb:dark:text-indigo-300"
                    >
                      <Icon name="activity" size={3.5} />
                      Check worker
                    </button>
                  ) : null}
                </div>

                <InspectorListControls
                  showSearch={figures.count >= 5}
                  search={
                    <SearchField
                      label="Search queue activity"
                      placeholder="Search jobs or queues"
                      data-ndb-queue-search=""
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  }
                  filter={
                    <SelectField
                      label="Filter queue activity"
                      data-ndb-queue-filter=""
                      value={filter}
                      onChange={(event) =>
                        QUEUE_FILTERS.includes(event.target.value) && setFilter(event.target.value)
                      }
                    >
                      {figures.filters.map(([value, label, count]) => (
                        <option key={value} value={value}>
                          {`${label} (${count})`}
                        </option>
                      ))}
                    </SelectField>
                  }
                />
              </>
            }
            list={view.rows.map(({ item, visible }) => (
              <QueueListItem
                key={item.execution}
                item={item}
                visible={visible}
                selected={view.selected === item.execution}
                onSelect={selectActivity}
              />
            ))}
            listProps={{ 'data-ndb-queue-list': '' }}
            empty={<EmptyState label="No queue activity matches these controls." />}
            emptyProps={{ hidden: view.visibleCount !== 0 }}
          />

          <QueueDetail
            activity={activity}
            detailOpen={detailOpen}
            detailRef={detailRef}
            onClose={closeDetail}
          />
        </InspectorWorkspace>
      ) : (
        <EmptyState label="No queue activity was captured." />
      )}
    </div>
  );
}
