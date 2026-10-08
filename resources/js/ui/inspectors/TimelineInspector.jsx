import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApi, useInspectorController, useShell } from '../../app/hooks.js';
import { defaultRuntime } from '../../runtime.js';
import {
  createRequestGate,
  filteredTimelineQuery,
  nextTimelinePageQuery,
  sameTimelineQuery,
  timelineItemView,
  timelineQuery,
  timelineSourceOptions,
  timelineSummary,
  DEFAULT_TIMELINE_QUERY,
} from '../../inspectors/timeline.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { SearchField } from '../components/SearchField.jsx';
import { SelectField } from '../components/SelectField.jsx';
import { TimelineDetail } from './timeline/TimelineDetail.jsx';
import { TimelineRow } from './timeline/TimelineRow.jsx';

const browser = defaultRuntime();
const SEARCH_DELAY = 200;

/** Follows loads of the timeline page: filter and search changes, infinite scroll, and shell refreshes. */
function useTimelinePages(profileId, initialPayload) {
  const api = useApi();
  const [payload, setPayload] = useState(initialPayload);
  const [filtering, setFiltering] = useState(false);
  const [filterError, setFilterError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState(false);
  const [gate] = useState(createRequestGate);
  const query = useRef(timelineQuery(initialPayload));
  const pending = useRef(null);

  useEffect(() => () => gate.invalidate(), [gate]);

  const load = useCallback(
    async (next, kind) => {
      const token = gate.begin();
      pending.current = kind;
      setFiltering(kind === 'filter');
      setLoadingMore(kind === 'more');
      if (kind !== 'more') setFilterError(false);
      setPaginationError(false);

      try {
        const response = await api.inspector(profileId, 'timeline', next);
        const loaded = response?.profile?.inspectors?.timeline?.payload;
        if (!gate.current(token)) return false;
        if (!loaded || typeof loaded !== 'object') throw new Error('The timeline page is unavailable.');

        query.current = next;
        setPayload(loaded);

        return true;
      } catch {
        if (gate.current(token)) {
          if (kind === 'more') setPaginationError(true);
          else setFilterError(true);
        }

        return false;
      } finally {
        if (gate.current(token)) {
          pending.current = null;
          setFiltering(false);
          setLoadingMore(false);
        }
      }
    },
    [api, gate, profileId],
  );

  /**
   * The shell reloads the default page after background activity. Keep the developer's query instead, and let a
   * load that is already in flight win: it reads the same fresh profile.
   */
  const receive = useCallback(
    (loaded) => {
      if (pending.current !== null) return;
      if (sameTimelineQuery(query.current, DEFAULT_TIMELINE_QUERY)) setPayload(loaded);
      else load(query.current, 'refresh');
    },
    [load],
  );

  /** Drops an unfinished page load when the timeline stops being visible. */
  const stopPaging = useCallback(() => {
    if (pending.current !== 'more') return;
    gate.invalidate();
    pending.current = null;
    setLoadingMore(false);
  }, [gate]);

  return {
    payload,
    query,
    pending,
    filtering,
    filterError,
    loadingMore,
    paginationError,
    load,
    receive,
    stopPaging,
  };
}

/** Presents request activity as a desktop waterfall and mobile chronological drill-in (timeline.blade.php). */
export function TimelineInspector({ inspector, profileId }) {
  const shell = useShell();
  const pages = useTimelinePages(profileId, inspector.payload);
  const { payload } = pages;
  const [filter, setFilter] = useState(() => pages.query.current.filter);
  const [search, setSearch] = useState(() => pages.query.current.search);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sentinel, setSentinel] = useState(null);
  const listRef = useRef(null);
  const detailRef = useRef(null);
  const searchTimer = useRef(null);
  const firstPayload = useRef(inspector.payload);

  const summary = useMemo(() => timelineSummary(payload), [payload]);
  const items = useMemo(
    () => (Array.isArray(payload?.items) ? payload.items.map(timelineItemView) : []),
    [payload],
  );
  const sources = useMemo(() => timelineSourceOptions(payload), [payload]);
  const active =
    shell.barVisible &&
    shell.inspectorOpen &&
    shell.selected === 'timeline' &&
    profileId === shell.summary.id;

  useInspectorController('timeline', profileId, {
    deactivate: () => pages.stopPaging(),
  });

  // Shell refreshes (background activity) deliver a new default page.
  useEffect(() => {
    if (inspector.payload === firstPayload.current) return;
    firstPayload.current = inspector.payload;
    pages.receive(inspector.payload);
  }, [inspector.payload, pages.receive]);

  // A selection that left the loaded rows closes its detail.
  useEffect(() => {
    if (selected !== null && !items.some((item) => item.id === selected.id)) {
      setSelected(null);
      setDetailOpen(false);
    }
  }, [items, selected]);

  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  const applyFilters = (nextFilter, nextSearch) => {
    window.clearTimeout(searchTimer.current);
    pages.load(filteredTimelineQuery(nextFilter, nextSearch), 'filter').then((loaded) => {
      if (loaded) listRef.current?.scrollTo?.({ top: 0, behavior: 'instant' });
    });
  };

  const loadMore = useRef(null);
  loadMore.current = () => {
    if (pages.pending.current !== null && pages.pending.current !== 'refresh') return;
    if (pages.paginationError || !active) return;
    pages.load(nextTimelinePageQuery(pages.query.current), 'more');
  };

  useEffect(() => {
    if (!active || !sentinel || !listRef.current || pages.loadingMore || pages.paginationError)
      return undefined;

    return browser.observeNearEnd(sentinel, listRef.current, () => loadMore.current()) ?? undefined;
  }, [active, sentinel, pages.loadingMore, pages.paginationError]);

  const select = (item) => {
    setSelected(item);
    setDetailOpen(true);
    window.setTimeout(() => {
      if (shell.$refs?.content) shell.$refs.content.scrollTop = 0;
      detailRef.current?.focus({ preventScroll: true });
    });
  };

  const close = () => {
    const id = selected?.id;
    setDetailOpen(false);
    browser.afterPaint(() => {
      [...(listRef.current?.querySelectorAll('[data-ndb-timeline-item]') ?? [])]
        .find((row) => row.dataset.ndbTimelineItem === id)
        ?.focus({ preventScroll: true });
    });
  };

  if (summary.total <= 0) {
    return (
      <div
        data-ndb-timeline=""
        className="ndb:text-zinc-950 ndb:dark:text-white ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col"
      >
        <EmptyState label="No timeline activity was captured for this request." />
      </div>
    );
  }

  const controls = (
    <InspectorListControls
      showSearch
      leading={
        <p
          data-ndb-timeline-summary=""
          aria-live="polite"
          aria-atomic="true"
          className="ndb:flex ndb:flex-col ndb:items-start ndb:text-xs ndb:text-zinc-700 ndb:dark:text-zinc-200"
        >
          <strong className="ndb:font-bold">{summary.matchingLabel}</strong>
          <span className="ndb:mt-0.5 ndb:block ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
            {summary.loadedLabel}
          </span>
        </p>
      }
      search={
        <SearchField
          label="Search timeline activity"
          placeholder="Search activity or source"
          data-ndb-timeline-search-field=""
          value={search}
          maxLength={500}
          onChange={(event) => {
            const value = event.target.value;
            setSearch(value);
            window.clearTimeout(searchTimer.current);
            searchTimer.current = window.setTimeout(() => applyFilters(filter, value), SEARCH_DELAY);
          }}
        />
      }
      filter={
        <SelectField
          label="Filter timeline activity"
          data-ndb-timeline-filter=""
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            applyFilters(event.target.value, search);
          }}
        >
          <optgroup label="View">
            <option value="key">Key activity</option>
            <option value="all">All activity</option>
          </optgroup>
          <optgroup label="Source">
            <option value="request">Request</option>
            {sources.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </optgroup>
        </SelectField>
      }
    />
  );

  const rows = (
    <>
      <div hidden={!pages.filterError} role="alert" className="ndb:p-3 ndb:text-xs">
        Timeline could not be filtered.{' '}
        <button
          type="button"
          onClick={() => applyFilters(filter, search)}
          className="ndb:font-semibold ndb:underline"
        >
          Retry
        </button>
      </div>
      <div
        data-ndb-timeline-waterfall-header=""
        className="ndb:sticky ndb:top-0 ndb:z-10 ndb:hidden ndb:grid-cols-[minmax(13rem,0.8fr)_minmax(20rem,2fr)_6rem] ndb:border-b ndb:border-zinc-200/90 ndb:bg-white/95 ndb:text-xs ndb:font-semibold ndb:uppercase ndb:tracking-wider ndb:text-zinc-400 ndb:backdrop-blur-sm ndb:dark:border-zinc-800 ndb:dark:bg-zinc-950/95 ndb:lg:grid"
      >
        <span className="ndb:px-3 ndb:py-2">Activity</span>
        <span
          data-ndb-timeline-waterfall=""
          className="ndb:relative ndb:border-x ndb:border-zinc-200/90 ndb:dark:border-zinc-800"
          aria-label={`Timeline from zero to ${summary.durationLabel}`}
        >
          {summary.ticks.map(({ tick, label }) => (
            <span
              key={tick}
              data-ndb-timeline-tick={tick}
              className="ndb:absolute ndb:top-1/2 ndb:-translate-x-1/2 ndb:-translate-y-1/2 ndb:normal-case ndb:tracking-normal ndb:first:translate-x-0 ndb:last:-translate-x-full"
              style={{ left: `${tick}%` }}
            >
              {label}
            </span>
          ))}
        </span>
        <span className="ndb:px-3 ndb:py-2 ndb:text-right">Time</span>
      </div>

      {items.map((item) => (
        <TimelineRow
          key={item.id}
          item={item}
          selected={selected?.id === item.id}
          onSelect={() => select(item)}
        />
      ))}

      {items.length === 0 && (
        <div className="ndb:p-3">
          <EmptyState label="No timeline activity matches this search and filter." />
        </div>
      )}

      {summary.hasMore ? (
        <div
          key={`timeline-page-sentinel-${summary.loaded}`}
          ref={setSentinel}
          data-ndb-timeline-pagination=""
          data-ndb-timeline-page-sentinel=""
          aria-busy={pages.loadingMore ? 'true' : undefined}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="ndb:flex ndb:min-h-12 ndb:items-center ndb:justify-center ndb:px-3 ndb:py-3 ndb:text-center"
        >
          <span
            hidden={pages.loadingMore || pages.paginationError}
            className="ndb:text-xs ndb:font-semibold ndb:text-zinc-400"
          >
            {summary.pageLabel}
          </span>
          <span
            hidden={!pages.loadingMore}
            data-ndb-timeline-page-loading=""
            className="ndb:inline-flex ndb:items-center ndb:gap-2 ndb:text-xs ndb:font-semibold ndb:text-zinc-500 ndb:dark:text-zinc-300"
          >
            <span
              aria-hidden="true"
              className="ndb:size-3 ndb:animate-spin ndb:rounded-full ndb:border-2 ndb:border-zinc-300 ndb:border-t-indigo-500 ndb:dark:border-zinc-700 ndb:dark:border-t-indigo-400"
            />
            {summary.loadingLabel}
          </span>
          <span
            hidden={!pages.paginationError}
            data-ndb-timeline-page-error=""
            className="ndb:inline-flex ndb:flex-wrap ndb:items-center ndb:justify-center ndb:gap-x-2 ndb:gap-y-1 ndb:text-xs ndb:font-semibold ndb:text-rose-700 ndb:dark:text-rose-300"
          >
            More activity could not be loaded.
            <button
              type="button"
              data-ndb-timeline-page-retry=""
              onClick={() => pages.load(nextTimelinePageQuery(pages.query.current), 'more')}
              className="ndb:h-auto ndb:bg-transparent ndb:p-0 ndb:font-bold ndb:underline ndb:decoration-current/50 ndb:underline-offset-2 ndb:hover:decoration-current ndb:focus-visible:rounded-sm ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-2 ndb:focus-visible:outline-indigo-500"
            >
              Retry
            </button>
          </span>
        </div>
      ) : summary.completeLabel !== null ? (
        <p
          data-ndb-timeline-complete=""
          className="ndb:px-3 ndb:py-3 ndb:text-center ndb:text-xs ndb:font-semibold ndb:text-zinc-400"
        >
          {summary.completeLabel}
        </p>
      ) : null}
    </>
  );

  return (
    <div
      data-ndb-timeline=""
      className="ndb:text-zinc-950 ndb:dark:text-white ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col"
    >
      <InspectorWorkspace
        mode="focus"
        frame="top"
        detailOpen={detailOpen}
        detailId="newdebugbar-timeline-detail"
        detailRef={detailRef}
        detailLabel="Selected timeline activity"
        backLabel="Timeline"
        onClose={close}
        data-ndb-timeline-workspace=""
        className="ndb:flex ndb:min-h-0 ndb:flex-1 ndb:flex-col"
        listProps={{ className: 'ndb:flex ndb:h-full ndb:min-h-0 ndb:flex-col' }}
        list={
          <InspectorListPanel
            detailOpen={false}
            listRef={listRef}
            data-ndb-timeline-list-panel=""
            className="ndb:min-h-[32rem] ndb:flex-1 ndb:lg:min-h-0 ndb:lg:border-r-0"
            controls={controls}
            listProps={{
              'aria-busy': pages.filtering ? 'true' : undefined,
              'data-ndb-timeline-list': '',
              className: 'ndb:divide-y ndb:divide-zinc-200/80 ndb:bg-transparent ndb:dark:divide-zinc-800',
            }}
            list={rows}
          />
        }
        detailProps={{ className: 'ndb-scrollbar ndb:h-full ndb:min-h-0 ndb:overflow-y-auto' }}
        detail={
          selected !== null ? (
            <TimelineDetail
              item={selected}
              onOpenInspector={() => shell.selectInspector(selected.inspector)}
            />
          ) : null
        }
      />
    </div>
  );
}
