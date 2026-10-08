import { InspectorDefinitionList } from '../../components/InspectorDefinitionList.jsx';
import { InspectorDefinitionRow } from '../../components/InspectorDefinitionRow.jsx';
import { InspectorSourceFact } from '../../components/InspectorSourceFact.jsx';
import { InspectorSourcePanel } from '../../components/InspectorSourcePanel.jsx';
import { Icon } from '../../components/Icon.jsx';
import {
  formatMailAddresses,
  mailAddressFields,
  mailBounded,
  mailDeliveryFields,
} from '../../../inspectors/mail.js';

function AttachmentText({ attachment }) {
  return (
    <span className="ndb:min-w-0 ndb:flex-1">
      <span className="ndb:block ndb:truncate ndb:text-xs ndb:font-semibold">{attachment.name}</span>
      <span className="ndb:mt-0.5 ndb:flex ndb:min-w-0 ndb:flex-wrap ndb:gap-x-2 ndb:text-xs ndb:text-zinc-400">
        <span className="ndb:truncate">{attachment.content_type}</span>
        <span className="ndb:tabular-nums">{attachment.size_label}</span>
      </span>
    </span>
  );
}

/** Addresses, attachments, and delivery metadata of the selected message. */
export function MailMessagePanel({ message }) {
  const omitted = message.attachment_bodies_omitted;

  return (
    <div data-ndb-mail-detail-panel="message" className="ndb:p-3 ndb:sm:p-4">
      <InspectorDefinitionList>
        {mailAddressFields(message).map(([label, addresses]) => (
          <InspectorDefinitionRow key={label} label={label} valueProps={{ className: 'ndb:break-all' }}>
            {formatMailAddresses(addresses)}
          </InspectorDefinitionRow>
        ))}
      </InspectorDefinitionList>

      <section
        hidden={message.attachments.length === 0}
        className="ndb:mt-4 ndb:border-t ndb:border-zinc-200/90 ndb:pt-3 ndb:sm:mt-5 ndb:sm:pt-4 ndb:dark:border-zinc-800"
      >
        <h4 className="ndb:text-xs ndb:font-bold">Attachments</h4>
        <div className="ndb:mt-2 ndb:divide-y ndb:divide-zinc-200/90 ndb:overflow-hidden ndb:rounded-xl ndb:border ndb:border-zinc-200/90 ndb:dark:divide-zinc-800 ndb:dark:border-zinc-800">
          {message.attachments.map((attachment, index) => (
            <div key={index}>
              {attachment.download_url ? (
                <a
                  data-ndb-mail-attachment-download=""
                  href={attachment.download_url}
                  download={attachment.name}
                  className="ndb:flex ndb:h-auto ndb:min-w-0 ndb:items-center ndb:gap-3 ndb:bg-transparent ndb:px-3 ndb:py-2.5 ndb:no-underline ndb:transition-colors ndb:hover:bg-zinc-50/80 ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-[-2px] ndb:focus-visible:outline-indigo-500 ndb:dark:hover:bg-zinc-900/60"
                >
                  <AttachmentText attachment={attachment} />
                  <span className="ndb:flex ndb:shrink-0 ndb:items-center ndb:gap-1.5 ndb:text-xs ndb:font-bold ndb:text-indigo-600 ndb:dark:text-indigo-300">
                    Download
                    <Icon name="download" size={3.5} />
                  </span>
                </a>
              ) : (
                <div className="ndb:flex ndb:min-w-0 ndb:items-center ndb:gap-3 ndb:px-3 ndb:py-2.5">
                  <AttachmentText attachment={attachment} />
                  <span className="ndb:shrink-0 ndb:text-xs ndb:font-semibold ndb:text-zinc-400">
                    Not retained
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        <p
          hidden={omitted <= 0}
          className="ndb:mt-2 ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400"
        >
          <span>{omitted}</span> <span>{omitted === 1 ? 'attachment was' : 'attachments were'}</span> not
          retained because the message exceeded the capture budget or the file could not be read.
        </p>
      </section>

      <section className="ndb:mt-4 ndb:border-t ndb:border-zinc-200/90 ndb:pt-3 ndb:sm:mt-5 ndb:sm:pt-4 ndb:dark:border-zinc-800">
        <h4 className="ndb:text-xs ndb:font-bold">Delivery details</h4>
        <InspectorDefinitionList className="ndb:mt-2">
          {mailDeliveryFields(message).map(([label, value]) => (
            <InspectorDefinitionRow key={label} label={label} valueProps={{ className: 'ndb:break-all' }}>
              {String(value)}
            </InspectorDefinitionRow>
          ))}
        </InspectorDefinitionList>
      </section>

      <p
        hidden={!mailBounded(message)}
        className="ndb:mt-3 ndb:rounded-lg ndb:bg-amber-50 ndb:px-3 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:leading-5 ndb:text-amber-700 ndb:sm:mt-4 ndb:dark:bg-amber-950/35 ndb:dark:text-amber-300"
      >
        Some message data was bounded to keep this profile responsive.
      </p>
    </div>
  );
}

/** Where the message was created, with its application stack. */
export function MailSourcePanel({ message }) {
  return (
    <div data-ndb-mail-detail-panel="source">
      <InspectorSourcePanel frames={message.stack} resetKey={message.execution}>
        <InspectorSourceFact label="Mailable or notification" code hidden={!message.source}>
          {message.source}
        </InspectorSourceFact>
        <InspectorSourceFact label="Triggered at" hidden={!message.callsite?.file} valueProps={{}}>
          {message.callsite_label}
        </InspectorSourceFact>
      </InspectorSourcePanel>
    </div>
  );
}
