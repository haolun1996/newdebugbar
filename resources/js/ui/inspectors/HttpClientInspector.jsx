import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registerScope, useInspectorController } from '../../app/hooks.js';
import {
  HTTP_CLIENT_DETAIL_TABS,
  HTTP_CLIENT_FILTERS,
  formatHttpClientEvidence,
  httpClientView,
  nextHttpClientSort,
  normalizeHttpClientRequests,
} from '../../inspectors/http-client.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { HttpClientDetail } from './http-client/HttpClientDetail.jsx';
import {
  HttpClientControls,
  HttpClientListHeading,
  HttpClientListItem,
} from './http-client/HttpClientList.jsx';

/** Outbound HTTP requests: filterable list plus the selected request's response, request, and source evidence. */
export function HttpClientInspector({ inspector, profileId }) {
  const requests = useMemo(() => normalizeHttpClientRequests(inspector.payload?.items), [inspector]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState({ sort: 'execution', direction: 'asc' });
  const [selected, setSelected] = useState(() => requests[0]?.execution ?? null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [tab, setTab] = useState('response');
  const detailRef = useRef(null);
  const scrollDetail = useRef(false);

  useInspectorController('http_client', profileId, {});

  const view = useMemo(
    () => httpClientView(requests, { filter, search, ...order, selected }),
    [requests, filter, search, order, selected],
  );

  // A filter, search, or refreshed payload that hides the selection moves it to the first visible request.
  if (view.selected !== selected) {
    setSelected(view.selected);
    setTab('response');
  }
  if (requests.length === 0 && detailOpen) setDetailOpen(false);

  const request = requests.find((item) => item.execution === view.selected) ?? null;

  useEffect(() => {
    if (!scrollDetail.current) return;
    scrollDetail.current = false;
    detailRef.current?.scrollTo?.({ top: 0, behavior: 'instant' });
  }, [tab]);

  const selectRequest = (execution) => {
    if (!requests.some((item) => item.execution === execution)) return;

    setSelected(execution);
    setDetailOpen(true);
    setTab('response');
  };

  const changeTab = (next) => {
    if (!HTTP_CLIENT_DETAIL_TABS.includes(next)) return;

    scrollDetail.current = true;
    setTab(next);
  };

  const scope = useRef({}).current;
  Object.assign(scope, { selectedHttpClientRequest: request, formatHttpClientEvidence });
  const scopeRef = useCallback((element) => registerScope(element, scope), [scope]);

  return (
    <div
      ref={scopeRef}
      data-ndb-http-client=""
      className="ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col"
    >
      {requests.length > 0 ? (
        <InspectorWorkspace frame="top" data-ndb-http-client-workspace="">
          <InspectorListPanel
            detailOpen={detailOpen}
            controls={
              <HttpClientControls
                summary={inspector.summary ?? {}}
                requests={requests}
                visibleCount={view.visibleCount}
                search={search}
                onSearch={setSearch}
                filter={filter}
                onFilter={(value) => HTTP_CLIENT_FILTERS.includes(value) && setFilter(value)}
              />
            }
            list={
              <>
                <HttpClientListHeading
                  sort={order.sort}
                  direction={order.direction}
                  onSort={(column) => setOrder((current) => nextHttpClientSort(current, column))}
                />
                {view.rows.map(({ item, visible }) => (
                  <HttpClientListItem
                    key={item.execution}
                    item={item}
                    visible={visible}
                    selected={view.selected === item.execution}
                    onSelect={selectRequest}
                  />
                ))}
              </>
            }
            listProps={{ 'data-ndb-http-client-list': '', hidden: view.visibleCount === 0 }}
            empty={<EmptyState label="No outbound HTTP requests match these controls." />}
            emptyProps={{
              hidden: view.visibleCount !== 0,
              className: 'ndb:flex ndb:min-h-0 ndb:flex-1 ndb:items-center ndb:justify-center',
            }}
          />

          <HttpClientDetail
            request={request}
            tab={tab}
            onTab={changeTab}
            detailOpen={detailOpen}
            detailRef={detailRef}
            onClose={() => setDetailOpen(false)}
          />
        </InspectorWorkspace>
      ) : (
        <EmptyState
          centered
          data-ndb-http-client-empty=""
          label="No outbound HTTP requests were captured for this request."
          description="Requests made through Laravel's HTTP client will appear here with their response, timing, and source."
        />
      )}
    </div>
  );
}
