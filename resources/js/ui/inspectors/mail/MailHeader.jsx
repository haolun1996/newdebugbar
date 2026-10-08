import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { formatMailAddresses, mailDurationFact } from '../../../inspectors/mail.js';
import { MailActions } from './MailActions.jsx';

/** Subject, addresses, and key facts for the selected message. */
export function MailHeader({ message, previewUrl, onTab, onOpenRelated }) {
  return (
    <InspectorDetailHeader
      data-ndb-mail-header=""
      title={
        <h3
          data-ndb-mail-detail-subject=""
          className="ndb:break-words ndb:text-base ndb:font-bold ndb:leading-6"
        >
          {message.subject}
        </h3>
      }
      aside={
        <div className="ndb:flex ndb:shrink-0 ndb:items-center ndb:justify-self-end ndb:gap-2">
          <span
            hidden={message.lifecycle !== 'after_response'}
            className="ndb:rounded-md ndb:bg-indigo-100 ndb:px-2 ndb:py-1 ndb:text-xs ndb:font-semibold ndb:text-indigo-700 ndb:dark:bg-indigo-950 ndb:dark:text-indigo-300"
          >
            After response
          </span>
          <MailActions message={message} previewUrl={previewUrl} onOpenRelated={onOpenRelated} />
        </div>
      }
      identityProps={{ 'data-ndb-mail-recipient': '' }}
      identity={
        <dl className="ndb:space-y-2">
          <div className="ndb:grid ndb:grid-cols-[4.75rem_minmax(0,1fr)] ndb:items-baseline ndb:gap-2">
            <dt className="ndb:text-xs ndb:font-semibold ndb:text-zinc-400">Recipients</dt>{' '}
            <dd
              title={formatMailAddresses(message.to)}
              className="ndb:flex ndb:min-w-0 ndb:items-baseline ndb:gap-2"
            >
              <span className="ndb:truncate ndb:text-xs ndb:font-semibold ndb:text-zinc-700 ndb:dark:text-zinc-200">
                {message.to[0] || 'No recipient captured'}
              </span>
              <span
                hidden={message.to.length <= 1}
                className="ndb:shrink-0 ndb:text-xs ndb:font-bold ndb:text-indigo-600 ndb:dark:text-indigo-300"
              >
                {`+${message.to.length - 1} more`}
              </span>
            </dd>
          </div>

          <div className="ndb:grid ndb:grid-cols-[4.75rem_minmax(0,1fr)] ndb:items-baseline ndb:gap-2">
            <dt className="ndb:text-xs ndb:font-semibold ndb:text-zinc-400">Sender</dt>{' '}
            <dd title={formatMailAddresses(message.from)} className="ndb:min-w-0">
              <span className="ndb:block ndb:truncate ndb:text-xs ndb:font-medium ndb:text-zinc-600 ndb:dark:text-zinc-300">
                {message.from[0] || 'No sender captured'}
              </span>
            </dd>
          </div>
        </dl>
      }
      metadataProps={{ 'data-ndb-mail-metadata': '', className: 'ndb:w-full' }}
      metadata={
        <InspectorFacts
          bordered={false}
          columns={4}
          data-ndb-mail-facts=""
          className="ndb:w-full ndb:gap-x-3 ndb:p-0 ndb:sm:gap-x-4"
        >
          <InspectorFact label="Attachments" data-ndb-mail-fact="">
            <button
              type="button"
              hidden={message.attachment_count <= 0}
              onClick={() => onTab('message')}
              className="ndb:max-w-full ndb:truncate ndb:text-left ndb:text-xs ndb:font-bold ndb:text-indigo-600 ndb:underline-offset-2 ndb:hover:underline ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-indigo-300"
            >
              {message.attachment_summary_label}
            </button>
            <span
              hidden={message.attachment_count !== 0}
              className="ndb:text-xs ndb:font-semibold ndb:text-zinc-600 ndb:dark:text-zinc-300"
            >
              None
            </span>
          </InspectorFact>
          <InspectorFact
            label="Duration"
            data-ndb-mail-fact=""
            valueProps={{ className: 'ndb:truncate ndb:font-semibold ndb:tabular-nums' }}
          >
            {mailDurationFact(message)}
          </InspectorFact>
          <InspectorFact
            label="Driver"
            data-ndb-mail-fact=""
            valueProps={{ title: message.delivery_label, className: 'ndb:truncate ndb:font-semibold' }}
          >
            {message.delivery_label}
          </InspectorFact>
          <InspectorFact label="Source" data-ndb-mail-fact="" hidden={!message.callsite?.file}>
            <InspectorSourceLink title={message.callsite_label} onClick={() => onTab('source')}>
              {message.callsite_short_label}
            </InspectorSourceLink>
          </InspectorFact>
        </InspectorFacts>
      }
    />
  );
}
