import { useEffect, useMemo, useRef, useState } from 'react';
import { cx, registerScope, useInspectorController, useShell } from '../../app/hooks.js';
import {
  AUTHORIZATION_FILTERS,
  authorizationDecisions,
  authorizationFilters,
  reconcileAuthorizationSelection,
  visibleAuthorizationDecisions,
} from '../../inspectors/authorization.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { SearchField } from '../components/SearchField.jsx';
import { SelectField } from '../components/SelectField.jsx';
import { AuthorizationDetail } from './authorization/AuthorizationDetail.jsx';

const number = (value) => Number(value).toLocaleString('en-US');

function DecisionRow({ decision, selected, onSelect }) {
  return (
    <button
      type="button"
      data-ndb-authorization-item={decision.execution}
      data-ndb-authorization-execution={decision.execution}
      data-ndb-authorization-result={decision.result}
      data-ndb-authorization-search-value={decision.search}
      onClick={onSelect}
      aria-pressed={selected ? 'true' : 'false'}
      className={cx(
        'ndb:grid ndb:h-auto ndb:w-full ndb:grid-cols-[minmax(0,1fr)_4.75rem] ndb:items-start ndb:gap-x-3 ndb:gap-y-1.5 ndb:px-3 ndb:py-2.5 ndb:text-left ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:sm:py-3',
        selected
          ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
          : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
    >
      <span className="ndb:col-span-2 ndb:flex ndb:min-w-0 ndb:items-baseline ndb:gap-2">
        <span
          data-ndb-authorization-ability=""
          className="ndb:min-w-0 ndb:break-words ndb:text-xs ndb:font-bold ndb:leading-5"
        >
          {decision.ability}
        </span>
        <span
          data-ndb-authorization-result-label=""
          className={cx(
            'ndb:shrink-0 ndb:bg-transparent ndb:text-xs ndb:font-bold',
            decision.result === 'allowed'
              ? 'ndb:text-emerald-700 ndb:dark:text-emerald-300'
              : 'ndb:text-red-700 ndb:dark:text-red-300',
          )}
        >
          {decision.result_label}
        </span>
      </span>
      <span className="ndb:col-span-2 ndb:grid ndb:min-w-0 ndb:grid-cols-[4.75rem_minmax(0,1fr)] ndb:gap-x-2 ndb:gap-y-1 ndb:text-xs ndb:leading-4">
        <span className="ndb:font-semibold ndb:text-zinc-400">User</span>
        <span data-ndb-authorization-user="" className="ndb:min-w-0 ndb:bg-transparent ndb:p-0">
          <span className="ndb:block ndb:min-w-0 ndb:truncate ndb:font-semibold ndb:text-zinc-600 ndb:dark:text-zinc-300">
            {decision.user_label}
          </span>
        </span>
        <span className="ndb:font-semibold ndb:text-zinc-400">Arguments</span>
        <span data-ndb-authorization-arguments="" className="ndb:min-w-0 ndb:bg-transparent ndb:p-0">
          <span className="ndb:block ndb:min-w-0 ndb:truncate ndb:text-zinc-500 ndb:dark:text-zinc-400">
            {decision.argument_summary}
          </span>
        </span>
      </span>
    </button>
  );
}

/** Renders authorization decisions as a selectable list with structured diagnostic evidence (authorization.blade.php). */
export function AuthorizationInspector({ inspector, profileId }) {
  const shell = useShell();
  const decisions = useMemo(() => authorizationDecisions(inspector.payload), [inspector.payload]);
  const filters = useMemo(() => authorizationFilters(decisions), [decisions]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState(() => ({
    selected: decisions[0]?.execution ?? null,
    detailOpen: false,
  }));
  const visible = useMemo(
    () => visibleAuthorizationDecisions(decisions, filter, search),
    [decisions, filter, search],
  );
  const listRef = useRef(null);
  const detailRef = useRef(null);
  const scope = useRef({ selectedAuthorizationDecision: null });
  const selected = decisions.find((decision) => decision.execution === selection.selected) ?? null;
  scope.current.selectedAuthorizationDecision = selected;

  // Refreshed captures and filter changes keep the selection only while it stays visible.
  useEffect(() => {
    setSelection((current) => {
      const next = reconcileAuthorizationSelection(visible, current.selected, current.detailOpen);

      return next.selected === current.selected && next.detailOpen === current.detailOpen ? current : next;
    });
  }, [visible]);

  const applyFilter = (next) => {
    if (AUTHORIZATION_FILTERS.includes(next)) setFilter(next);
  };

  useInspectorController('authorization', profileId, { receiveIntent: applyFilter });

  const select = (execution) => {
    setSelection({ selected: execution, detailOpen: true });
    window.setTimeout(() => {
      if (window.matchMedia?.('(max-width: 1023px)')?.matches) {
        if (shell.$refs?.content) shell.$refs.content.scrollTop = 0;
        detailRef.current?.focus({ preventScroll: true });
      }
    });
  };

  const close = () => {
    const execution = selection.selected;
    setSelection((current) => ({ ...current, detailOpen: false }));
    window.setTimeout(() =>
      listRef.current?.querySelector(`[data-ndb-authorization-item="${execution}"]`)?.focus(),
    );
  };

  // A different decision starts its evidence from the top.
  useEffect(() => {
    detailRef.current?.scrollTo?.({ top: 0, behavior: 'instant' });
  }, [selection.selected]);

  return (
    <div
      data-ndb-authorization=""
      ref={(element) => registerScope(element, scope.current)}
      className="ndb:space-y-4 ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col ndb:lg:space-y-0"
    >
      {decisions.length > 0 ? (
        <InspectorWorkspace frame="top" data-ndb-authorization-workspace="">
          <InspectorListPanel
            detailOpen={selection.detailOpen}
            listRef={listRef}
            controls={
              <InspectorListControls
                showSearch={decisions.length > 5}
                leading={
                  <p
                    data-ndb-authorization-summary=""
                    className="ndb:min-w-0 ndb:text-xs ndb:font-semibold ndb:text-zinc-600 ndb:dark:text-zinc-300"
                  >
                    <span data-ndb-authorization-summary-count="" className="ndb:block">
                      {number(decisions.length)} {decisions.length === 1 ? 'decision' : 'decisions'}
                    </span>
                    <span
                      hidden={visible.length === decisions.length}
                      className="ndb:mt-0.5 ndb:block ndb:text-xs ndb:font-medium ndb:text-zinc-400"
                    >
                      {visible.length} shown
                    </span>
                  </p>
                }
                search={
                  <SearchField
                    label="Search authorization decisions"
                    placeholder="Search ability, user, or arguments"
                    data-ndb-authorization-search=""
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                }
                filter={
                  <SelectField
                    label="Filter authorization decisions"
                    data-ndb-authorization-filter-control=""
                    value={filter}
                    onChange={(event) => applyFilter(event.target.value)}
                  >
                    {filters.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        data-ndb-authorization-filter={option.value}
                      >
                        {option.label} ({option.count})
                      </option>
                    ))}
                  </SelectField>
                }
              />
            }
            listProps={{ 'data-ndb-authorization-list': '' }}
            list={visible.map((decision) => (
              <DecisionRow
                key={decision.execution}
                decision={decision}
                selected={selection.selected === decision.execution}
                onSelect={() => select(decision.execution)}
              />
            ))}
            emptyProps={{ hidden: visible.length !== 0 }}
            empty={<EmptyState label="No authorization decisions match these filters." />}
          />

          <AuthorizationDetail
            decision={selected}
            detailOpen={selection.detailOpen}
            detailRef={detailRef}
            onClose={close}
          />
        </InspectorWorkspace>
      ) : (
        <EmptyState label="No authorization decisions were captured." />
      )}
    </div>
  );
}
