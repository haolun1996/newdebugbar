import { formatViewData, viewDataIsEmpty } from '../../../inspectors/views.js';
import { CodeBlock } from '../../components/CodeBlock.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { InspectorAction } from '../../components/InspectorAction.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorSourceFact } from '../../components/InspectorSourceFact.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { SelectField } from '../../components/SelectField.jsx';

function Composers({ composers }) {
  return (
    <div data-ndb-view-composers="">
      <h4 className="ndb:text-xs ndb:font-bold">View composers</h4>
      <ul className="ndb:mt-2 ndb:divide-y ndb:divide-zinc-200/80 ndb:border-y ndb:border-zinc-200/80 ndb:dark:divide-zinc-800 ndb:dark:border-zinc-800">
        {composers.map((composer, index) => (
          <li
            key={`${composer.name}:${composer.source_label ?? ''}:${index}`}
            className="ndb:min-w-0 ndb:py-2.5"
          >
            <p className="ndb:break-words ndb:text-xs ndb:font-semibold">{composer.name}</p>
            {composer.source_label ? (
              <InspectorSourceLink
                copy={composer.source_label}
                title={composer.source_label}
                valueProps={{}}
                className="ndb:mt-0.5 ndb:text-zinc-500 ndb:dark:text-zinc-400"
              >
                {composer.source_label}
              </InspectorSourceLink>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PassedData({ data }) {
  return (
    <div
      data-ndb-view-data-panel=""
      className="ndb:min-h-0 ndb:border-t ndb:border-l-0 ndb:border-zinc-200/90 ndb:bg-transparent ndb:px-0 ndb:pt-3 ndb:pb-0 ndb:sm:pt-4 ndb:dark:border-zinc-800"
    >
      <h4 className="ndb:mb-2 ndb:text-xs ndb:font-bold">Passed data</h4>

      <div
        hidden={!data.loading}
        data-ndb-view-data-loading=""
        className="ndb:flex ndb:items-center ndb:gap-2 ndb:py-3 ndb:text-xs ndb:font-semibold ndb:text-zinc-500 ndb:dark:text-zinc-400"
      >
        <span className="ndb:size-1.5 ndb:rounded-full ndb:bg-indigo-500"></span>
        Loading render data…
      </div>

      {data.loaded && !viewDataIsEmpty(data.value) ? (
        <CodeBlock
          language="json"
          tabIndex={0}
          data-ndb-view-data=""
          className="ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-2 ndb:focus-visible:outline-indigo-500"
          source={formatViewData(data.value)}
        />
      ) : null}

      {data.loaded && viewDataIsEmpty(data.value) ? (
        <EmptyState label="No data was passed directly to this render." />
      ) : null}

      {data.error ? (
        <div className="ndb:flex ndb:flex-wrap ndb:items-center ndb:justify-between ndb:gap-3">
          <p className="ndb:text-xs ndb:font-semibold ndb:text-amber-700 ndb:dark:text-amber-300">
            Render data could not be loaded.
          </p>
          <InspectorAction icon="activity" data-ndb-view-data-retry="" onClick={data.retry}>
            Retry
          </InspectorAction>
        </div>
      ) : null}
    </div>
  );
}

/** The selected view's render facts and its on-demand passed data. */
export function ViewDetail({ group, render, renderOrder, onRender, data }) {
  const items = Array.isArray(group.items) ? group.items : [];
  const composers = Array.isArray(render?.composers) ? render.composers : [];

  return (
    <div
      data-ndb-view-detail=""
      className="ndb:flex ndb:min-h-0 ndb:flex-col ndb:border-l-0 ndb:bg-transparent ndb:p-0"
    >
      <InspectorDetailHeader
        layout="wrap"
        data-ndb-view-detail-header=""
        title={
          <h3
            data-ndb-view-detail-name=""
            className="ndb:min-w-0 ndb:break-words ndb:font-sans ndb:text-sm ndb:font-bold ndb:leading-5 ndb:text-zinc-950 ndb:dark:text-white"
          >
            {group.display_name}
          </h3>
        }
        aside={
          items.length > 1 ? (
            <SelectField
              label="Select rendered view instance"
              data-ndb-view-render-select=""
              value={renderOrder ?? ''}
              onChange={(event) => onRender(Number(event.target.value))}
              className="ndb:w-32"
            >
              {items.map((view) => (
                <option key={view.render_order} value={view.render_order}>
                  {`Render #${view.render_order}`}
                </option>
              ))}
            </SelectField>
          ) : undefined
        }
        metadataProps={{
          'data-ndb-view-detail-metadata': '',
          className: 'ndb:gap-x-3 ndb:gap-y-2 ndb:sm:gap-x-6',
        }}
        metadata={
          <>
            <div className="ndb:min-w-0">
              <dt className="ndb:text-zinc-400">Origin</dt>
              <dd className="ndb:font-semibold">
                {group.origin === 'application' ? 'Application' : 'Framework'}
              </dd>
            </div>
            <div className="ndb:min-w-0">
              <dt className="ndb:text-zinc-400">Passed values</dt>
              <dd className="ndb:font-semibold ndb:tabular-nums">{render?.data_key_count}</dd>
            </div>
            {render?.composer_count > 0 ? (
              <div className="ndb:min-w-0" data-ndb-view-composer-count="">
                <dt className="ndb:text-zinc-400">Composers</dt>
                <dd className="ndb:font-semibold ndb:tabular-nums">{render.composer_count}</dd>
              </div>
            ) : null}
          </>
        }
      />

      <section
        data-ndb-view-detail-content=""
        className="ndb:space-y-3 ndb:border-l-0 ndb:bg-transparent ndb:p-3 ndb:sm:space-y-4 ndb:sm:p-4"
      >
        <InspectorSourceFact label="Render source" hidden={!render?.source_label} valueProps={{}}>
          {render?.source_label ? (
            <InspectorSourceLink copy={render.source_label} title={render.source_label} valueProps={{}}>
              {render.source_label}
            </InspectorSourceLink>
          ) : null}
        </InspectorSourceFact>

        {composers.length > 0 ? <Composers composers={composers} /> : null}

        <PassedData data={data} />
      </section>
    </div>
  );
}
