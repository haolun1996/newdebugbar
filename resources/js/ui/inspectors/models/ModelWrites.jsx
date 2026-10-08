import { cx } from '../../../app/hooks.js';
import { formatDuration } from '../../../duration.js';
import { prettyJson } from '../../../inspectors/logs.js';
import {
  formatModelEvent,
  formatNumber,
  isNumericKey,
  sourceCopy,
  sourceShortLabel,
  sourceTitle,
} from '../../../inspectors/models.js';
import { InspectorDisclosure } from '../../components/InspectorDisclosure.jsx';
import { InspectorEvidence } from '../../components/InspectorEvidence.jsx';
import { InspectorExplanation } from '../../components/InspectorExplanation.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';

const isNumeric = (value) => value !== null && value !== '' && Number.isFinite(Number(value));

function WriteOperation({ operation }) {
  const key = operation.key ?? null;
  const callsite = operation.callsite ?? null;
  const copy = sourceCopy(callsite);
  const changes = operation.changes && typeof operation.changes === 'object' ? operation.changes : null;
  const changeCount = changes === null ? 0 : Object.keys(changes).length;

  return (
    <article
      data-ndb-model-write-operation=""
      className="ndb:grid ndb:min-w-0 ndb:gap-2 ndb:border-l-0 ndb:bg-transparent ndb:px-0 ndb:py-2.5 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white ndb:sm:grid-cols-[6rem_4rem_minmax(0,1fr)] ndb:sm:items-center ndb:sm:gap-3"
    >
      <span className="ndb:text-xs ndb:font-semibold">
        <span className="ndb:text-zinc-400 ndb:sm:hidden">Operation </span>
        {formatModelEvent(String(operation.event ?? 'changed'))}
      </span>
      <span
        className={cx('ndb:min-w-0 ndb:break-all ndb:text-sm ndb:font-semibold', {
          'ndb:font-mono ndb:tabular-nums': isNumericKey(key),
        })}
      >
        <span className="ndb:font-sans ndb:text-zinc-400 ndb:sm:hidden">Record </span>
        {key === null || key === '' ? '—' : String(key)}
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
      <InspectorDisclosure
        label="Changed fields"
        data-ndb-model-write-details=""
        className="ndb:sm:col-span-3"
        count={changeCount}
      >
        <InspectorFacts layout="inline" bordered={false} className="ndb:mb-3">
          <InspectorFact
            label="From request start"
            valueProps={{ 'data-ndb-model-write-time': '', className: 'ndb:tabular-nums' }}
          >
            {isNumeric(operation.at_ms) ? `+${formatDuration(operation.at_ms)}` : 'Not captured'}
          </InspectorFact>
        </InspectorFacts>
        {changeCount > 0 ? (
          <InspectorEvidence language="json" data-ndb-model-changed-fields="" value={prettyJson(changes)} />
        ) : (
          <p className="ndb:text-sm ndb:text-zinc-500 ndb:dark:text-zinc-400">
            No changed field values were retained for this write.
          </p>
        )}
      </InspectorDisclosure>
    </article>
  );
}

/** Completed writes for one model (livewire/models/writes.blade.php). */
export function ModelWrites({ group, operations }) {
  const retrievals = Number(group.load_count ?? 0);
  const changeCount = Number(group.change_count ?? 0);
  const hidden = Number(group.hidden_change_operation_count ?? 0);

  return (
    <section
      data-ndb-model-write-table=""
      className={cx(
        'ndb:border-l-0 ndb:bg-transparent ndb:p-0 ndb:text-xs ndb:text-zinc-950 ndb:dark:text-white',
        {
          'ndb:mt-3 ndb:sm:mt-5': retrievals > 0,
        },
      )}
    >
      <InspectorExplanation
        title="How this model changed"
        description="Each row is one completed write. If a write is unexpected, inspect its changed fields and application source."
      />

      <div className="ndb:mt-3 ndb:border-y ndb:border-zinc-200/90 ndb:dark:border-zinc-800">
        <div className="ndb:hidden ndb:grid-cols-[6rem_4rem_minmax(0,1fr)] ndb:gap-3 ndb:border-b ndb:border-zinc-200/90 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:dark:border-zinc-800 ndb:sm:grid">
          <span>Operation</span>
          <span>Record</span>
          <span>Source</span>
        </div>

        <div className="ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800">
          {operations.map((operation, index) => (
            <WriteOperation key={index} operation={operation} />
          ))}
        </div>
      </div>

      {hidden > 0 ? (
        <p className="ndb:mt-2 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
          Showing {formatNumber(operations.length)} of {formatNumber(changeCount)} writes.
        </p>
      ) : null}
    </section>
  );
}
