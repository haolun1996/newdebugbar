import { cx } from '../../../app/hooks.js';
import { HighlightedCode } from '../../components/CodeBlock.jsx';
import { InspectorAction } from '../../components/InspectorAction.jsx';
import { InspectorDefinitionList } from '../../components/InspectorDefinitionList.jsx';
import { InspectorDefinitionRow } from '../../components/InspectorDefinitionRow.jsx';
import { InspectorDetailBack } from '../../components/InspectorDetailBack.jsx';
import { InspectorDetailEmpty } from '../../components/InspectorDetailEmpty.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorDetailPane } from '../../components/InspectorDetailPane.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorSourceFact } from '../../components/InspectorSourceFact.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { InspectorSourcePanel } from '../../components/InspectorSourcePanel.jsx';

function DecisionEvidence({ decision }) {
  const hasResponse =
    decision.result_message !== null || decision.result_code !== null || decision.result_status !== null;
  const hasHandler = decision.handler_available || Boolean(decision.handler_source_label);

  return (
    <div className="ndb:flex ndb:flex-col">
      <InspectorDetailHeader
        layout="wrap"
        data-ndb-authorization-header=""
        title={
          <h3
            data-ndb-authorization-detail-ability=""
            className="ndb:min-w-0 ndb:break-words ndb:text-base ndb:font-bold ndb:leading-6"
          >
            {decision.ability}
          </h3>
        }
        aside={
          <InspectorAction icon="copy" data-ndb-authorization-copy-evidence="" copy={decision.copy_evidence}>
            Copy evidence
          </InspectorAction>
        }
      />

      <div data-ndb-authorization-detail-panel="combined" className="ndb:p-0">
        <div className="ndb:space-y-3 ndb:p-3 ndb:sm:space-y-5 ndb:sm:p-4">
          <InspectorFacts columns={2} bordered={false} data-ndb-authorization-metadata="">
            <InspectorFact
              label="Result"
              valueProps={{
                'data-ndb-authorization-detail-result': '',
                className: cx(
                  'ndb:text-xs ndb:font-bold',
                  decision.result === 'allowed'
                    ? 'ndb:text-emerald-700 ndb:dark:text-emerald-300'
                    : 'ndb:text-red-700 ndb:dark:text-red-300',
                ),
              }}
            >
              {decision.result_label}
            </InspectorFact>

            <InspectorFact label="User" data-ndb-authorization-user-detail="" className="ndb:p-0">
              <span className="ndb:block ndb:truncate ndb:text-xs ndb:font-semibold">
                {decision.user_label}
              </span>
              <code
                hidden={decision.user_type === null}
                className="ndb:mt-0.5 ndb:block ndb:truncate ndb:font-mono ndb:text-xs ndb:text-zinc-400"
              >
                {decision.user_type}
              </code>
              <span
                hidden={decision.user_identifier === null}
                className="ndb:mt-0.5 ndb:flex ndb:min-w-0 ndb:gap-1.5 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400"
              >
                <span>{decision.user_identifier_name ?? 'Identifier'}</span>
                <span className="ndb:min-w-0 ndb:truncate ndb:font-semibold ndb:tabular-nums">
                  {decision.user_identifier === null ? null : String(decision.user_identifier)}
                </span>
              </span>
            </InspectorFact>
          </InspectorFacts>

          <section data-ndb-authorization-response="" hidden={!hasResponse} className="ndb:p-0">
            <h4 className="ndb:text-xs ndb:font-bold">Authorization response</h4>
            <InspectorDefinitionList className="ndb:mt-2">
              <InspectorDefinitionRow label="Message" hidden={decision.result_message === null}>
                {decision.result_message}
              </InspectorDefinitionRow>
              <InspectorDefinitionRow
                label="Code"
                hidden={decision.result_code === null}
                valueProps={{ className: 'ndb:font-semibold' }}
              >
                {decision.result_code}
              </InspectorDefinitionRow>
              <InspectorDefinitionRow
                label="HTTP status"
                hidden={decision.result_status === null}
                valueProps={{ className: 'ndb:font-semibold ndb:tabular-nums' }}
              >
                {decision.result_status}
              </InspectorDefinitionRow>
            </InspectorDefinitionList>
          </section>

          <section hidden={decision.arguments.length === 0}>
            <h4 className="ndb:text-xs ndb:font-bold">Arguments</h4>
            <InspectorDefinitionList data-ndb-authorization-arguments-detail="" className="ndb:mt-2">
              {decision.arguments.map((argument) => (
                <InspectorDefinitionRow
                  key={argument.position}
                  term={argument.role_label}
                  valueProps={{ className: 'ndb:min-w-0' }}
                >
                  <span className="ndb:block ndb:break-words ndb:text-xs ndb:font-semibold ndb:text-zinc-700 ndb:dark:text-zinc-200">
                    {argument.label}
                  </span>
                  <code className="ndb:mt-0.5 ndb:block ndb:break-words ndb:font-mono ndb:text-xs ndb:text-zinc-400">
                    {argument.type}
                  </code>
                  <span
                    hidden={argument.identity_label === null}
                    className="ndb:mt-0.5 ndb:block ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400"
                  >
                    {argument.identity_label}
                  </span>
                </InspectorDefinitionRow>
              ))}
            </InspectorDefinitionList>
          </section>
        </div>

        <InspectorSourcePanel
          hidden={!(hasHandler || decision.callsite_label || decision.stack.length > 0)}
          title="Authorization logic"
          frames={decision.stack}
          columns={1}
          resetKey={decision.execution}
          emptyLabel="No application stack was captured for this decision."
          className="ndb:border-t ndb:border-zinc-200/90 ndb:dark:border-zinc-800"
        >
          <InspectorSourceFact hidden={!hasHandler} term={decision.handler_label}>
            <HighlightedCode
              language="php"
              hidden={!decision.handler_available}
              source={decision.handler_name}
              className="ndb:block ndb:min-w-0 ndb:break-all ndb:bg-transparent ndb:font-mono ndb:text-xs ndb:font-medium ndb:leading-5 ndb:text-zinc-700 ndb:dark:text-zinc-200"
            />
            {decision.handler_source_label ? (
              <InspectorSourceLink
                className="ndb:mt-1"
                data-ndb-authorization-copy-handler-source=""
                copy={decision.handler_source_label}
                title={decision.handler_source_label}
              >
                {decision.handler_source_label}
              </InspectorSourceLink>
            ) : null}
          </InspectorSourceFact>

          {decision.stack.length === 0 && decision.callsite_label ? (
            <InspectorSourceFact label="Checked from">
              <InspectorSourceLink
                data-ndb-authorization-copy-callsite=""
                copy={decision.callsite_label}
                title={decision.callsite_label}
              >
                {decision.callsite_label}
              </InspectorSourceLink>
            </InspectorSourceFact>
          ) : null}
        </InspectorSourcePanel>

        <p className="ndb:px-3 ndb:pb-3 ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:sm:px-4 ndb:sm:pb-4 ndb:dark:text-zinc-400">
          Gate before or after hooks can change the final result and are not identified here.
        </p>
      </div>
    </div>
  );
}

/** Presents one authorization decision as a single structured evidence flow (authorization-detail.blade.php). */
export function AuthorizationDetail({ decision, detailOpen, detailRef, onClose }) {
  return (
    <InspectorDetailPane
      detailOpen={detailOpen}
      detailRef={detailRef}
      detailLabel="Selected authorization decision details"
      backLabel="Decisions"
      onClose={onClose}
      data-ndb-authorization-detail=""
      back={<InspectorDetailBack data-ndb-authorization-detail-back="" onClick={onClose} label="Decisions" />}
    >
      {decision !== null ? <DecisionEvidence key={decision.execution} decision={decision} /> : null}

      <InspectorDetailEmpty hidden={decision !== null} label="Choose a decision to inspect its evidence." />
    </InspectorDetailPane>
  );
}
