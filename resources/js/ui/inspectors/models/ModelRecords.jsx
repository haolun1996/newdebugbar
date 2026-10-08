import { cx } from '../../../app/hooks.js';
import {
  formatActivity,
  formatNumber,
  isNumericKey,
  sourceCopy,
  sourceShortLabel,
  sourceTitle,
} from '../../../inspectors/models.js';
import { InspectorDisclosure } from '../../components/InspectorDisclosure.jsx';
import { InspectorExplanation } from '../../components/InspectorExplanation.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';

const array = (value) => (Array.isArray(value) ? value : Object.values(value ?? {}));

function RecordSources({ record, sources }) {
  const hidden = Number(record.hidden_source_count ?? 0);
  const unknown = Number(record.unknown_source_count ?? 0);

  return (
    <InspectorDisclosure
      label="Record sources"
      data-ndb-model-record-sources=""
      className="ndb:sm:col-span-3"
      count={sources.length}
    >
      <ul className="ndb:list-none ndb:space-y-3 ndb:p-0">
        {sources.map((source, index) => {
          const callsite = source.callsite ?? null;
          const copy = sourceCopy(callsite);

          return (
            <li
              key={index}
              className="ndb:flex ndb:min-w-0 ndb:flex-wrap ndb:items-baseline ndb:justify-between ndb:gap-2"
            >
              {copy !== null ? (
                <InspectorSourceLink
                  copy={copy}
                  title={sourceTitle(callsite)}
                  className="ndb:min-w-0 ndb:break-all"
                >
                  {copy}
                </InspectorSourceLink>
              ) : (
                <span className="ndb:text-sm ndb:text-zinc-500 ndb:dark:text-zinc-400">
                  Source unavailable
                </span>
              )}
              <span className="ndb:shrink-0 ndb:text-xs ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400">
                {formatActivity(Number(source.retrieval_count ?? 0), Number(source.change_count ?? 0))}
              </span>
            </li>
          );
        })}
      </ul>
      {hidden > 0 ? (
        <p className="ndb:mt-3 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
          Showing {sources.length} of {formatNumber(record.source_count ?? sources.length)} retained sources.
        </p>
      ) : null}
      {unknown > 0 ? (
        <p className="ndb:mt-3 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
          {formatNumber(unknown)} retrievals had no application source.
        </p>
      ) : null}
    </InspectorDisclosure>
  );
}

function ModelRecord({ record }) {
  const sources = array(record.sources);
  const callsite = sources[0]?.callsite ?? null;
  const copy = sourceCopy(callsite);
  const loads = Number(record.loads ?? 0);
  const key = record.key ?? null;

  return (
    <article
      data-ndb-model-record=""
      data-ndb-model-record-retrievals={loads}
      className="ndb:grid ndb:min-w-0 ndb:gap-2 ndb:border-l-0 ndb:bg-transparent ndb:px-0 ndb:py-2.5 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white ndb:sm:grid-cols-[5rem_4.5rem_minmax(0,1fr)] ndb:sm:items-center ndb:sm:gap-3"
    >
      <p
        className={cx('ndb:min-w-0 ndb:break-all ndb:text-sm ndb:font-semibold', {
          'ndb:font-mono ndb:tabular-nums': isNumericKey(key),
        })}
      >
        {key === null ? '' : String(key)}
      </p>
      <span
        className={cx('ndb:text-sm ndb:font-semibold ndb:tabular-nums ndb:sm:text-right', {
          'ndb:text-amber-700 ndb:dark:text-amber-300': loads > 1,
          'ndb:text-zinc-600 ndb:dark:text-zinc-300': loads === 1,
        })}
      >
        <span className="ndb:text-zinc-400 ndb:sm:hidden">Retrieved </span>
        {formatNumber(loads)}
      </span>
      {copy !== null ? (
        <InspectorSourceLink
          copy={copy}
          title={sourceTitle(callsite)}
          className="ndb:justify-self-start ndb:text-zinc-500 ndb:dark:text-zinc-400"
        >
          <span className="ndb:sm:hidden">Source </span>
          {sourceShortLabel(callsite)}
        </InspectorSourceLink>
      ) : (
        <span className="ndb:text-xs ndb:text-zinc-400">—</span>
      )}

      {sources.length > 1 ||
      Number(record.hidden_source_count ?? 0) > 0 ||
      Number(record.unknown_source_count ?? 0) > 0 ? (
        <RecordSources record={record} sources={sources} />
      ) : null}
    </article>
  );
}

/** Identified records and their retrievals (livewire/models/records.blade.php). */
export function ModelRecords({ group }) {
  const records = array(group.records);
  const recordCount = Number(group.record_count ?? 0);
  const unidentified = Number(group.unidentified_load_count ?? 0);

  return (
    <section
      data-ndb-model-records=""
      className="ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white"
    >
      <InspectorExplanation
        title="How this model was loaded"
        description="Retrieved counts each load of a record. If it exceeds 1, check whether the repeated loads are expected."
      />

      <div className="ndb:mt-3 ndb:border-y ndb:border-zinc-200/90 ndb:dark:border-zinc-800">
        <div className="ndb:hidden ndb:grid-cols-[5rem_4.5rem_minmax(0,1fr)] ndb:gap-3 ndb:border-b ndb:border-zinc-200/90 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:dark:border-zinc-800 ndb:sm:grid">
          <span>Identifier</span>
          <span className="ndb:text-right">Retrieved</span>
          <span>Source</span>
        </div>

        <div className="ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800">
          {records.map((record, index) => (
            <ModelRecord key={index} record={record} />
          ))}

          {unidentified > 0 ? (
            <article
              data-ndb-model-missing-identifiers=""
              className="ndb:grid ndb:min-w-0 ndb:gap-2 ndb:border-l-0 ndb:bg-transparent ndb:px-0 ndb:py-2.5 ndb:sm:grid-cols-[5rem_4.5rem_minmax(0,1fr)] ndb:sm:items-center ndb:sm:gap-3"
            >
              <p className="ndb:text-xs ndb:font-semibold">—</p>
              <span className="ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-600 ndb:dark:text-zinc-300 ndb:sm:text-right">
                <span className="ndb:text-zinc-400 ndb:sm:hidden">Retrieved </span>
                {formatNumber(unidentified)}
              </span>
              <span className="ndb:text-xs ndb:text-zinc-400">—</span>
            </article>
          ) : null}
        </div>
      </div>

      {Number(group.hidden_record_count ?? 0) > 0 ? (
        <p
          data-ndb-model-record-limit=""
          className="ndb:mt-2 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400"
        >
          Showing {formatNumber(records.length)} of {formatNumber(recordCount)} identified records.
        </p>
      ) : null}

      {unidentified > 0 ? (
        <p
          data-ndb-model-unidentified=""
          className="ndb:mt-2 ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400"
        >
          A dash means the model identifier was unavailable. These retrievals are excluded from the reload
          count.
        </p>
      ) : null}
    </section>
  );
}
