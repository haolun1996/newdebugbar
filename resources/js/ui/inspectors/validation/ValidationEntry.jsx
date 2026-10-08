import { InspectorExplanation } from '../../components/InspectorExplanation.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { plural } from '../count-label.js';

const SESSION_EXPLANATION =
  "These messages came from Laravel's session, usually after a redirect. Failed rules and source code are not available on this request.";

/** PHP's (array) cast: null is empty, a map keeps its values, a scalar becomes one entry. */
const asList = (value) => {
  if (value === null || value === undefined) return [];
  if (typeof value === 'object') return Object.values(value);

  return [value];
};

/** HTTP response label: redirects say so, any other status is a plain response. */
export function responseLabel(status) {
  if (status === null || status === undefined) return null;

  const code = Number.parseInt(status, 10);

  return code >= 300 && code < 400 ? `Redirect ${code}` : `Response ${code}`;
}

function MobileLabel({ children }) {
  return (
    <span
      data-ndb-validation-mobile-label=""
      className="ndb:mb-1 ndb:block ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:sm:hidden"
    >
      {children}
    </span>
  );
}

/** One validation attempt: its outcome, call site, and a field/message/rule table. */
export function ValidationEntry({ item, index }) {
  const fields = Object.values(item.fields ?? {});
  const failureLabel = `${fields.length} ${plural('field', fields.length)} failed validation`;
  const fromPreviousRequest = Boolean(item.from_previous_request);
  const callsite = item.callsite !== null && typeof item.callsite === 'object' ? item.callsite : null;
  const response = responseLabel(item.response_status);

  return (
    <article data-ndb-validation-item={index} className="ndb:min-w-0">
      <header className="ndb:flex ndb:flex-col ndb:items-start ndb:gap-2 ndb:p-3 ndb:sm:flex-row ndb:sm:gap-3 ndb:sm:p-4">
        <div className="ndb:min-w-0 ndb:flex-1">
          <h3 className="ndb:text-sm ndb:font-bold">{failureLabel}</h3>
          <p className="ndb:mt-0.5 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
            {fromPreviousRequest
              ? 'Carried from the previous request.'
              : (item.exception_message ?? 'Laravel rejected the submitted data.')}
          </p>
        </div>
        <div className="ndb:flex ndb:w-full ndb:max-w-full ndb:flex-wrap ndb:gap-x-3 ndb:gap-y-1 ndb:text-xs ndb:font-semibold ndb:text-zinc-500 ndb:sm:w-auto ndb:dark:text-zinc-400">
          {fromPreviousRequest ? (
            <span className="ndb:text-amber-700 ndb:dark:text-amber-300">Previous request</span>
          ) : null}
          <span>{item.error_bag} bag</span>
          {item.exception_status !== null && item.exception_status !== undefined ? (
            <span className="ndb:tabular-nums">Validation {item.exception_status}</span>
          ) : null}
          {response !== null ? <span className="ndb:tabular-nums">{response}</span> : null}
        </div>
      </header>

      {callsite !== null ? (
        <div className="ndb:border-t ndb:border-zinc-200/90 ndb:px-3 ndb:py-2.5 ndb:sm:px-4 ndb:dark:border-zinc-800">
          <InspectorSourceLink
            data-ndb-validation-callsite={index}
            copy={`${callsite.file}:${callsite.line}`}
            aria-label="Copy validation source"
          >
            {callsite.file}:{callsite.line}
          </InspectorSourceLink>
        </div>
      ) : null}

      <div
        role="table"
        aria-label={failureLabel}
        data-ndb-validation-table=""
        className="ndb:border-t ndb:border-zinc-200/90 ndb:dark:border-zinc-800"
      >
        <div
          role="row"
          data-ndb-validation-table-header=""
          className="ndb:hidden ndb:grid-cols-[minmax(8rem,0.8fr)_minmax(14rem,2fr)_minmax(9rem,1fr)] ndb:gap-4 ndb:border-b ndb:border-zinc-200/90 ndb:bg-zinc-50/75 ndb:px-4 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:dark:border-zinc-800 ndb:dark:bg-zinc-900/55 ndb:sm:grid"
        >
          <span role="columnheader" data-ndb-validation-column="field">
            Field
          </span>
          <span role="columnheader" data-ndb-validation-column="message">
            Message
          </span>
          <span role="columnheader" data-ndb-validation-column="rules">
            Failed rules
          </span>
        </div>

        <div role="rowgroup" className="ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800">
          {fields.map((field) => {
            const rules = asList(item.rules?.[field]);
            const messages = asList(item.messages?.[field]);

            return (
              <div
                key={field}
                role="row"
                data-ndb-validation-field-row={field}
                className="ndb:grid ndb:min-w-0 ndb:gap-2 ndb:px-3 ndb:py-3 ndb:sm:grid-cols-[minmax(8rem,0.8fr)_minmax(14rem,2fr)_minmax(9rem,1fr)] ndb:sm:gap-4 ndb:sm:px-4"
              >
                <div role="cell" data-ndb-validation-field={field} className="ndb:min-w-0">
                  <MobileLabel>Field</MobileLabel>
                  <code className="ndb:block ndb:break-words ndb:text-xs ndb:font-bold">{field}</code>
                </div>

                <div role="cell" data-ndb-validation-messages={field} className="ndb:min-w-0">
                  <MobileLabel>Message</MobileLabel>
                  <ul className="ndb:m-0 ndb:list-none ndb:space-y-1 ndb:p-0">
                    {messages.length > 0 ? (
                      messages.map((message, messageIndex) => (
                        <li
                          key={messageIndex}
                          data-ndb-validation-message={field}
                          className="ndb:text-xs ndb:font-medium ndb:leading-5"
                        >
                          {message}
                        </li>
                      ))
                    ) : (
                      <li className="ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
                        No validation message was returned.
                      </li>
                    )}
                  </ul>
                </div>

                <div role="cell" data-ndb-validation-rules={field} className="ndb:min-w-0">
                  <MobileLabel>Failed rules</MobileLabel>
                  {rules.length > 0 ? (
                    <div className="ndb:flex ndb:flex-wrap ndb:gap-1">
                      {rules.map((rule, ruleIndex) => (
                        <code
                          key={ruleIndex}
                          className="ndb:rounded-md ndb:bg-zinc-100 ndb:px-1.5 ndb:py-0.5 ndb:font-mono ndb:text-xs ndb:font-semibold ndb:text-zinc-700 ndb:dark:bg-zinc-900 ndb:dark:text-zinc-300"
                        >
                          {rule}
                        </code>
                      ))}
                    </div>
                  ) : (
                    <span className="ndb:text-xs ndb:text-zinc-400">Not captured</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {fromPreviousRequest ? (
        <InspectorExplanation
          title="Why rules and source may be missing"
          description={SESSION_EXPLANATION}
          className="ndb:border-t ndb:border-zinc-200/90 ndb:px-3 ndb:py-3 ndb:sm:px-4 ndb:dark:border-zinc-800"
        />
      ) : null}
    </article>
  );
}
