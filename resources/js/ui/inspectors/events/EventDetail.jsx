import { cx, useShell } from '../../../app/hooks.js';
import { formatDuration } from '../../../duration.js';
import { countPhrase, eventOrigin, eventSequence, sourceLabel } from '../../../inspectors/events.js';
import { FilterTab } from '../../components/FilterTab.jsx';
import { Icon } from '../../components/Icon.jsx';
import { InspectorAction } from '../../components/InspectorAction.jsx';
import { InspectorDefinitionRow } from '../../components/InspectorDefinitionRow.jsx';
import { InspectorDetailBack } from '../../components/InspectorDetailBack.jsx';
import { InspectorDetailEmpty } from '../../components/InspectorDetailEmpty.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorDetailPane } from '../../components/InspectorDetailPane.jsx';
import { InspectorDetailTabs } from '../../components/InspectorDetailTabs.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';

const TABS = [
  ['overview', 'Overview', 'eye'],
  ['payload', 'Payload', 'database'],
  ['source', 'Source', 'code'],
];

const array = (value) => (Array.isArray(value) ? value : []);

function OverviewPanel({ event }) {
  const shell = useShell();
  const listeners = array(event.listeners);
  const duplicates = Number(event.duplicate_registration_count ?? 0);
  const related = event.related_inspector ?? null;

  return (
    <div data-ndb-event-detail-panel="overview" className="ndb:p-3 ndb:sm:p-4">
      <InspectorFacts columns={4} data-ndb-event-facts="">
        <InspectorFact
          label="Origin"
          data-ndb-event-fact=""
          valueProps={{ className: 'ndb:truncate ndb:font-semibold' }}
        >
          {eventOrigin(event)}
        </InspectorFact>
        <InspectorFact
          label="Sequence"
          data-ndb-event-fact=""
          valueProps={{ className: 'ndb:truncate ndb:font-semibold ndb:tabular-nums' }}
        >
          {eventSequence(event)}
        </InspectorFact>
        <InspectorFact
          label="Dispatches"
          data-ndb-event-fact=""
          valueProps={{ className: 'ndb:truncate ndb:font-semibold ndb:tabular-nums' }}
        >
          {event.occurrence_count}
        </InspectorFact>
        <InspectorFact
          label="First seen"
          data-ndb-event-fact=""
          valueProps={{ className: 'ndb:truncate ndb:font-semibold ndb:tabular-nums' }}
        >
          {formatDuration(event.first_at_ms)}
        </InspectorFact>
      </InspectorFacts>

      <section data-ndb-event-listeners="" className="ndb:mt-4 ndb:sm:mt-6">
        <div className="ndb:flex ndb:items-baseline ndb:justify-between ndb:gap-3">
          <h4 className="ndb:text-xs ndb:font-bold">Listener handling</h4>
          <span
            data-ndb-event-listener-outcome=""
            className="ndb:bg-transparent ndb:text-xs ndb:font-semibold ndb:text-zinc-500 ndb:dark:text-zinc-400"
          >
            {event.listener_outcome_label}
          </span>
        </div>
        <p className="ndb:mt-1 ndb:text-xs ndb:leading-5 ndb:text-zinc-600 ndb:dark:text-zinc-300">
          {event.listener_summary}
        </p>
        <p
          hidden={!(duplicates > 0)}
          className="ndb:mt-1 ndb:text-xs ndb:font-bold ndb:text-amber-600 ndb:dark:text-amber-300"
        >
          {countPhrase(duplicates, ' extra registration needs review.', ' extra registrations need review.')}
        </p>

        <div
          hidden={listeners.length === 0}
          className="ndb:mt-3 ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800"
        >
          {listeners.map((listener, index) => (
            <div
              key={`${listener.name}:${listener.source?.file ?? ''}:${listener.source?.line ?? ''}:${index}`}
              data-ndb-event-listener-row=""
              className="ndb:grid ndb:grid-cols-[minmax(0,1fr)_auto] ndb:gap-x-3 ndb:gap-y-1.5 ndb:bg-transparent ndb:px-0 ndb:py-3 ndb:first:pt-0"
            >
              <code className="ndb:col-start-1 ndb:row-start-1 ndb:min-w-0 ndb:break-all ndb:bg-transparent ndb:font-mono ndb:text-xs ndb:font-semibold">
                {listener.name}
              </code>
              <span className="ndb:col-start-2 ndb:row-start-1 ndb:justify-self-end ndb:text-xs ndb:font-semibold ndb:text-zinc-500 ndb:dark:text-zinc-400">
                {listener.queued ? 'Queued' : 'Completed'}
              </span>
              <span
                hidden={!listener.source}
                className="ndb:col-start-1 ndb:row-start-2 ndb:min-w-0 ndb:truncate ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400"
              >
                {sourceLabel(listener.source)}
              </span>
              <span
                className={cx(
                  'ndb:col-start-2 ndb:row-start-2 ndb:justify-self-end ndb:text-xs ndb:font-semibold ndb:tabular-nums',
                  listener.registrations > 1
                    ? 'ndb:text-amber-600 ndb:dark:text-amber-300'
                    : 'ndb:text-zinc-400',
                )}
              >
                {countPhrase(listener.registrations, ' registration', ' registrations')}
              </span>
            </div>
          ))}
        </div>
      </section>

      <InspectorAction
        icon="external-link"
        data-ndb-event-related-inspector=""
        hidden={!related}
        onClick={() => related && shell.navigateToInspector(related.key)}
        className="ndb:mt-4 ndb:sm:mt-6"
      >
        <span>{related ? `Open ${related.label}` : ''}</span>
      </InspectorAction>

      <details
        data-ndb-event-outcome-help=""
        hidden={listeners.length === 0}
        className="ndb:group ndb:mt-3 ndb:border-0 ndb:bg-transparent ndb:p-0 ndb:sm:mt-4"
      >
        <summary className="ndb:flex ndb:cursor-pointer ndb:list-none ndb:items-center ndb:gap-1.5 ndb:bg-transparent ndb:p-0 ndb:text-xs ndb:font-semibold ndb:text-zinc-500 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-zinc-400">
          How listener outcomes are recorded
          <Icon name="chevron-down" size={3} className="ndb:transition ndb:group-open:rotate-180" />
        </summary>
        <p className="ndb:mt-2 ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400">
          Completed means Laravel reached this observer after synchronous listener dispatch. Queued means
          Laravel handed the listener to the queue. Laravel does not expose per-listener duration to this
          observer.
        </p>
      </details>
    </div>
  );
}

function PayloadPanel({ event }) {
  const shape = array(event.payload_shape);

  return (
    <div data-ndb-event-detail-panel="payload" className="ndb:p-3 ndb:sm:p-4">
      <h4 className="ndb:text-xs ndb:font-bold">Payload shape</h4>

      {shape.length === 0 ? (
        <p className="ndb:mt-2 ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400">
          No payload arguments were exposed.
        </p>
      ) : null}

      <dl
        hidden={shape.length === 0}
        className="ndb:mt-2 ndb:divide-y ndb:divide-zinc-200/90 ndb:bg-transparent ndb:dark:divide-zinc-800"
      >
        {shape.map((entry) => {
          const fields = array(entry.fields);
          const omitted = Number(entry.field_count ?? 0) - fields.length;

          return (
            <InspectorDefinitionRow
              key={entry.position}
              term={<span>{`Argument ${entry.position}`}</span>}
              valueProps={{ className: 'ndb:min-w-0 ndb:bg-transparent' }}
            >
              <code className="ndb:block ndb:break-all ndb:bg-transparent ndb:font-mono ndb:text-xs ndb:font-semibold">
                {entry.type}
              </code>
              <div
                hidden={fields.length === 0}
                className="ndb:mt-2 ndb:grid ndb:gap-1 ndb:sm:grid-cols-[4rem_minmax(0,1fr)]"
              >
                <span className="ndb:text-xs ndb:font-semibold ndb:text-zinc-400">Fields</span>
                <code className="ndb:break-all ndb:bg-transparent ndb:font-mono ndb:text-xs ndb:text-zinc-600 ndb:dark:text-zinc-300">
                  {fields.join(', ')}
                </code>
              </div>
              <p hidden={!(omitted > 0)} className="ndb:mt-1 ndb:text-xs ndb:font-semibold ndb:text-zinc-400">
                {countPhrase(omitted, ' more field is not shown.', ' more fields are not shown.')}
              </p>
            </InspectorDefinitionRow>
          );
        })}
      </dl>

      <p className="ndb:mt-3 ndb:text-xs ndb:leading-5 ndb:text-zinc-400">
        Field names and types are shown. Payload values are not captured.
      </p>
    </div>
  );
}

function SourcePanel({ event }) {
  const sources = array(event.dispatch_sources);
  const occurrences = array(event.occurrences);
  const sourceCount = Number(event.dispatch_source_count ?? 0);
  const omittedSources = Number(event.dispatch_source_omitted_count ?? 0);
  const omittedOccurrences = Number(event.occurrence_omitted_count ?? 0);

  return (
    <div data-ndb-event-detail-panel="source" className="ndb:p-3 ndb:sm:p-4">
      <section data-ndb-event-dispatch-sources="">
        <div className="ndb:flex ndb:items-baseline ndb:justify-between ndb:gap-3">
          <h4 className="ndb:text-xs ndb:font-bold">Dispatch locations</h4>
          <span className="ndb:text-xs ndb:font-semibold ndb:text-zinc-400">
            {sourceCount === 1 ? '1 application location' : `${sourceCount} application locations`}
          </span>
        </div>

        {sources.length === 0 ? (
          <p className="ndb:mt-2 ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400">
            No application dispatch location was captured. Framework-only stack frames stay hidden.
          </p>
        ) : null}

        <div
          hidden={sources.length === 0}
          className="ndb:mt-2 ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800"
        >
          {sources.map((source, index) => {
            const location = sourceLabel(source);

            return (
              <div
                key={`${location}:${index}`}
                className="ndb:grid ndb:min-w-0 ndb:grid-cols-[minmax(0,1fr)_auto] ndb:items-center ndb:gap-3 ndb:py-2.5"
              >
                <InspectorSourceLink
                  data-ndb-event-copy-dispatch-source=""
                  data-ndb-event-copy-dispatch-source-index={index}
                  copy={location}
                  aria-label={`Copy dispatch source ${location}`}
                  valueProps={{}}
                >
                  {location}
                </InspectorSourceLink>
                <span className="ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-400">
                  {countPhrase(source.count, ' dispatch', ' dispatches')}
                </span>
              </div>
            );
          })}
        </div>

        <p
          data-ndb-event-dispatch-sources-omitted=""
          hidden={!(omittedSources > 0)}
          className="ndb:mt-2 ndb:text-xs ndb:font-semibold ndb:text-zinc-400"
        >
          {countPhrase(
            omittedSources,
            ' lower-frequency location is not shown.',
            ' lower-frequency locations are not shown.',
          )}
        </p>
      </section>

      <details
        data-ndb-event-timeline=""
        hidden={!(Number(event.occurrence_count ?? 0) > 1)}
        className="ndb:group ndb:mt-4 ndb:border-0 ndb:bg-transparent ndb:p-0 ndb:sm:mt-6"
      >
        <summary className="ndb:flex ndb:cursor-pointer ndb:list-none ndb:items-center ndb:justify-between ndb:gap-3 ndb:bg-transparent ndb:p-0 ndb:text-xs ndb:font-bold ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500">
          <span>Dispatch timeline</span>
          <span className="ndb:flex ndb:items-center ndb:gap-1.5 ndb:text-xs ndb:font-semibold ndb:text-zinc-400">
            <span>{countPhrase(occurrences.length, ' dispatch shown', ' dispatches shown')}</span>
            <Icon name="chevron-down" size={3} className="ndb:transition ndb:group-open:rotate-180" />
          </span>
        </summary>

        <div className="ndb:mt-3 ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800">
          {occurrences.map((occurrence) => (
            <div
              key={occurrence.sequence}
              className="ndb:grid ndb:grid-cols-[auto_minmax(0,1fr)_auto] ndb:items-center ndb:gap-3 ndb:bg-transparent ndb:py-2.5"
            >
              <span className="ndb:text-xs ndb:font-bold ndb:tabular-nums">{`#${occurrence.sequence}`}</span>
              <span
                hidden={!occurrence.callsite}
                className="ndb:min-w-0 ndb:truncate ndb:text-xs ndb:text-zinc-400"
              >
                {sourceLabel(occurrence.callsite)}
              </span>
              <span className="ndb:flex ndb:flex-wrap ndb:items-center ndb:justify-end ndb:gap-2">
                <span
                  hidden={occurrence.lifecycle !== 'after_response'}
                  className="ndb:text-xs ndb:font-semibold ndb:text-zinc-500 ndb:dark:text-zinc-400"
                >
                  After response
                </span>
                <span className="ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400">
                  {formatDuration(occurrence.at_ms)}
                </span>
              </span>
            </div>
          ))}
        </div>

        <p
          data-ndb-event-occurrences-omitted=""
          hidden={!(omittedOccurrences > 0)}
          className="ndb:mt-2 ndb:text-xs ndb:font-semibold ndb:text-zinc-400"
        >
          {countPhrase(
            omittedOccurrences,
            ' middle dispatch is not shown.',
            ' middle dispatches are not shown.',
          )}
        </p>
      </details>
    </div>
  );
}

/** Explains the selected Laravel event through listener, payload, and source evidence (event-detail.blade.php). */
export function EventDetail({ event, detailOpen, detailRef, tab, onTab, onClose }) {
  return (
    <InspectorDetailPane
      detailOpen={detailOpen}
      detailRef={detailRef}
      detailLabel="Selected Laravel event details"
      backLabel="Events"
      onClose={onClose}
      data-ndb-event-detail=""
      back={<InspectorDetailBack data-ndb-event-detail-back="" onClick={onClose} label="Events" />}
    >
      {event === null ? (
        <InspectorDetailEmpty label="No event is selected. Adjust the source filter or search." />
      ) : (
        <div key={event.id} className="ndb:flex ndb:flex-col">
          <InspectorDetailHeader
            data-ndb-event-header=""
            title={
              <div className="ndb:min-w-0">
                <h3
                  data-ndb-event-detail-title=""
                  className="ndb:break-words ndb:text-base ndb:font-bold ndb:leading-6"
                >
                  {event.display_name}
                </h3>
                <code
                  data-ndb-event-qualified-name=""
                  hidden={event.name === event.display_name}
                  title={event.name}
                  className="ndb:mt-1 ndb:block ndb:break-all ndb:bg-transparent ndb:font-mono ndb:text-xs ndb:font-medium ndb:leading-4 ndb:text-zinc-400"
                >
                  {event.name}
                </code>
              </div>
            }
          />

          <InspectorDetailTabs label="Laravel event detail">
            {TABS.map(([key, label, icon]) => (
              <FilterTab
                key={key}
                variant="segmented"
                data-ndb-event-detail-tab={key}
                onClick={() => onTab(key)}
                aria-pressed={tab === key}
                aria-label={label}
                className="ndb:h-auto"
              >
                <Icon name={icon} size={3.5} data-ndb-event-detail-tab-icon={key} className="ndb:sm:hidden" />
                <span className="ndb:hidden ndb:sm:inline">{label}</span>
              </FilterTab>
            ))}
          </InspectorDetailTabs>

          {tab === 'overview' ? <OverviewPanel event={event} /> : null}
          {tab === 'payload' ? <PayloadPanel event={event} /> : null}
          {tab === 'source' ? <SourcePanel event={event} /> : null}
        </div>
      )}
    </InspectorDetailPane>
  );
}
