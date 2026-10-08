import { useMemo, useRef, useState } from 'react';
import { nextTick } from '../../app/store.js';
import { filterLogs, logChannels, logFirstSequence, logLevels } from '../../inspectors/logs.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorDetailBack } from '../components/InspectorDetailBack.jsx';
import { InspectorDetailEmpty } from '../components/InspectorDetailEmpty.jsx';
import { InspectorDetailPane } from '../components/InspectorDetailPane.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { SearchField } from '../components/SearchField.jsx';
import { SelectField } from '../components/SelectField.jsx';
import { LogDetail } from './logs/LogDetail.jsx';
import { LogEntry } from './logs/LogEntry.jsx';

const ucfirst = (value) => value.charAt(0).toUpperCase() + value.slice(1);

/** Renders a chronological diagnostic stream with structured log details (logs.blade.php). */
export function LogsInspector({ inspector }) {
  const payload = inspector.payload ?? {};
  const summary = inspector.summary ?? {};
  const groups = useMemo(() => Object.values(payload.groups ?? payload.items ?? []), [payload]);
  const levelCounts = summary.levels && typeof summary.levels === 'object' ? summary.levels : {};
  const levels = useMemo(() => logLevels(levelCounts), [levelCounts]);
  const channels = useMemo(() => logChannels(groups, summary.channels), [groups, summary.channels]);

  const [level, setLevel] = useState('all');
  const [channel, setChannel] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const listRef = useRef(null);
  const detailRef = useRef(null);

  const { visible, records } = useMemo(
    () => filterLogs(groups, { level, channel, search }),
    [groups, level, channel, search],
  );
  const selectedEntry = visible.find((entry) => logFirstSequence(entry) === selected) ?? null;

  // A selection hidden by the filters is cleared, like the list's old filter pass.
  if (selected !== null && selectedEntry === null) {
    setSelected(null);
    setDetailOpen(false);
  }

  if (groups.length === 0) {
    return (
      <div data-ndb-log-empty="">
        <EmptyState label="No log records were captured for this request." success />
      </div>
    );
  }

  const select = (sequence) => {
    setSelected(sequence);
    setDetailOpen(true);
    nextTick(() => {
      detailRef.current?.scrollTo?.({ top: 0, behavior: 'instant' });
      if (window.innerWidth < 1024) detailRef.current?.focus({ preventScroll: true });
    });
  };

  const close = () => {
    const sequence = selected;
    setDetailOpen(false);
    nextTick(() =>
      listRef.current
        ?.querySelector(`[data-ndb-log-entry][data-ndb-log-first-sequence="${sequence}"]`)
        ?.focus(),
    );
  };

  const total = summary.count ?? groups.length;
  const groupCount = visible.length;

  return (
    <div className="ndb:flex ndb:min-h-0 ndb:flex-1 ndb:flex-col">
      <InspectorWorkspace frame="top" data-ndb-log-workspace="">
        <InspectorListPanel
          detailOpen={detailOpen}
          listRef={listRef}
          controlsProps={{ 'data-ndb-log-controls': '' }}
          controls={
            <InspectorListControls
              showSearch
              layout="compact"
              leading={
                <p
                  data-ndb-log-visible-summary=""
                  aria-live="polite"
                  className="ndb:text-xs ndb:font-semibold ndb:text-zinc-600 ndb:dark:text-zinc-300"
                >
                  <span>{records}</span> <span>{records === 1 ? 'record' : 'records'}</span> in{' '}
                  <span>{groupCount}</span> <span>{groupCount === 1 ? 'entry' : 'entries'}</span>
                </p>
              }
              search={
                <SearchField
                  label="Search logs"
                  placeholder="Message, context, channel, or source"
                  data-ndb-log-search=""
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              }
              filter={
                <SelectField
                  label="Filter logs by severity"
                  data-ndb-log-level-select=""
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                >
                  <option value="all">All severities ({total})</option>
                  <option value="attention">Needs attention ({summary.attention_count ?? 0})</option>
                  {levels.map((value) => (
                    <option key={value} value={value}>
                      {ucfirst(value)} ({levelCounts[value]})
                    </option>
                  ))}
                </SelectField>
              }
              secondaryFilter={
                <SelectField
                  label="Filter logs by channel"
                  data-ndb-log-channel-select=""
                  value={channel}
                  onChange={(event) => setChannel(event.target.value)}
                >
                  <option value="all">All channels ({total})</option>
                  {channels.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.count})
                    </option>
                  ))}
                </SelectField>
              }
            />
          }
          listProps={{ 'data-ndb-log-list': '' }}
          list={visible.map((entry) => {
            const sequence = logFirstSequence(entry);

            return (
              <LogEntry
                key={`log-entry-${sequence}`}
                entry={entry}
                selected={selected === sequence}
                onSelect={select}
              />
            );
          })}
          emptyProps={{ hidden: groupCount !== 0, 'data-ndb-log-filter-empty': '' }}
          empty={<EmptyState label="No logs match these filters." />}
        />

        <InspectorDetailPane
          detailOpen={detailOpen}
          detailRef={detailRef}
          detailLabel="Selected log entry details"
          backLabel="Logs"
          onClose={close}
          id="newdebugbar-log-detail"
          data-ndb-log-detail=""
          back={
            <InspectorDetailBack
              data-ndb-log-detail-back=""
              onClick={close}
              label="Logs"
              className="ndb:bg-transparent"
            />
          }
        >
          {selectedEntry !== null ? <LogDetail key={selected} entry={selectedEntry} /> : null}

          <InspectorDetailEmpty
            hidden={selected !== null}
            label="Choose a log entry to inspect its evidence."
          />
        </InspectorDetailPane>
      </InspectorWorkspace>
    </div>
  );
}
