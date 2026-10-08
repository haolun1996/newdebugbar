import { cx } from '../../../app/hooks.js';
import { redisAfterResponseText, redisKeyEvidence } from '../../../inspectors/redis.js';
import { HighlightedCode } from '../../components/CodeBlock.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { InspectorAction } from '../../components/InspectorAction.jsx';
import { InspectorDefinitionList } from '../../components/InspectorDefinitionList.jsx';
import { InspectorDefinitionRow } from '../../components/InspectorDefinitionRow.jsx';
import { InspectorDetailBack } from '../../components/InspectorDetailBack.jsx';
import { InspectorDetailEmpty } from '../../components/InspectorDetailEmpty.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorDetailPane } from '../../components/InspectorDetailPane.jsx';
import { InspectorExplanation } from '../../components/InspectorExplanation.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorOperationBadge } from '../../components/InspectorOperationBadge.jsx';
import { InspectorSourceFact } from '../../components/InspectorSourceFact.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { InspectorSourcePanel } from '../../components/InspectorSourcePanel.jsx';

/** Retained keys, protected identifiers, and the capture-limit note. */
function RedisKeyEvidence({ command }) {
  const evidence = redisKeyEvidence(command);

  return (
    <section
      data-ndb-redis-key-evidence=""
      aria-labelledby="newdebugbar-redis-keys-heading"
      className="ndb:space-y-3 ndb:border-t ndb:border-zinc-200 ndb:p-3 ndb:sm:space-y-4 ndb:sm:p-4 ndb:dark:border-zinc-800"
    >
      <div className="ndb:flex ndb:min-w-0 ndb:items-center ndb:justify-between ndb:gap-3">
        <h4
          id="newdebugbar-redis-keys-heading"
          className="ndb:text-sm ndb:font-bold ndb:text-zinc-950 ndb:dark:text-white"
        >
          Keys used
        </h4>
        <InspectorAction
          icon="copy"
          data-ndb-redis-copy-keys=""
          hidden={evidence.none}
          copy={evidence.copy}
          className="ndb:shrink-0"
        >
          <span>{evidence.copyLabel}</span>
        </InspectorAction>
      </div>

      <InspectorExplanation
        hidden={!evidence.protectedOnly}
        title="Why are these identifiers protected?"
        description="Full key text was not retained. Use these stable identifiers to match repeated access; use full local capture only when you need the key itself."
      />

      {evidence.keys.length ? (
        <InspectorDefinitionList data-ndb-redis-keys="">
          {evidence.keys.map((key, index) => (
            <InspectorDefinitionRow
              key={`${index}:${key}`}
              term={`Key ${index + 1}`}
              valueProps={{ 'data-ndb-redis-key': '', className: 'ndb:break-all' }}
            >
              {key}
            </InspectorDefinitionRow>
          ))}
        </InspectorDefinitionList>
      ) : null}

      {evidence.protectedOnly ? (
        <InspectorDefinitionList data-ndb-redis-protected-keys="">
          {evidence.hashes.map((hash, index) => (
            <InspectorDefinitionRow
              key={`${index}:${hash}`}
              term={`Identifier ${index + 1}`}
              valueProps={{ 'data-ndb-redis-key-hash': '', className: 'ndb:break-all' }}
            >
              {hash}
            </InspectorDefinitionRow>
          ))}
        </InspectorDefinitionList>
      ) : null}

      <EmptyState label="No key metadata was retained for this command." hidden={!evidence.none} />
      <p
        data-ndb-redis-key-limit=""
        hidden={!(evidence.dropped > 0)}
        className="ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400"
      >
        <span className="ndb:tabular-nums">{command.key_dropped}</span> <span>{evidence.droppedLabel}</span>
      </p>
    </section>
  );
}

/** The selected command's facts, failure, keys, and source. */
export function RedisDetail({ command, detailOpen, detailRef, onClose }) {
  return (
    <InspectorDetailPane
      detailOpen={detailOpen}
      detailRef={detailRef}
      detailLabel="Selected Redis command details"
      backLabel="Redis"
      onClose={onClose}
      id="newdebugbar-redis-detail"
      data-ndb-redis-detail=""
      className="ndb:border-x-0 ndb:bg-transparent"
      back={<InspectorDetailBack data-ndb-redis-back="" onClick={onClose} label="Redis" />}
    >
      {command ? (
        <div className="ndb:flex ndb:flex-col">
          <InspectorDetailHeader
            layout="wrap"
            data-ndb-redis-detail-header=""
            title={
              <div className="ndb:grid ndb:min-w-0 ndb:flex-1 ndb:grid-cols-[4rem_minmax(0,1fr)] ndb:items-center ndb:gap-2">
                <InspectorOperationBadge outlined wide data-ndb-redis-command="">
                  {command.command}
                </InspectorOperationBadge>
                <h3
                  data-ndb-redis-key-label=""
                  title={command.key_label}
                  className="ndb:min-w-0 ndb:truncate ndb:text-xs ndb:font-bold ndb:leading-5 ndb:text-zinc-700 ndb:dark:text-zinc-200"
                >
                  {command.key_label}
                </h3>
              </div>
            }
            aside={
              <span
                data-ndb-redis-detail-status=""
                className={cx(
                  'ndb:inline-flex ndb:rounded-md ndb:px-2 ndb:py-1 ndb:text-xs ndb:font-bold',
                  command.failed
                    ? 'ndb:bg-red-100 ndb:text-red-700 ndb:dark:bg-red-950 ndb:dark:text-red-300'
                    : 'ndb:bg-zinc-100 ndb:text-zinc-600 ndb:dark:bg-zinc-800 ndb:dark:text-zinc-300',
                )}
              >
                {command.status_label}
              </span>
            }
          />

          <div data-ndb-redis-detail-body="" className="ndb:flex ndb:flex-col">
            <div className="ndb:space-y-3 ndb:p-3 ndb:sm:space-y-4 ndb:sm:p-4">
              <InspectorFacts columns={4} bordered={false} data-ndb-redis-facts="">
                <InspectorFact label="Connection">{command.connection}</InspectorFact>
                <InspectorFact label="Duration" valueProps={{ className: 'ndb:tabular-nums' }}>
                  {command.duration_label}
                </InspectorFact>
                <InspectorFact label="Captured at" valueProps={{ className: 'ndb:tabular-nums' }}>
                  {command.at_label}
                </InspectorFact>
                <InspectorFact label="Phase">{command.phase_label}</InspectorFact>
              </InspectorFacts>

              <section
                data-ndb-redis-failure=""
                hidden={!command.failed}
                className="ndb:rounded-lg ndb:border ndb:border-red-200 ndb:bg-red-50/55 ndb:p-3 ndb:dark:border-red-950 ndb:dark:bg-red-950/20"
              >
                <HighlightedCode
                  language="php"
                  source={command.exception_class ?? ''}
                  hidden={!command.exception_class}
                  className="ndb:block ndb:break-all ndb:bg-transparent ndb:font-mono ndb:text-xs ndb:font-semibold ndb:text-red-700 ndb:dark:text-red-300"
                />
                <p
                  hidden={Boolean(command.exception_class)}
                  className="ndb:text-xs ndb:font-semibold ndb:text-red-700 ndb:dark:text-red-300"
                >
                  Exception class was not retained.
                </p>
              </section>

              <p
                data-ndb-redis-after-response=""
                hidden={command.lifecycle !== 'after_response'}
                className="ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400"
              >
                {redisAfterResponseText(command)}
              </p>
            </div>

            <RedisKeyEvidence command={command} />

            {command.callsite ? (
              <InspectorSourcePanel
                frames={[]}
                data-ndb-redis-source=""
                className="ndb:border-t ndb:border-zinc-200/90 ndb:dark:border-zinc-800"
              >
                <InspectorSourceFact label="Source">
                  <InspectorSourceLink
                    title={`Copy ${command.source_label}`}
                    aria-label={`Copy Redis source ${command.source_label}`}
                    copy={command.source_label}
                  >
                    {command.source_label}
                  </InspectorSourceLink>
                </InspectorSourceFact>
              </InspectorSourcePanel>
            ) : null}
          </div>
        </div>
      ) : null}

      <InspectorDetailEmpty
        label="Choose a command to inspect its Redis evidence."
        hidden={Boolean(command)}
      />
    </InspectorDetailPane>
  );
}
