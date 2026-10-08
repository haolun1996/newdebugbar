import { cx } from '../../../app/hooks.js';
import { cacheOperationDetails, cacheResultWarns } from '../../../inspectors/cache.js';
import { InspectorDefinitionList } from '../../components/InspectorDefinitionList.jsx';
import { InspectorDefinitionRow } from '../../components/InspectorDefinitionRow.jsx';
import { InspectorDetailBack } from '../../components/InspectorDetailBack.jsx';
import { InspectorDetailEmpty } from '../../components/InspectorDetailEmpty.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorDetailPane } from '../../components/InspectorDetailPane.jsx';
import { InspectorEvidence } from '../../components/InspectorEvidence.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorOperationBadge } from '../../components/InspectorOperationBadge.jsx';
import { InspectorSourceFact } from '../../components/InspectorSourceFact.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { InspectorSourcePanel } from '../../components/InspectorSourcePanel.jsx';

/** Operation badge and key (cache-header.blade.php). */
function CacheHeader({ operation }) {
  return (
    <InspectorDetailHeader
      data-ndb-cache-header=""
      title={
        <h3 className="ndb:flex ndb:min-w-0 ndb:flex-nowrap ndb:items-center ndb:gap-2 ndb:overflow-hidden">
          <InspectorOperationBadge outlined wide data-ndb-cache-detail-operation="">
            {operation.operation_label}
          </InspectorOperationBadge>
          <span
            data-ndb-cache-detail-key=""
            title={operation.key_label}
            className="ndb:min-w-0 ndb:truncate ndb:text-xs ndb:font-bold ndb:leading-5 ndb:text-zinc-700 ndb:dark:text-zinc-200"
          >
            {operation.key_label}
          </span>
        </h3>
      }
    />
  );
}

/** Result, runtime, store, and driver (cache-overview-facts.blade.php). */
function CacheOverviewFacts({ operation }) {
  return (
    <InspectorFacts columns={4} bordered={false} data-ndb-cache-metadata="">
      <InspectorFact
        label="Result"
        valueProps={{
          className: cx('ndb:truncate', {
            'ndb:text-red-700 ndb:dark:text-red-300': Boolean(operation.failed),
            'ndb:text-amber-700 ndb:dark:text-amber-300': cacheResultWarns(operation),
          }),
        }}
      >
        {operation.result_label}
      </InspectorFact>
      <InspectorFact label="Runtime" valueProps={{ className: 'ndb:truncate ndb:tabular-nums' }}>
        {operation.duration_label}
      </InspectorFact>
      <InspectorFact label="Store" valueProps={{ title: operation.store_label, className: 'ndb:truncate' }}>
        {operation.store_label}
      </InspectorFact>
      <InspectorFact
        label="Driver"
        hidden={!operation.driver_label}
        valueProps={{ title: operation.driver_label, className: 'ndb:truncate' }}
      >
        {operation.driver_label}
      </InspectorFact>
    </InspectorFacts>
  );
}

/** Facts, value, supporting details, and source (cache-overview-panel.blade.php). */
function CacheOverviewPanel({ operation }) {
  const details = cacheOperationDetails(operation);

  return (
    <div data-ndb-cache-detail-content="" className="ndb:flex ndb:flex-col">
      <div className="ndb:p-3 ndb:sm:p-4">
        <CacheOverviewFacts operation={operation} />

        {operation.has_value ? (
          <InspectorEvidence
            label="Value"
            data-ndb-cache-value=""
            className="ndb:mt-4"
            value={operation.value_display}
          />
        ) : null}

        <InspectorDefinitionList
          hidden={!details.any}
          className="ndb:mt-3 ndb:border-t ndb:border-zinc-200/90 ndb:pt-3 ndb:sm:mt-4 ndb:sm:pt-4 ndb:dark:border-zinc-800"
        >
          <InspectorDefinitionRow label="Lifetime" hidden={!details.write}>
            {operation.lifetime_label}
          </InspectorDefinitionRow>
          <InspectorDefinitionRow label="Timing context" hidden={!details.batch}>
            {`Shared across a batch of ${operation.batch_size} operations.`}
          </InspectorDefinitionRow>
          <InspectorDefinitionRow label="Failure" tone="danger" hidden={!details.failure}>
            {operation.exception_message}
          </InspectorDefinitionRow>
        </InspectorDefinitionList>
      </div>

      {details.source ? (
        <InspectorSourcePanel
          frames={operation.stack ?? []}
          resetKey={operation.execution}
          data-ndb-cache-source=""
          className="ndb:border-t ndb:border-zinc-200/90 ndb:dark:border-zinc-800"
        >
          <InspectorSourceFact label="Source" hidden={!details.callsite} valueProps={{}}>
            {details.callsite ? (
              <InspectorSourceLink
                aria-label={`Copy source ${operation.source_label}`}
                copy={operation.source_label}
                valueProps={{ title: operation.source_label }}
              >
                {operation.source_label}
              </InspectorSourceLink>
            ) : null}
          </InspectorSourceFact>
        </InspectorSourcePanel>
      ) : null}
    </div>
  );
}

/** The selected operation's evidence (cache-detail.blade.php). */
export function CacheDetail({ operation, detailOpen, detailRef, onClose }) {
  return (
    <InspectorDetailPane
      detailOpen={detailOpen}
      detailRef={detailRef}
      detailLabel="Selected cache operation details"
      backLabel="Operations"
      onClose={onClose}
      data-ndb-cache-detail=""
      back={<InspectorDetailBack data-ndb-cache-detail-back="" onClick={onClose} label="Operations" />}
    >
      {operation ? (
        <div className="ndb:flex ndb:flex-col">
          <CacheHeader operation={operation} />
          <CacheOverviewPanel operation={operation} />
        </div>
      ) : null}

      <InspectorDetailEmpty
        label="Choose an operation to inspect its evidence."
        hidden={Boolean(operation)}
      />
    </InspectorDetailPane>
  );
}
