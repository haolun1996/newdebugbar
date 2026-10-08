import { cx } from '../../../app/hooks.js';
import { CodeBlock } from '../../components/CodeBlock.jsx';
import { Icon } from '../../components/Icon.jsx';
import { InspectorDefinitionList } from '../../components/InspectorDefinitionList.jsx';
import { InspectorDefinitionRow } from '../../components/InspectorDefinitionRow.jsx';
import { InspectorEvidence } from '../../components/InspectorEvidence.jsx';
import { InspectorSourceFact } from '../../components/InspectorSourceFact.jsx';
import { InspectorSourcePanel } from '../../components/InspectorSourcePanel.jsx';
import { formatNotificationEvidence, notificationActivity } from '../../../inspectors/notifications.js';

const PENDING = ['queued', 'delayed', 'waiting'];
const fileLine = (value) => (value ? `${value.file}:${value.line}` : '');

function DeliveryIcon({ status }) {
  if (status === 'failed') return <Icon name="warning" size={3.5} />;
  if (status === 'sent') return <Icon name="check" size={3.5} />;

  return <Icon name="clock" size={3.5} />;
}

/** One card per channel attempt with its outcome, destination, and failure. */
export function NotificationDeliveryPanel({ notification, onOpenMail }) {
  return (
    <div data-ndb-notification-detail-panel="delivery" className="ndb:py-3 ndb:sm:p-4">
      <div className="ndb:divide-y ndb:divide-zinc-200/90 ndb:border-y ndb:border-zinc-200/90 ndb:dark:divide-zinc-800 ndb:dark:border-zinc-800">
        {notification.deliveries.map((delivery) => (
          <article
            key={delivery.execution}
            data-ndb-notification-delivery=""
            className={cx('ndb:relative', { 'ndb:cursor-pointer': delivery.mail_available })}
          >
            {delivery.mail_available ? (
              <button
                type="button"
                data-ndb-notification-view-mail=""
                aria-label={`Open email for ${delivery.channel_label} delivery`}
                onClick={() => onOpenMail(delivery.mail_message_id)}
                className="ndb:absolute ndb:inset-0 ndb:z-10 ndb:cursor-pointer ndb:bg-transparent ndb:transition-colors ndb:hover:bg-zinc-950/[0.025] ndb:focus-visible:outline-2 ndb:focus-visible:outline-inset ndb:focus-visible:outline-indigo-500 ndb:dark:hover:bg-white/[0.035]"
              />
            ) : null}
            <div className="ndb:flex ndb:items-start ndb:justify-between ndb:gap-3 ndb:px-3 ndb:py-2.5">
              <div className="ndb:flex ndb:min-w-0 ndb:items-start ndb:gap-2.5">
                <span
                  className={cx(
                    'ndb:flex ndb:size-7 ndb:shrink-0 ndb:items-center ndb:justify-center ndb:rounded-lg',
                    {
                      'ndb:bg-red-100 ndb:text-red-600 ndb:dark:bg-red-950 ndb:dark:text-red-300':
                        delivery.status === 'failed',
                      'ndb:bg-emerald-100 ndb:text-emerald-600 ndb:dark:bg-emerald-950 ndb:dark:text-emerald-300':
                        delivery.status === 'sent',
                      'ndb:bg-indigo-100 ndb:text-indigo-600 ndb:dark:bg-indigo-950 ndb:dark:text-indigo-300':
                        delivery.status === 'processing',
                      'ndb:bg-amber-100 ndb:text-amber-600 ndb:dark:bg-amber-950 ndb:dark:text-amber-300':
                        PENDING.includes(delivery.status),
                    },
                  )}
                >
                  <DeliveryIcon status={delivery.status} />
                </span>
                <div className="ndb:min-w-0">
                  <h4 className="ndb:truncate ndb:text-xs ndb:font-bold">{delivery.channel_label}</h4>
                  <p
                    className={cx('ndb:mt-0.5 ndb:text-xs ndb:font-medium', {
                      'ndb:text-red-600 ndb:dark:text-red-300': delivery.status === 'failed',
                      'ndb:text-zinc-500 ndb:dark:text-zinc-400': delivery.status === 'sent',
                      'ndb:text-indigo-600 ndb:dark:text-indigo-300': delivery.status === 'processing',
                      'ndb:text-amber-700 ndb:dark:text-amber-300': PENDING.includes(delivery.status),
                    })}
                  >
                    {delivery.status_label}
                  </p>
                  {delivery.destination_labels.length <= 1 ? (
                    <span
                      data-ndb-notification-destination=""
                      className={cx(
                        'ndb:mt-1 ndb:block ndb:break-all ndb:bg-transparent ndb:p-0 ndb:text-xs',
                        delivery.destination_resolved
                          ? 'ndb:text-zinc-500 ndb:dark:text-zinc-400'
                          : 'ndb:text-amber-700 ndb:dark:text-amber-300',
                      )}
                    >
                      {delivery.destination_label}
                    </span>
                  ) : (
                    <div className="ndb:mt-1.5 ndb:flex ndb:flex-wrap ndb:gap-1">
                      {delivery.destination_labels.map((destination, index) => (
                        <span
                          key={index}
                          data-ndb-notification-destination=""
                          className="ndb:max-w-full ndb:break-all ndb:rounded-md ndb:bg-zinc-100 ndb:px-1.5 ndb:py-0.5 ndb:text-xs ndb:text-zinc-600 ndb:dark:bg-zinc-800 ndb:dark:text-zinc-300"
                        >
                          {destination}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span className="ndb:shrink-0 ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-400">
                {notificationActivity(delivery, ['sent', 'failed'], delivery.status_label)}
              </span>
            </div>

            <div
              hidden={!delivery.failure_message}
              className="ndb:border-t ndb:border-red-200/80 ndb:px-3 ndb:py-2.5 ndb:dark:border-red-950"
            >
              <p className="ndb:text-xs ndb:font-semibold ndb:leading-5 ndb:text-red-700 ndb:dark:text-red-300">
                {delivery.failure_message}
              </p>
              <code
                hidden={!delivery.exception_class}
                className="ndb:mt-1 ndb:block ndb:break-all ndb:text-xs ndb:text-red-500 ndb:dark:text-red-400"
              >
                {delivery.exception_class}
              </code>
              <span
                hidden={!delivery.exception_location}
                className="ndb:mt-1 ndb:block ndb:break-all ndb:text-xs ndb:text-red-500 ndb:dark:text-red-400"
              >
                {fileLine(delivery.exception_location)}
              </span>
            </div>

            <div
              hidden={!delivery.evidence_summary}
              className="ndb:border-t ndb:border-zinc-200/80 ndb:px-3 ndb:py-2 ndb:text-xs ndb:text-zinc-500 ndb:dark:border-zinc-800 ndb:dark:text-zinc-400"
            >
              {delivery.evidence_summary}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/** Application payload plus the selected channel's response and failure evidence. */
export function NotificationPayloadPanel({ notification, delivery }) {
  return (
    <div
      data-ndb-notification-detail-panel="payload"
      className="ndb:space-y-3 ndb:p-3 ndb:sm:space-y-5 ndb:sm:p-4"
    >
      <InspectorEvidence
        label="Application payload"
        language="json"
        aside={
          <span hidden={!notification.locale} className="ndb:text-xs ndb:font-semibold ndb:text-zinc-400">
            {`Locale ${notification.locale}`}
          </span>
        }
        value={formatNotificationEvidence(notification.notification_data)}
      />

      <section className="ndb:border-t ndb:border-zinc-200/90 ndb:pt-3 ndb:sm:pt-4 ndb:dark:border-zinc-800">
        <div className="ndb:flex ndb:items-center ndb:justify-between ndb:gap-3">
          <h4 className="ndb:text-xs ndb:font-bold">Channel evidence</h4>
          <span className="ndb:text-xs ndb:font-bold ndb:text-zinc-500 ndb:dark:text-zinc-400">
            {delivery?.channel_label}
          </span>
        </div>
        <InspectorDefinitionList className="ndb:mt-2">
          <InspectorDefinitionRow
            label="Destination"
            hidden={!delivery?.destination_label}
            valueProps={{ className: 'ndb:break-all' }}
          >
            {delivery?.destination_label}
          </InspectorDefinitionRow>
          <InspectorDefinitionRow label="Status" hidden={!delivery?.status_label}>
            {delivery?.status_label}
          </InspectorDefinitionRow>
          <InspectorDefinitionRow
            label="Response type"
            hidden={!delivery?.response_type}
            valueProps={{ className: 'ndb:break-all' }}
          >
            {delivery?.response_type}
          </InspectorDefinitionRow>
          <InspectorDefinitionRow
            label="Exception"
            hidden={!delivery?.exception_class}
            valueProps={{ className: 'ndb:break-all ndb:font-mono ndb:text-xs' }}
          >
            {delivery?.exception_class}
          </InspectorDefinitionRow>
          <InspectorDefinitionRow
            label="Failed at"
            hidden={!delivery?.exception_location}
            valueProps={{ className: 'ndb:break-all' }}
          >
            {fileLine(delivery?.exception_location)}
          </InspectorDefinitionRow>
          <InspectorDefinitionRow
            label="Message ID"
            hidden={!delivery?.mail_message_id}
            valueProps={{ className: 'ndb:break-all' }}
          >
            {delivery?.mail_message_id}
          </InspectorDefinitionRow>
        </InspectorDefinitionList>
        <CodeBlock
          language="json"
          className="ndb:mt-2"
          source={formatNotificationEvidence(delivery?.response, 'No provider response was captured.')}
        />
        <div hidden={delivery?.status !== 'failed'} className="ndb:mt-3">
          <p
            hidden={!delivery?.failure_message}
            className="ndb:rounded-lg ndb:bg-red-50 ndb:px-3 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:leading-5 ndb:text-red-700 ndb:dark:bg-red-950/30 ndb:dark:text-red-300"
          >
            {delivery?.failure_message}
          </p>
          <CodeBlock
            language="json"
            className="ndb:mt-2"
            source={formatNotificationEvidence(delivery?.failure_data, 'No extra failure data was captured.')}
          />
        </div>
      </section>

      <InspectorEvidence
        label="Anonymous routes"
        language="json"
        hidden={Object.keys(notification.routes).length === 0}
        className="ndb:border-t ndb:border-zinc-200/90 ndb:pt-3 ndb:sm:pt-4 ndb:dark:border-zinc-800"
        value={formatNotificationEvidence(notification.routes)}
      />
    </div>
  );
}

/** The notification class, where it was defined and sent, and its application stack. */
export function NotificationSourcePanel({ notification }) {
  return (
    <div data-ndb-notification-detail-panel="source">
      <InspectorSourcePanel frames={notification.stack} resetKey={notification.execution}>
        <InspectorSourceFact label="Notification class" code>
          {notification.notification}
        </InspectorSourceFact>
        <InspectorSourceFact
          label="Defined at"
          hidden={!notification.notification_source?.file}
          valueProps={{}}
        >
          {fileLine(notification.notification_source)}
        </InspectorSourceFact>
        <InspectorSourceFact label="Triggered at" hidden={!notification.callsite?.file} valueProps={{}}>
          {notification.callsite_label}
        </InspectorSourceFact>
        <InspectorSourceFact label="Notification ID" hidden={!notification.notification_id} valueProps={{}}>
          {notification.notification_id}
        </InspectorSourceFact>
      </InspectorSourcePanel>
    </div>
  );
}
