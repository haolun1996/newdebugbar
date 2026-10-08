import { useMemo, useRef, useState } from 'react';
import { cx } from '../../app/hooks.js';
import { nextTick } from '../../app/store.js';
import {
  defaultEventSelection,
  defaultEventSource,
  eventListenerActivity,
  eventSummaryText,
  filterEvents,
} from '../../inspectors/events.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { SearchField } from '../components/SearchField.jsx';
import { SelectField } from '../components/SelectField.jsx';
import { EventDetail } from './events/EventDetail.jsx';

const SOURCES = [
  ['all', 'All'],
  ['application', 'Application'],
  ['framework', 'Framework'],
];

const number = (value) => Number(value).toLocaleString('en-US');

function EventRow({ event, source, selected, onSelect }) {
  const activity = eventListenerActivity(event);
  const duplicates = Number(event.duplicate_registration_count ?? 0);
  const occurrences = Number(event.occurrence_count ?? 0);

  return (
    <button
      type="button"
      data-ndb-event-item={event.id}
      data-ndb-event-id={event.id}
      data-ndb-event-source-value={event.source}
      data-ndb-event-search-value={event.search}
      data-ndb-event-occurrence-count={event.occurrence_count}
      onClick={(click) => onSelect(event.id, click.currentTarget)}
      aria-pressed={selected}
      className={cx(
        'ndb:grid ndb:h-auto ndb:w-full ndb:grid-cols-[minmax(0,1fr)_8rem] ndb:items-baseline ndb:gap-x-3 ndb:gap-y-1 ndb:px-3 ndb:py-2.5 ndb:text-left ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:sm:py-3',
        selected
          ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
          : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
    >
      <span
        data-ndb-event-list-name=""
        className="ndb:col-start-1 ndb:row-start-1 ndb:min-w-0 ndb:truncate ndb:text-xs ndb:font-bold ndb:text-zinc-900 ndb:dark:text-zinc-100"
      >
        {event.display_name}
      </span>
      <span
        className="ndb:col-start-2 ndb:row-start-1 ndb:w-full ndb:truncate ndb:text-right ndb:text-xs ndb:font-semibold ndb:text-zinc-500 ndb:dark:text-zinc-400"
        title={activity}
      >
        {activity}
      </span>
      <span className="ndb:col-start-1 ndb:row-start-2 ndb:flex ndb:min-w-0 ndb:items-baseline ndb:gap-2 ndb:overflow-hidden ndb:text-xs ndb:text-zinc-400">
        <span
          hidden={!(source === 'all' || event.namespace === null)}
          className="ndb:shrink-0 ndb:font-semibold"
        >
          {event.source === 'application' ? 'Application' : 'Framework'}
        </span>
        {event.namespace !== null && event.namespace !== undefined ? (
          <code
            data-ndb-event-list-namespace=""
            className="ndb:min-w-0 ndb:truncate ndb:font-mono ndb:text-xs"
          >
            {event.namespace}
          </code>
        ) : null}
      </span>
      <span
        className={cx(
          'ndb:col-start-2 ndb:row-start-2 ndb:w-full ndb:truncate ndb:text-right ndb:text-xs ndb:font-semibold',
          {
            'ndb:text-amber-600 ndb:dark:text-amber-300': duplicates > 0,
            'ndb:tabular-nums ndb:text-zinc-400': duplicates === 0,
          },
        )}
      >
        {duplicates > 0
          ? 'Duplicate registration'
          : `${number(occurrences)} ${occurrences === 1 ? 'dispatch' : 'dispatches'}`}
      </span>
    </button>
  );
}

/** Groups Laravel dispatches into a compact event list with a focused evidence pane (events.blade.php). */
export function EventsInspector({ inspector }) {
  const summary = inspector.summary ?? {};
  const groups = useMemo(() => Object.values(inspector.payload?.groups ?? []), [inspector]);
  const sourceCounts = {
    all: Number(summary.retained_count ?? Object.values(inspector.payload?.items ?? []).length),
    application: Number(summary.application_count ?? 0),
    framework: Number(summary.framework_count ?? 0),
  };

  const [source, setSource] = useState(() => defaultEventSource(groups));
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => defaultEventSelection(groups));
  const [detailOpen, setDetailOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const returnFocus = useRef(null);
  const detailRef = useRef(null);

  const { visible, dispatches } = useMemo(
    () => filterEvents(groups, { source, search }),
    [groups, source, search],
  );
  const selectedEvent = visible.find((event) => event.id === selected) ?? null;

  // A selection hidden by the filters moves to the first visible event.
  if (selectedEvent === null && selected !== (visible[0]?.id ?? null)) {
    setSelected(visible[0]?.id ?? null);
    setTab('overview');
  }

  const changeSource = (next) => {
    setSource(next);
    setDetailOpen(false);
    setTab('overview');
    returnFocus.current = null;
    setSelected(filterEvents(groups, { source: next, search }).visible[0]?.id ?? null);
  };

  const select = (id, element) => {
    setSelected(id);
    setDetailOpen(true);
    setTab('overview');
    returnFocus.current = element;
    nextTick(() => {
      if (window.innerWidth < 1024) detailRef.current?.focus();
    });
  };

  const close = () => {
    const element = returnFocus.current;
    setDetailOpen(false);
    returnFocus.current = null;
    nextTick(() => element?.isConnected && element.focus());
  };

  const selectTab = (next) => {
    setTab(next);
    nextTick(() => detailRef.current?.scrollTo?.({ top: 0, behavior: 'instant' }));
  };

  return (
    <div
      data-ndb-events=""
      className="ndb:space-y-4 ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col ndb:lg:space-y-0"
    >
      {groups.length > 0 ? (
        <InspectorWorkspace frame="top" data-ndb-event-workspace="">
          <InspectorListPanel
            detailOpen={detailOpen}
            controls={
              <InspectorListControls
                showSearch
                leading={
                  <p
                    data-ndb-event-visible-summary=""
                    aria-live="polite"
                    className="ndb:min-w-0 ndb:text-xs ndb:font-semibold ndb:text-zinc-600 ndb:dark:text-zinc-300"
                  >
                    {eventSummaryText(visible.length, dispatches)}
                  </p>
                }
                search={
                  <SearchField
                    label="Search events"
                    placeholder="Search events, listeners, or payloads"
                    data-ndb-event-search=""
                    value={search}
                    onChange={(change) => setSearch(change.target.value)}
                  />
                }
                filter={
                  <SelectField
                    label="Filter events by source"
                    data-ndb-event-source-control=""
                    value={source}
                    onChange={(change) => changeSource(change.target.value)}
                  >
                    {SOURCES.map(([value, label]) => (
                      <option
                        key={value}
                        value={value}
                        data-ndb-event-source={value}
                        data-ndb-event-source-count={value}
                      >
                        {label} ({sourceCounts[value]})
                      </option>
                    ))}
                  </SelectField>
                }
              />
            }
            listProps={{ 'data-ndb-event-list': '', 'aria-label': 'Laravel events' }}
            list={visible.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                source={source}
                selected={selected === event.id}
                onSelect={select}
              />
            ))}
            emptyProps={{ 'data-ndb-event-empty': '', hidden: visible.length !== 0 }}
            empty={<EmptyState label="No events match this source and search." />}
          />

          <EventDetail
            event={selectedEvent}
            detailOpen={detailOpen}
            detailRef={detailRef}
            tab={tab}
            onTab={selectTab}
            onClose={close}
          />
        </InspectorWorkspace>
      ) : (
        <EmptyState label="No Laravel events were captured." />
      )}
    </div>
  );
}
