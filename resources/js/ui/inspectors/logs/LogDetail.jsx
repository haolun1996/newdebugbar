import { cx, useShell } from '../../../app/hooks.js';
import {
  contextValue,
  logFirstSequence,
  logRecordCount,
  logWallTime,
  prettyJson,
  requestTimeLabel,
  splitContext,
} from '../../../inspectors/logs.js';
import { InspectorAction } from '../../components/InspectorAction.jsx';
import { InspectorDefinitionList } from '../../components/InspectorDefinitionList.jsx';
import { InspectorDefinitionRow } from '../../components/InspectorDefinitionRow.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorDisclosure } from '../../components/InspectorDisclosure.jsx';
import { InspectorEvidence } from '../../components/InspectorEvidence.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorSourceFact } from '../../components/InspectorSourceFact.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { InspectorSourcePanel } from '../../components/InspectorSourcePanel.jsx';
import { levelLabel, severityClasses } from './LogEntry.jsx';

const array = (value) => (Array.isArray(value) ? value : []);
const object = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : null);

function RelatedException({ exception }) {
  const shell = useShell();
  const source =
    exception.file !== undefined &&
    exception.file !== null &&
    exception.line !== undefined &&
    exception.line !== null
      ? `${exception.file}:${exception.line}`
      : null;
  const message = String(exception.message ?? '').trim();

  return (
    <section
      data-ndb-log-detail-group="related-exception"
      data-ndb-log-related-exception=""
      className="ndb:bg-transparent ndb:p-3 ndb:sm:p-4"
      aria-label="Related exception"
    >
      <div className="ndb:flex ndb:flex-wrap ndb:items-center ndb:justify-between ndb:gap-3">
        <h4 className="ndb:text-xs ndb:font-bold ndb:text-red-700 ndb:dark:text-red-300">
          Related exception
        </h4>
        <InspectorAction
          icon="external-link"
          data-ndb-log-review-exception=""
          onClick={() => shell.navigateToInspector('exceptions')}
          className="ndb:bg-transparent"
        >
          Review in Exceptions
        </InspectorAction>
      </div>
      <div className="ndb:mt-3 ndb:min-w-0">
        <code className="ndb:block ndb:break-words ndb:bg-transparent ndb:font-mono ndb:text-xs ndb:font-semibold ndb:text-zinc-900 ndb:dark:text-zinc-100">
          {exception.class ?? '—'}
        </code>
        <p className="ndb:mt-1 ndb:break-words ndb:bg-transparent ndb:text-sm ndb:leading-5 ndb:text-zinc-700 ndb:[overflow-wrap:anywhere] ndb:dark:text-zinc-200">
          <span className="ndb:block ndb:whitespace-pre-wrap">{message === '' ? '—' : message}</span>
        </p>
        {source !== null ? (
          <p className="ndb:mt-1 ndb:break-all ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
            {source}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function LogContext({ fields }) {
  const { compact, expanded } = splitContext(fields);

  return (
    <section
      data-ndb-log-detail-group="context"
      data-ndb-log-context=""
      aria-label="Log context"
      className="ndb:bg-transparent ndb:p-3 ndb:sm:p-4"
    >
      <h4 className="ndb:text-xs ndb:font-bold ndb:text-zinc-800 ndb:dark:text-zinc-100">Context</h4>
      {compact.length > 0 ? (
        <InspectorDefinitionList className="ndb:mt-2">
          {compact.map((field) => (
            <InspectorDefinitionRow key={field.key} label={field.key}>
              <span className="ndb:break-words ndb:[overflow-wrap:anywhere]">
                {contextValue(field.value)}
              </span>
            </InspectorDefinitionRow>
          ))}
        </InspectorDefinitionList>
      ) : null}
      {expanded.map((field) =>
        field.structured ? (
          <InspectorEvidence
            key={field.key}
            label={field.key}
            language="json"
            data-ndb-log-context-payload=""
            className="ndb:mt-3"
            value={prettyJson(field.value)}
          />
        ) : (
          <InspectorDisclosure
            key={field.key}
            label={field.key}
            data-ndb-log-context-value=""
            className="ndb:mt-3"
            summary={
              <span className="ndb:flex ndb:min-w-0 ndb:flex-wrap ndb:items-baseline ndb:gap-x-3 ndb:gap-y-1">
                <span className="ndb:shrink-0">{field.key}</span>
                <span className="ndb:min-w-0 ndb:truncate ndb:text-xs ndb:font-normal ndb:text-zinc-500 ndb:dark:text-zinc-400">
                  {field.preview}
                </span>
              </span>
            }
          >
            <p className="ndb:break-words ndb:text-sm ndb:leading-5 ndb:[overflow-wrap:anywhere]">
              <span data-ndb-log-context-full-value="" className="ndb:whitespace-pre-wrap">
                {contextValue(field.value)}
              </span>
            </p>
          </InspectorDisclosure>
        ),
      )}
    </section>
  );
}

/** Structured evidence for one selected log entry (log-detail.blade.php). */
export function LogDetail({ entry }) {
  const level = String(entry.level ?? 'log');
  const repeatCount = logRecordCount(entry);
  const firstSequence = logFirstSequence(entry);
  const lastSequence = Number(entry.last_sequence ?? firstSequence);
  const firstAt = entry.first_at_ms ?? entry.at_ms ?? null;
  const lastAt = entry.last_at_ms ?? firstAt;
  const contextFields = array(entry.context_fields);
  const message = String(entry.message ?? '');
  const callsite = object(entry.callsite);
  const relatedException = object(entry.related_exception);
  const stack = array(entry.stack);
  const occurrences = array(entry.occurrences);
  const sourceLabel =
    callsite &&
    callsite.file !== undefined &&
    callsite.file !== null &&
    callsite.line !== undefined &&
    callsite.line !== null
      ? `${callsite.file}:${callsite.line}`
      : null;
  const channelLabel = String(entry.channel_label ?? 'No channel');
  const recordLabel = repeatCount === 1 ? `#${firstSequence}` : `#${firstSequence}–#${lastSequence}`;
  const firstLabel = requestTimeLabel(firstAt);
  const requestTimeRange =
    repeatCount > 1 && lastAt !== null && lastAt !== firstAt
      ? `${firstLabel} to ${requestTimeLabel(lastAt)}`
      : firstLabel;
  const wallTime = logWallTime(entry.first_occurred_at);

  return (
    <div className="ndb:flex ndb:flex-col">
      <InspectorDetailHeader
        layout="wrap"
        title={
          <div className="ndb:min-w-0">
            <h3 className="ndb:bg-transparent">
              <span
                data-ndb-log-details-title=""
                className="ndb:block ndb:whitespace-pre-wrap ndb:break-words ndb:bg-transparent ndb:text-base ndb:font-semibold ndb:leading-6 ndb:text-zinc-900 ndb:[overflow-wrap:anywhere] ndb:dark:text-zinc-100"
              >
                {message === '' ? '—' : message}
              </span>
            </h3>
          </div>
        }
        aside={
          <span
            data-ndb-log-detail-severity=""
            className={cx('ndb:text-xs ndb:font-semibold', severityClasses(level))}
          >
            {levelLabel(entry)}
          </span>
        }
      />

      <div
        data-ndb-log-detail-groups=""
        className="ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800"
      >
        <section data-ndb-log-detail-group="summary" className="ndb:p-3 ndb:sm:p-4">
          <InspectorFacts columns={2} layout="inline" bordered={false}>
            <InspectorFact
              label="Channel"
              valueProps={{ className: 'ndb:break-words ndb:font-semibold', title: channelLabel }}
            >
              {channelLabel}
            </InspectorFact>
            <InspectorFact
              label="From request start"
              valueProps={{ className: 'ndb:font-semibold ndb:tabular-nums' }}
            >
              {requestTimeRange}
            </InspectorFact>
          </InspectorFacts>
        </section>

        {relatedException !== null ? <RelatedException exception={relatedException} /> : null}

        {contextFields.length > 0 ? <LogContext fields={contextFields} /> : null}

        <section data-ndb-log-detail-group="capture" className="ndb:p-3 ndb:sm:p-4">
          <InspectorDisclosure
            label={repeatCount > 1 ? 'Timing and occurrences' : 'Capture details'}
            data-ndb-log-capture-details=""
            count={`${repeatCount} ${repeatCount === 1 ? 'record' : 'records'}`}
          >
            <InspectorFacts columns={2} layout="inline" bordered={false}>
              <InspectorFact
                label="Captured at"
                valueProps={{ className: 'ndb:tabular-nums', title: wallTime?.title ?? '' }}
              >
                {wallTime?.label ?? 'Not captured'}
              </InspectorFact>
              <InspectorFact label="Log" valueProps={{ className: 'ndb:tabular-nums' }}>
                {recordLabel}
              </InspectorFact>
            </InspectorFacts>
            {repeatCount > 1 ? (
              <ol
                data-ndb-log-occurrences=""
                aria-label="Repeated log occurrences"
                className="ndb:mt-3 ndb:list-none ndb:divide-y ndb:divide-zinc-200/90 ndb:p-0 ndb:dark:divide-zinc-800"
              >
                {occurrences.map((occurrence) => (
                  <li
                    key={occurrence.sequence}
                    className="ndb:grid ndb:grid-cols-[5rem_minmax(0,1fr)] ndb:gap-3 ndb:py-2 ndb:text-xs"
                  >
                    <span className="ndb:font-semibold ndb:tabular-nums">#{occurrence.sequence}</span>
                    <span className="ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400">
                      {requestTimeLabel(occurrence.at_ms ?? null)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </InspectorDisclosure>
        </section>

        {sourceLabel !== null || stack.length > 0 ? (
          <section
            data-ndb-log-detail-group="source"
            data-ndb-log-source=""
            className="ndb:bg-transparent ndb:p-0"
          >
            <InspectorSourcePanel
              frames={stack}
              columns={1}
              emptyLabel="No application stack was captured for this log entry."
              className="ndb:bg-transparent"
            >
              {sourceLabel !== null ? (
                <InspectorSourceFact label="Source" valueProps={{}}>
                  <InspectorSourceLink copy={sourceLabel} valueProps={{}}>
                    {sourceLabel}
                  </InspectorSourceLink>
                </InspectorSourceFact>
              ) : null}
            </InspectorSourcePanel>
          </section>
        ) : null}
      </div>
    </div>
  );
}
