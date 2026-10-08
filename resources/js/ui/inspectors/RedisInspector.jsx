import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cx, registerScope, useInspectorController, useShell } from '../../app/hooks.js';
import { formatDuration } from '../../duration.js';
import { REDIS_FILTERS, redisSummary, redisView } from '../../inspectors/redis.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorOperationBadge } from '../components/InspectorOperationBadge.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { SearchField } from '../components/SearchField.jsx';
import { SelectField } from '../components/SelectField.jsx';
import { RedisDetail } from './redis/RedisDetail.jsx';

/** One direct Redis command row. */
function RedisListItem({ item, visible, selected, onSelect }) {
  return (
    <button
      type="button"
      data-ndb-redis-item={item.execution}
      data-ndb-redis-execution={item.execution}
      data-ndb-redis-failed={item.failed ? 'true' : 'false'}
      aria-controls="newdebugbar-redis-detail"
      hidden={!visible}
      onClick={() => onSelect(item.execution)}
      aria-pressed={selected}
      className={cx(
        'ndb:grid ndb:h-auto ndb:min-h-0 ndb:w-full ndb:min-w-0 ndb:grid-cols-[4.75rem_minmax(0,1fr)_4.75rem] ndb:items-center ndb:gap-x-2 ndb:border-l-0 ndb:bg-transparent ndb:px-3 ndb:py-2.5 ndb:text-left ndb:text-xs ndb:text-zinc-950 ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-white',
        selected
          ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
          : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
    >
      <InspectorOperationBadge wide data-ndb-redis-command="" className="ndb:row-span-2 ndb:self-center">
        {item.command}
      </InspectorOperationBadge>
      <span
        data-ndb-redis-key-label=""
        className="ndb:min-w-0 ndb:truncate ndb:bg-transparent ndb:text-xs ndb:font-semibold ndb:text-zinc-800 ndb:dark:text-zinc-200"
        title={item.key_label}
      >
        {item.key_label}
      </span>
      <span
        className={cx(
          'ndb:text-right ndb:text-xs ndb:font-bold',
          item.failed ? 'ndb:text-red-600 ndb:dark:text-red-300' : 'ndb:text-zinc-500 ndb:dark:text-zinc-400',
        )}
      >
        {item.status_label}
      </span>
      <span className="ndb:min-w-0 ndb:truncate ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
        {item.connection}
      </span>
      <span className="ndb:text-right ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400">
        {item.duration_label}
      </span>
    </button>
  );
}

/** Direct Redis commands with their keys, failures, timing, and source. */
export function RedisInspector({ inspector, profileId }) {
  const shell = useShell();
  const commands = useMemo(() => Object.values(inspector.payload?.records ?? {}), [inspector]);
  const figures = useMemo(
    () => redisSummary(inspector.summary ?? {}, commands, formatDuration),
    [inspector, commands],
  );
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => commands[0]?.execution ?? null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);
  const listRef = useRef(null);
  const detailRef = useRef(null);

  useInspectorController('redis', profileId, {});

  const view = useMemo(
    () => redisView(commands, { filter, search, selected }),
    [commands, filter, search, selected],
  );

  // A filter, search, or refreshed payload that hides the selection moves it to the first visible command.
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
        ?.querySelector(`[data-ndb-redis-item="${focusRequest.execution}"]`)
        ?.focus?.({ preventScroll: true });
    }
  }, [focusRequest]);

  const selectCommand = (execution) => {
    if (!commands.some((command) => command.execution === execution)) return;

    setSelected(execution);
    setDetailOpen(true);
    setFocusRequest({ target: 'detail', execution });
  };

  const closeDetail = () => {
    if (!detailOpen) return;

    setDetailOpen(false);
    setFocusRequest({ target: 'row', execution: view.selected });
  };

  const command = commands.find((item) => item.execution === view.selected) ?? null;
  const scope = useRef({}).current;
  Object.assign(scope, { redisCommands: commands, selectedRedisCommand: command });
  const scopeRef = useCallback((element) => registerScope(element, scope), [scope]);

  return (
    <div
      ref={scopeRef}
      data-ndb-redis=""
      className="ndb:border-l-0 ndb:bg-transparent ndb:text-zinc-950 ndb:dark:text-white ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col"
    >
      {commands.length > 0 ? (
        <InspectorWorkspace frame="top" data-ndb-redis-workspace="" className="ndb:border-x-0">
          <InspectorListPanel
            detailOpen={detailOpen}
            listRef={listRef}
            controls={
              <>
                <div className="ndb:min-w-0">
                  <p className="ndb:text-xs ndb:font-bold ndb:text-zinc-700 ndb:dark:text-zinc-200">
                    {figures.countLabel}{' '}
                    <span
                      hidden={view.visibleCount === commands.length}
                      className="ndb:ml-1 ndb:text-xs ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400"
                    >
                      <span data-ndb-redis-visible-count="">{view.visibleCount}</span> shown
                    </span>
                  </p>
                  <p className="ndb:mt-0.5 ndb:text-xs ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400">
                    {figures.line}
                  </p>
                </div>

                {figures.count >= 5 || figures.failures > 0 ? (
                  <InspectorListControls
                    showSearch={figures.count >= 5}
                    search={
                      <SearchField
                        label="Search Redis commands"
                        placeholder="Search commands or keys"
                        data-ndb-redis-search=""
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    }
                    filter={
                      figures.failures > 0 ? (
                        <SelectField
                          label="Filter Redis commands"
                          data-ndb-redis-filter=""
                          value={filter}
                          onChange={(event) =>
                            REDIS_FILTERS.includes(event.target.value) && setFilter(event.target.value)
                          }
                        >
                          <option value="all">{`All (${figures.count})`}</option>
                          <option value="failed">{`Failed (${figures.failures})`}</option>
                        </SelectField>
                      ) : undefined
                    }
                  />
                ) : null}
              </>
            }
            list={view.rows.map(({ item, visible }) => (
              <RedisListItem
                key={item.execution}
                item={item}
                visible={visible}
                selected={view.selected === item.execution}
                onSelect={selectCommand}
              />
            ))}
            listProps={{ 'data-ndb-redis-list': '' }}
            empty={<EmptyState label="No Redis commands match these controls." />}
            emptyProps={{ hidden: view.visibleCount !== 0 }}
          />

          <RedisDetail
            command={command}
            detailOpen={detailOpen}
            detailRef={detailRef}
            onClose={closeDetail}
          />
        </InspectorWorkspace>
      ) : (
        <EmptyState label="No direct Redis commands were captured." />
      )}
    </div>
  );
}
