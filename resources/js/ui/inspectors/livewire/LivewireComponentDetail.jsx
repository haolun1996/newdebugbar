import { cx } from '../../../app/hooks.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { FilterTab } from '../../components/FilterTab.jsx';
import { Icon } from '../../components/Icon.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorDetailTabs } from '../../components/InspectorDetailTabs.jsx';
import { InspectorEvidence } from '../../components/InspectorEvidence.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorSourceFact } from '../../components/InspectorSourceFact.jsx';
import { LivewirePropertyEditor } from './LivewirePropertyEditor.jsx';

const PROPERTY_COLUMNS =
  'ndb:hidden ndb:grid-cols-[minmax(10rem,1fr)_minmax(7rem,0.8fr)_minmax(7rem,0.8fr)_5rem_3rem] ndb:gap-3 ndb:border-b ndb:border-zinc-200/90 ndb:bg-zinc-50/75 ndb:px-3 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:sm:grid ndb:sm:min-w-[36rem] ndb:dark:border-zinc-800 ndb:dark:bg-zinc-900/55';

const location = (source) => (source?.file ? `${source.file}${source.line ? `:${source.line}` : ''}` : null);

function PropertyValue({ label, value, muted = false }) {
  return (
    <div className="ndb:flex ndb:min-w-0 ndb:items-baseline ndb:gap-2 ndb:sm:block">
      <span className="ndb:w-16 ndb:shrink-0 ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:sm:hidden">
        {label}
      </span>
      <code
        className={cx(
          'ndb:block ndb:min-w-0 ndb:flex-1 ndb:truncate ndb:text-xs ndb:sm:w-full',
          muted && 'ndb:text-zinc-500 ndb:dark:text-zinc-400',
        )}
        title={value}
      >
        {value}
      </code>
    </div>
  );
}

function PropertyRow({ state, row }) {
  return (
    <div
      data-ndb-livewire-property-path={row.path}
      className="ndb:border-b ndb:border-zinc-200/80 ndb:last:border-b-0 ndb:sm:min-w-[36rem] ndb:dark:border-zinc-800"
    >
      <div className="ndb:grid ndb:min-w-0 ndb:gap-2 ndb:px-3 ndb:py-2.5 ndb:sm:grid-cols-[minmax(10rem,1fr)_minmax(7rem,0.8fr)_minmax(7rem,0.8fr)_5rem_3rem] ndb:sm:items-center ndb:sm:gap-3">
        <div
          data-ndb-livewire-property-name=""
          className="ndb:flex ndb:min-w-0 ndb:items-center ndb:gap-1.5"
          style={{ paddingLeft: `${row.depth * 16}px` }}
        >
          {row.hasChildren ? (
            <button
              data-ndb-livewire-property-toggle=""
              type="button"
              onClick={() => state.toggleLivewireProperty(row)}
              aria-expanded={row.expanded}
              aria-label={`${row.expanded ? 'Collapse' : 'Expand'} ${row.path}`}
              className="ndb:grid ndb:size-5 ndb:shrink-0 ndb:place-items-center ndb:rounded ndb:text-zinc-400 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500"
            >
              <Icon
                name="chevron-down"
                size={3}
                className={cx('ndb:transition', { 'ndb:-rotate-90': !row.expanded })}
              />
            </button>
          ) : null}
          <code
            data-ndb-livewire-property-label=""
            className="ndb:min-w-0 ndb:truncate ndb:text-xs ndb:font-bold"
            title={row.path}
          >
            {row.label}
          </code>
          <span className="ndb:shrink-0 ndb:rounded-md ndb:bg-zinc-100 ndb:px-1.5 ndb:py-0.5 ndb:text-xs ndb:font-bold ndb:text-zinc-500 ndb:dark:bg-zinc-800 ndb:dark:text-zinc-400">
            {row.phpType ?? row.type}
          </span>
        </div>
        <PropertyValue label="Client" value={row.valueSummary} />
        <PropertyValue label="Server" value={row.serverSummary} muted />
        <div>
          <span
            className={cx(
              'ndb:text-xs ndb:font-bold',
              row.state === 'Dirty'
                ? 'ndb:text-amber-700 ndb:dark:text-amber-300'
                : row.state === 'Updating'
                  ? 'ndb:text-indigo-700 ndb:dark:text-indigo-300'
                  : ['Locked', 'Unknown'].includes(row.state)
                    ? 'ndb:text-zinc-400'
                    : 'ndb:text-zinc-600 ndb:dark:text-zinc-300',
            )}
            title={state.livewirePropertyStateDescription(row)}
          >
            {state.livewirePropertyStateLabel(row)}
          </span>
        </div>
        <LivewirePropertyEditor state={state} row={row} />
      </div>
    </div>
  );
}

function PropertiesPanel({ state, component }) {
  const rows = state.livewirePropertyRows;
  const status = component.status;

  return (
    <div
      data-ndb-livewire-detail-panel="properties"
      className="ndb:space-y-3 ndb:p-3 ndb:sm:space-y-5 ndb:sm:p-4"
    >
      <InspectorFacts columns={4}>
        <InspectorFact
          label="State"
          valueProps={{
            className: cx(
              'ndb:truncate ndb:font-semibold',
              status === 'failed'
                ? 'ndb:text-red-700 ndb:dark:text-red-300'
                : status === 'updating'
                  ? 'ndb:text-indigo-700 ndb:dark:text-indigo-300'
                  : 'ndb:text-zinc-700 ndb:dark:text-zinc-200',
            ),
            title: state.livewireComponentStatusDescription(component),
          }}
        >
          {status === 'stale'
            ? 'Server only'
            : String(status ?? '').replace(/\b\w/g, (letter) => letter.toUpperCase())}
        </InspectorFact>
        <InspectorFact label="Parent" valueProps={{ className: 'ndb:truncate ndb:font-semibold' }}>
          {component.parentId ? state.livewireComponentTitle(component.parentId) : 'Top level'}
        </InspectorFact>
        <InspectorFact
          label="Properties"
          valueProps={{
            'data-ndb-livewire-component-property-count': '',
            className: 'ndb:truncate ndb:font-semibold ndb:tabular-nums',
          }}
        >
          {state.livewireComponentPropertyCountLabel(component)}
        </InspectorFact>
        <InspectorFact
          label="Changed / editable"
          valueProps={{
            'data-ndb-livewire-component-property-summary': '',
            className: 'ndb:truncate ndb:font-semibold ndb:tabular-nums',
          }}
        >
          {state.livewireComponentPropertyStateSummary(component)}
        </InspectorFact>
      </InspectorFacts>

      <section>
        <div
          hidden={rows.length === 0}
          data-ndb-livewire-property-table=""
          className="ndb-scrollbar ndb:overflow-x-auto ndb:border-b ndb:border-zinc-200/90 ndb:dark:border-zinc-800"
        >
          <div className={PROPERTY_COLUMNS}>
            <span>Property</span>
            <span>Client</span>
            <span>Server</span>
            <span>State</span>
            <span></span>
          </div>

          {rows.map((row) => (
            <PropertyRow key={`${row.componentId}:${row.path}`} state={state} row={row} />
          ))}
        </div>

        <div hidden={rows.length !== 0} data-ndb-livewire-property-empty="" className="ndb:mt-3">
          <EmptyState label="No serialized public properties." />
        </div>
      </section>
    </div>
  );
}

function SourcePanel({ component }) {
  const server = component.server;
  const componentFile = location(server?.source);
  const viewFile = location(server?.view?.source);

  return (
    <div
      data-ndb-livewire-detail-panel="source"
      className="ndb:space-y-3 ndb:p-3 ndb:sm:space-y-4 ndb:sm:p-4"
    >
      <dl className="ndb:grid ndb:grid-cols-1 ndb:gap-2 ndb:sm:grid-cols-2">
        <InspectorSourceFact label="Implementation" valueProps={{}}>
          {server?.implementation === 'single_file'
            ? 'Single file'
            : server?.implementation === 'class'
              ? 'Class'
              : 'Browser only'}
        </InspectorSourceFact>
        <InspectorSourceFact label="Instance" valueProps={{}}>
          <span
            data-ndb-livewire-component-instance=""
            className="ndb:block ndb:truncate ndb:text-xs ndb:font-semibold"
            title={component.id}
          >
            {component.id}
          </span>
        </InspectorSourceFact>
        <InspectorSourceFact label="Component file" hidden={!server?.source?.file} valueProps={{}}>
          {componentFile ?? 'Not captured'}
        </InspectorSourceFact>
        <InspectorSourceFact label="Blade view" hidden={!server?.view?.name} valueProps={{}}>
          {server?.view?.name ?? 'Not captured'}
        </InspectorSourceFact>
        <InspectorSourceFact
          label="View file"
          hidden={!(server?.view?.source?.file && server.view.source.file !== server?.source?.file)}
          className="ndb:sm:col-span-2"
          valueProps={{}}
        >
          {viewFile}
        </InspectorSourceFact>
      </dl>

      <InspectorEvidence
        label="Component class"
        language="php"
        hidden={!server?.class}
        value={server?.class ?? ''}
      />
    </div>
  );
}

/** The selected mounted component: its client/server property state and where it is defined. */
export function LivewireComponentDetail({ state, component }) {
  const tab = state.livewireDetailTab;

  return (
    <article data-ndb-livewire-component-detail="" className="ndb:flex ndb:min-h-0 ndb:flex-1 ndb:flex-col">
      <InspectorDetailHeader
        data-ndb-livewire-component-header=""
        title={
          <div className="ndb:min-w-0">
            <h3 className="ndb:min-w-0 ndb:break-words ndb:text-sm ndb:font-bold">{component.title}</h3>
            <p
              className="ndb:mt-0.5 ndb:truncate ndb:text-xs ndb:font-medium ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400"
              title={component.name}
            >
              {component.name}
            </p>
          </div>
        }
      />

      <InspectorDetailTabs label="Livewire component detail">
        <FilterTab
          variant="segmented"
          data-ndb-livewire-detail-tab="properties"
          onClick={() => state.setLivewireDetailTab('properties')}
          aria-pressed={tab === 'properties'}
          className="ndb:h-auto"
        >
          Properties
        </FilterTab>
        <FilterTab
          variant="segmented"
          data-ndb-livewire-detail-tab="source"
          onClick={() => state.setLivewireDetailTab('source')}
          aria-pressed={tab === 'source'}
          className="ndb:h-auto"
        >
          Source
        </FilterTab>
      </InspectorDetailTabs>

      {tab === 'properties' ? <PropertiesPanel state={state} component={component} /> : null}
      {tab === 'source' ? <SourcePanel component={component} /> : null}
    </article>
  );
}
