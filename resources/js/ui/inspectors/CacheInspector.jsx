import { useEffect, useMemo, useRef, useState } from 'react';
import { useInspectorController, useShell } from '../../app/hooks.js';
import { CACHE_FILTERS, cacheSummary, cacheView } from '../../inspectors/cache.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { CacheDetail } from './cache/CacheDetail.jsx';
import { CacheControls, CacheListItem } from './cache/CacheList.jsx';

/** Cache operations: filterable list plus the selected operation's result, value, and source. */
export function CacheInspector({ inspector, profileId }) {
  const shell = useShell();
  const operations = useMemo(() => Object.values(inspector.payload?.items ?? {}), [inspector]);
  const figures = useMemo(
    () => cacheSummary(inspector.summary ?? {}, operations.length),
    [inspector, operations],
  );
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => operations[0]?.execution ?? null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scrollRequest, setScrollRequest] = useState(0);
  const detailRef = useRef(null);

  useInspectorController('cache', profileId, {});

  const view = useMemo(
    () => cacheView(operations, { filter, search, selected }),
    [operations, filter, search, selected],
  );

  // A filter, search, or refreshed payload that hides the selection moves it to the first visible operation.
  if (view.selected !== selected) setSelected(view.selected);
  if (operations.length === 0 && detailOpen) setDetailOpen(false);

  useEffect(() => {
    if (scrollRequest === 0) return;
    shell.$refs?.content?.scrollTo?.({ top: 0, behavior: 'instant' });
    detailRef.current?.scrollTo?.({ top: 0, behavior: 'instant' });
  }, [scrollRequest]);

  const selectOperation = (execution) => {
    if (!operations.some((operation) => operation.execution === execution)) return;

    setSelected(execution);
    setDetailOpen(true);
    setScrollRequest((count) => count + 1);
  };

  const operation = operations.find((item) => item.execution === view.selected) ?? null;

  return (
    <div data-ndb-cache="" className="ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col">
      {operations.length > 0 ? (
        <InspectorWorkspace frame="top" data-ndb-cache-workspace="">
          <InspectorListPanel
            detailOpen={detailOpen}
            controls={
              <CacheControls
                figures={figures}
                itemCount={operations.length}
                visibleCount={view.visibleCount}
                search={search}
                onSearch={setSearch}
                filter={filter}
                onFilter={(value) => CACHE_FILTERS.includes(value) && setFilter(value)}
              />
            }
            list={view.rows.map(({ item, visible }) => (
              <CacheListItem
                key={item.execution}
                item={item}
                visible={visible}
                selected={view.selected === item.execution}
                onSelect={selectOperation}
              />
            ))}
            listProps={{ 'data-ndb-cache-list': '' }}
            empty={<EmptyState label="No cache operations match these controls." />}
            emptyProps={{ hidden: view.visibleCount !== 0 }}
          />

          <CacheDetail
            operation={operation}
            detailOpen={detailOpen}
            detailRef={detailRef}
            onClose={() => setDetailOpen(false)}
          />
        </InspectorWorkspace>
      ) : (
        <EmptyState
          centered
          data-ndb-cache-empty=""
          label="No cache operations were captured for this request."
          description="Reads, writes, deletes, and store flushes will appear here when Laravel emits them."
        />
      )}
    </div>
  );
}
