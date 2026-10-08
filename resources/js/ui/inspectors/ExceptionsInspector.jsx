import { useEffect, useRef, useState } from 'react';
import { cx } from '../../app/hooks.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorDetailBack } from '../components/InspectorDetailBack.jsx';
import { InspectorDetailPane } from '../components/InspectorDetailPane.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { countLabel } from './count-label.js';
import { ExceptionDetail } from './exceptions/ExceptionDetail.jsx';
import { profileActionLabel } from './exceptions/exception-view.js';

function ExceptionListItem({ exception, index, selected, onSelect }) {
  return (
    <button
      type="button"
      data-ndb-exception-item={index}
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(
        'ndb:block ndb:h-auto ndb:w-full ndb:min-w-0 ndb:px-3 ndb:py-2.5 ndb:text-left ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:sm:py-3',
        selected
          ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
          : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
    >
      <code className="ndb:block ndb:min-w-0 ndb:truncate ndb:font-mono ndb:text-xs ndb:font-bold">
        {exception.class}
      </code>
      <span className="ndb:mt-1 ndb:block ndb:min-w-0 ndb:truncate ndb:text-xs ndb:font-semibold">
        {exception.message || 'No exception message'}
      </span>
      <span className="ndb:mt-1 ndb:block ndb:min-w-0 ndb:truncate ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
        {exception.file}:{exception.line}
      </span>
    </button>
  );
}

function SplitExceptions({ exceptions, actionLabel }) {
  const [selected, setSelected] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);
  const rootRef = useRef(null);
  const detailRef = useRef(null);

  useEffect(() => {
    if (focusRequest === null) return;

    if (focusRequest.target === 'detail') detailRef.current?.focus();
    else rootRef.current?.querySelector(`[data-ndb-exception-item='${focusRequest.index}']`)?.focus();
  }, [focusRequest]);

  const select = (index) => {
    setSelected(index);
    setDetailOpen(true);
    setFocusRequest({ target: 'detail', index });
  };

  const close = () => {
    setDetailOpen(false);
    setFocusRequest({ target: 'item', index: selected });
  };

  return (
    <div
      ref={rootRef}
      data-ndb-exceptions=""
      data-ndb-exception-layout="split"
      className="ndb:flex ndb:min-h-0 ndb:flex-1 ndb:flex-col ndb:overflow-hidden ndb:border-0 ndb:bg-transparent ndb:p-0"
    >
      <InspectorWorkspace frame="top" data-ndb-exception-workspace="" className="ndb:border-l-0 ndb:p-0">
        <InspectorListPanel
          detailOpen={detailOpen}
          data-ndb-exception-list-panel=""
          className="ndb:border-l-0 ndb:bg-transparent ndb:p-0"
          controls={
            <InspectorListControls
              showSearch={false}
              leading={
                <p className="ndb:text-xs ndb:font-semibold ndb:text-zinc-600 ndb:dark:text-zinc-300">
                  {countLabel(exceptions.length, 'exception')}
                </p>
              }
            />
          }
          list={exceptions.map((exception, index) => (
            <ExceptionListItem
              key={index}
              exception={exception}
              index={index}
              selected={selected === index}
              onSelect={() => select(index)}
            />
          ))}
          listProps={{ 'data-ndb-exception-list': '' }}
        />

        <InspectorDetailPane
          detailOpen={detailOpen}
          detailRef={detailRef}
          detailLabel="Selected exception details"
          backLabel="Exceptions"
          onClose={close}
          data-ndb-exception-split-detail=""
          className="ndb:bg-transparent ndb:p-0"
          back={
            <InspectorDetailBack
              data-ndb-exception-detail-back=""
              onClick={close}
              label="Exceptions"
              className="ndb:bg-transparent"
            />
          }
        >
          {exceptions[selected] ? (
            <ExceptionDetail
              key={selected}
              exception={exceptions[selected]}
              index={selected}
              profileActionLabel={actionLabel}
            />
          ) : null}
        </InspectorDetailPane>
      </InspectorWorkspace>
    </div>
  );
}

/** Renders one exception as focused evidence and multiple exceptions as a list-detail inspector. */
export function ExceptionsInspector({ inspector, profile }) {
  const exceptions = Object.values(inspector.payload?.items ?? {});
  const actionLabel = profileActionLabel(profile?.profile_type);

  if (exceptions.length === 0) return <EmptyState label="No exceptions were reported." success />;

  if (exceptions.length > 1) return <SplitExceptions exceptions={exceptions} actionLabel={actionLabel} />;

  return (
    <div
      data-ndb-exceptions=""
      data-ndb-exception-layout="focused"
      className="ndb:flex ndb:min-h-0 ndb:flex-1 ndb:flex-col ndb:overflow-hidden ndb:border-0 ndb:bg-transparent ndb:p-0"
    >
      <InspectorWorkspace
        mode="stream"
        frame="top"
        data-ndb-exception-workspace=""
        data-ndb-exception-focused-workspace=""
        className="ndb:border-l-0 ndb:p-0"
        body={<ExceptionDetail exception={exceptions[0]} index={0} profileActionLabel={actionLabel} />}
        bodyProps={{
          'data-ndb-exception-focused-detail': '',
          className: 'ndb:border-0 ndb:bg-transparent ndb:p-0',
        }}
      />
    </div>
  );
}
