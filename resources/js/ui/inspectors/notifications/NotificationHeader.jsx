import { cx } from '../../../app/hooks.js';
import { Icon } from '../../components/Icon.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { notificationActivity } from '../../../inspectors/notifications.js';

/** Notification name, recipient, destinations, and key facts. */
export function NotificationHeader({ notification, onTab, onOpenRelated }) {
  return (
    <div data-ndb-notification-header="">
      <InspectorDetailHeader
        className="ndb:border-b-0 ndb:pb-2.5"
        title={
          <h3
            data-ndb-notification-detail-title=""
            className="ndb:break-words ndb:text-base ndb:font-bold ndb:leading-6"
          >
            {notification.label}
          </h3>
        }
        aside={
          <div
            data-ndb-notification-status=""
            className="ndb:flex ndb:shrink-0 ndb:flex-wrap ndb:items-center ndb:justify-end ndb:gap-2 ndb:bg-transparent ndb:text-xs"
          >
            <span
              hidden={notification.lifecycle !== 'after_response'}
              className="ndb:rounded-md ndb:bg-indigo-100 ndb:px-2 ndb:py-1 ndb:text-xs ndb:font-semibold ndb:text-indigo-700 ndb:dark:bg-indigo-950 ndb:dark:text-indigo-300"
            >
              After response
            </span>
            <button
              type="button"
              data-ndb-notification-profile-link=""
              hidden={!notification.related_profile_id}
              onClick={onOpenRelated}
              className="ndb:inline-flex ndb:h-8 ndb:items-center ndb:gap-1.5 ndb:rounded-lg ndb:bg-indigo-50 ndb:px-2.5 ndb:text-xs ndb:font-bold ndb:text-indigo-700 ndb:transition ndb:hover:bg-indigo-100 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:bg-indigo-950/55 ndb:dark:text-indigo-300 ndb:dark:hover:bg-indigo-950"
            >
              <span>{notification.related_label}</span>
              <Icon name="external-link" size={3} />
            </button>
          </div>
        }
        identityProps={{ 'data-ndb-notification-recipient': '' }}
        identity={
          <dl className="ndb:space-y-2">
            <div className="ndb:grid ndb:grid-cols-[4.75rem_minmax(0,1fr)] ndb:items-baseline ndb:gap-2">
              <dt className="ndb:text-xs ndb:font-semibold ndb:text-zinc-400">Recipient</dt>{' '}
              <dd className="ndb:flex ndb:min-w-0 ndb:flex-wrap ndb:items-baseline ndb:gap-x-2 ndb:gap-y-0.5">
                <span className="ndb:truncate ndb:text-xs ndb:font-bold ndb:text-zinc-800 ndb:dark:text-zinc-100">
                  {notification.recipient_label}
                </span>
                <span
                  hidden={!notification.recipient_context_label}
                  title={notification.notifiable_type}
                  className="ndb:text-xs ndb:font-medium ndb:text-zinc-400"
                >
                  {notification.recipient_context_label}
                </span>
              </dd>
            </div>

            <div className="ndb:grid ndb:grid-cols-[4.75rem_minmax(0,1fr)] ndb:items-start ndb:gap-2">
              <dt className="ndb:pt-1 ndb:text-xs ndb:font-semibold ndb:text-zinc-400">Destinations</dt>{' '}
              <dd className="ndb:flex ndb:min-w-0 ndb:flex-wrap ndb:gap-1.5">
                {notification.deliveries.map((delivery) => (
                  <span
                    key={delivery.execution}
                    data-ndb-notification-destination=""
                    className={cx(
                      'ndb:inline-flex ndb:min-w-0 ndb:max-w-full ndb:items-center ndb:gap-1.5 ndb:rounded-md ndb:px-2 ndb:py-1 ndb:text-xs ndb:ring-1 ndb:ring-inset',
                      delivery.destination_resolved
                        ? 'ndb:bg-white/90 ndb:text-zinc-600 ndb:ring-zinc-200/80 ndb:dark:bg-zinc-950/60 ndb:dark:text-zinc-300 ndb:dark:ring-zinc-700'
                        : 'ndb:bg-amber-50 ndb:text-amber-700 ndb:ring-amber-200/80 ndb:dark:bg-amber-950/30 ndb:dark:text-amber-300 ndb:dark:ring-amber-900',
                    )}
                  >
                    <span className="ndb:shrink-0 ndb:font-bold">{delivery.channel_label}</span>
                    <span title={delivery.destination_label} className="ndb:truncate ndb:text-xs">
                      {delivery.destination_summary_label}
                    </span>
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        }
      />

      <div data-ndb-notification-metadata="">
        <InspectorFacts
          columns={4}
          data-ndb-notification-facts=""
          className="ndb:px-3 ndb:pb-3 ndb:sm:px-4 ndb:sm:pb-4"
        >
          <InspectorFact
            label="Channels"
            data-ndb-notification-fact=""
            valueProps={{ className: 'ndb:truncate ndb:font-bold ndb:text-zinc-700 ndb:dark:text-zinc-200' }}
          >
            {notification.channel_count_label}
          </InspectorFact>
          <InspectorFact
            label="Duration"
            data-ndb-notification-fact=""
            valueProps={{
              className:
                'ndb:truncate ndb:font-semibold ndb:tabular-nums ndb:text-zinc-700 ndb:dark:text-zinc-200',
            }}
          >
            {notificationActivity(notification, ['sent', 'failed', 'partial'], notification.status_label)}
          </InspectorFact>
          <InspectorFact
            label="Execution"
            data-ndb-notification-fact=""
            valueProps={{
              title: notification.execution_mode_label,
              className: 'ndb:truncate ndb:font-semibold ndb:text-zinc-700 ndb:dark:text-zinc-200',
            }}
          >
            {notification.execution_mode_label}
          </InspectorFact>
          <InspectorFact label="Source" data-ndb-notification-fact="" hidden={!notification.callsite?.file}>
            <InspectorSourceLink title={notification.callsite_label} onClick={() => onTab('source')}>
              {notification.callsite_short_label}
            </InspectorSourceLink>
          </InspectorFact>
        </InspectorFacts>
      </div>
    </div>
  );
}
