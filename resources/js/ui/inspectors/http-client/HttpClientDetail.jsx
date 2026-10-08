import { cx } from '../../../app/hooks.js';
import {
  formatHttpClientEvidence,
  httpClientBodyTruncated,
  httpClientContentTypes,
  httpClientHeaderCount,
} from '../../../inspectors/http-client.js';
import { FilterTab } from '../../components/FilterTab.jsx';
import { InspectorAction } from '../../components/InspectorAction.jsx';
import { InspectorDefinitionList } from '../../components/InspectorDefinitionList.jsx';
import { InspectorDefinitionRow } from '../../components/InspectorDefinitionRow.jsx';
import { InspectorDetailBack } from '../../components/InspectorDetailBack.jsx';
import { InspectorDetailEmpty } from '../../components/InspectorDetailEmpty.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorDetailPane } from '../../components/InspectorDetailPane.jsx';
import { InspectorDetailTabs } from '../../components/InspectorDetailTabs.jsx';
import { InspectorDisclosure } from '../../components/InspectorDisclosure.jsx';
import { InspectorEvidence } from '../../components/InspectorEvidence.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorOperationBadge } from '../../components/InspectorOperationBadge.jsx';
import { InspectorSourceFact } from '../../components/InspectorSourceFact.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { InspectorSourcePanel } from '../../components/InspectorSourcePanel.jsx';

const TABS = [
  ['response', 'Response'],
  ['request', 'Request'],
];

/** Method, host, path, and Copy URL (http-client-header.blade.php). */
function HttpClientHeader({ request }) {
  return (
    <InspectorDetailHeader
      layout="wrap"
      data-ndb-http-client-header=""
      title={
        <div className="ndb:grid ndb:min-w-0 ndb:flex-1 ndb:grid-cols-[3rem_minmax(0,1fr)] ndb:items-center ndb:gap-x-2 ndb:gap-y-1">
          <InspectorOperationBadge outlined data-ndb-http-client-detail-method="">
            {request.method}
          </InspectorOperationBadge>
          <h3
            data-ndb-http-client-detail-host=""
            title={request.host}
            className="ndb:min-w-0 ndb:break-all ndb:text-sm ndb:font-bold ndb:leading-5"
          >
            {request.host}
          </h3>
          <p
            data-ndb-http-client-detail-path=""
            title={request.url}
            className="ndb:col-span-2 ndb:min-w-0 ndb:break-all ndb:text-xs ndb:leading-5"
          >
            {`${request.path ?? ''}${request.query ? `?${request.query}` : ''}`}
          </p>
        </div>
      }
      aside={
        <InspectorAction
          icon="link"
          data-ndb-http-client-copy-url=""
          copy={request.url ?? ''}
          className="ndb:shrink-0"
        >
          Copy URL
        </InspectorAction>
      }
    />
  );
}

/** Body evidence with its copy action and capture-limit note. */
function HttpClientBody({ side, label, body }) {
  const formatted = formatHttpClientEvidence(body);

  return (
    <div>
      <InspectorEvidence
        label={label}
        data-ndb-http-client-body={side}
        aside={
          <InspectorAction icon="copy" data-ndb-http-client-copy-body={side} copy={formatted}>
            Copy body
          </InspectorAction>
        }
        value={formatted}
      />
      <p
        data-ndb-http-client-capture-limit={side}
        hidden={!httpClientBodyTruncated(body)}
        className="ndb:mt-2 ndb:text-xs ndb:leading-5"
      >
        Some body values were omitted at the capture limits.
      </p>
    </div>
  );
}

/** Collapsed header evidence that resets when the request or tab changes. */
function HttpClientHeaders({ side, label, headers, resetKey }) {
  return (
    <InspectorDisclosure
      label={label}
      resetKey={resetKey}
      data-ndb-http-client-headers={side}
      count={httpClientHeaderCount(headers)}
      countProps={{ hidden: !(headers && typeof headers === 'object') }}
    >
      <InspectorEvidence value={formatHttpClientEvidence(headers)} />
    </InspectorDisclosure>
  );
}

/** Explains a request that never received a response (http-client-no-response.blade.php). */
function HttpClientNoResponse({ request }) {
  return (
    <div className="ndb:mt-3 ndb:sm:mt-5">
      <p className="ndb:text-xs ndb:font-semibold">No HTTP response was received.</p>
      <InspectorDefinitionList
        hidden={!(request.exception_class || request.exception_message)}
        className="ndb:mt-3 ndb:sm:mt-4"
      >
        <InspectorDefinitionRow
          label="Exception"
          hidden={!request.exception_class}
          valueProps={{ className: 'ndb:break-all ndb:font-mono ndb:text-[11px]' }}
        >
          {request.exception_class}
        </InspectorDefinitionRow>
        <InspectorDefinitionRow label="Message" tone="danger" hidden={!request.exception_message}>
          {request.exception_message}
        </InspectorDefinitionRow>
      </InspectorDefinitionList>
    </div>
  );
}

/** Status, timing, content type, size, redirect, and response evidence (http-client-response-panel.blade.php). */
function HttpClientResponsePanel({ request, resetKey }) {
  const response = request.response;

  return (
    <div data-ndb-http-client-detail-panel="response" className="ndb:p-3 ndb:sm:p-4">
      <div data-ndb-http-client-response-facts="" className="ndb:space-y-2">
        <div className="ndb:flex ndb:flex-wrap ndb:items-center ndb:gap-x-4 ndb:gap-y-2">
          <p
            data-ndb-http-client-detail-status=""
            aria-label="Status"
            className={cx(
              'ndb:break-words ndb:text-base ndb:font-bold',
              request.failed && 'ndb:text-red-700 ndb:dark:text-red-300',
            )}
          >
            {request.status_label}
          </p>
          <InspectorFacts bordered={false} layout="inline">
            <InspectorFact
              label="Duration"
              valueProps={{
                'data-ndb-http-client-detail-runtime': '',
                title: request.timing_summary,
                className: cx(
                  'ndb:tabular-nums',
                  request.slow && 'ndb:text-amber-700 ndb:dark:text-amber-300',
                ),
              }}
            >
              {request.duration_label}
            </InspectorFact>
            {httpClientContentTypes(response?.headers).map(([name, value]) => (
              <InspectorFact key={name} label="Content type" valueProps={{ className: 'ndb:break-all' }}>
                {value}
              </InspectorFact>
            ))}
            <InspectorFact
              label="Response size"
              hidden={!(response && request.response_body_size_label !== '—')}
              valueProps={{ className: 'ndb:tabular-nums' }}
            >
              {request.response_body_size_label}
            </InspectorFact>
          </InspectorFacts>
        </div>
        <InspectorFacts bordered={false} layout="inline" hidden={!request.redirect_location}>
          <InspectorFact label="Redirect to" valueProps={{ className: 'ndb:break-all' }}>
            {request.redirect_location}
          </InspectorFact>
        </InspectorFacts>
      </div>

      {request.response_has_headers || request.response_has_body ? (
        <div className="ndb:mt-4 ndb:space-y-4">
          {request.response_has_body ? (
            <HttpClientBody side="response" label="Response body" body={response?.body} />
          ) : null}
          {request.response_has_headers ? (
            <HttpClientHeaders
              side="response"
              label="Response headers"
              headers={response?.headers}
              resetKey={resetKey}
            />
          ) : null}
        </div>
      ) : null}

      {!response ? <HttpClientNoResponse request={request} /> : null}
    </div>
  );
}

/** Request size, safe cURL, and request evidence (http-client-request-panel.blade.php). */
function HttpClientRequestPanel({ request, resetKey }) {
  return (
    <div data-ndb-http-client-detail-panel="request" className="ndb:p-3 ndb:sm:p-4">
      <div className="ndb:flex ndb:flex-wrap ndb:items-center ndb:justify-between ndb:gap-3">
        <InspectorFacts bordered={false} layout="inline" data-ndb-http-client-request-facts="">
          <InspectorFact
            label="Request size"
            hidden={request.request_body_size_label === '—'}
            valueProps={{ className: 'ndb:tabular-nums' }}
          >
            {request.request_body_size_label}
          </InspectorFact>
        </InspectorFacts>

        <InspectorAction icon="code" data-ndb-http-client-copy-curl="" copy={request.curl ?? ''}>
          Copy safe cURL
        </InspectorAction>
      </div>

      {request.request_has_headers || request.request_has_body ? (
        <div className="ndb:mt-4 ndb:space-y-4">
          {request.request_has_body ? (
            <HttpClientBody side="request" label="Request body" body={request.request?.body} />
          ) : null}
          {request.request_has_headers ? (
            <HttpClientHeaders
              side="request"
              label="Request headers"
              headers={request.request?.headers}
              resetKey={resetKey}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The selected request's evidence; only the active tab's panel is mounted (http-client-detail.blade.php). */
export function HttpClientDetail({ request, tab, onTab, detailOpen, detailRef, onClose }) {
  const resetKey = request ? `${request.execution}:${tab}` : null;

  return (
    <InspectorDetailPane
      detailOpen={detailOpen}
      detailRef={detailRef}
      detailLabel="Selected outbound HTTP request details"
      backLabel="Requests"
      onClose={onClose}
      data-ndb-http-client-detail=""
      back={<InspectorDetailBack data-ndb-http-client-detail-back="" onClick={onClose} label="Requests" />}
    >
      {request ? (
        <div className="ndb:flex ndb:flex-col">
          <HttpClientHeader request={request} />
          <InspectorDetailTabs label="Outbound HTTP request detail">
            {TABS.map(([value, label]) => (
              <FilterTab
                key={value}
                variant="segmented"
                data-ndb-http-client-detail-tab={value}
                onClick={() => onTab(value)}
                aria-pressed={tab === value}
              >
                {label}
              </FilterTab>
            ))}
          </InspectorDetailTabs>

          <div>
            {tab === 'response' ? <HttpClientResponsePanel request={request} resetKey={resetKey} /> : null}
            {tab === 'request' ? <HttpClientRequestPanel request={request} resetKey={resetKey} /> : null}

            {request.has_source ? (
              <InspectorSourcePanel
                frames={request.stack ?? []}
                resetKey={resetKey}
                data-ndb-http-client-source-facts=""
              >
                {request.callsite_label ? (
                  <InspectorSourceFact label="Source" data-ndb-http-client-primary-source="" valueProps={{}}>
                    <InspectorSourceLink
                      aria-label={`Copy source ${request.callsite_label}`}
                      copy={request.callsite_label}
                      valueProps={{ 'data-ndb-http-client-detail-source': '', title: request.callsite_label }}
                    >
                      {request.callsite_label}
                    </InspectorSourceLink>
                  </InspectorSourceFact>
                ) : null}
              </InspectorSourcePanel>
            ) : null}
          </div>
        </div>
      ) : null}

      <InspectorDetailEmpty label="Choose a request to inspect its evidence." hidden={Boolean(request)} />
    </InspectorDetailPane>
  );
}
