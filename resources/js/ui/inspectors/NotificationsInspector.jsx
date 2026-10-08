import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cx, useShell } from '../../app/hooks.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { FilterTab } from '../components/FilterTab.jsx';
import { Icon } from '../components/Icon.jsx';
import { InspectorDetailBack } from '../components/InspectorDetailBack.jsx';
import { InspectorDetailPane } from '../components/InspectorDetailPane.jsx';
import { InspectorDetailTabs } from '../components/InspectorDetailTabs.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorListPanel } from '../components/InspectorListPanel.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { SearchField } from '../components/SearchField.jsx';
import { SelectField } from '../components/SelectField.jsx';
import { formatDuration } from '../../duration.js';
import { formatNumber, plural } from '../../inspectors/mail.js';
import {
  NOTIFICATION_DETAIL_TABS,
  NOTIFICATION_FILTERS,
  filterNotifications,
  notificationActivity,
  notificationDelivery,
  notificationFilterOptions,
  presentNotificationGroups,
} from '../../inspectors/notifications.js';
import { NotificationHeader } from './notifications/NotificationHeader.jsx';
import {
  NotificationDeliveryPanel,
  NotificationPayloadPanel,
  NotificationSourcePanel,
} from './notifications/NotificationPanels.jsx';

const DETAIL_TABS = [
  ['delivery', 'Delivery', 'activity'],
  ['payload', 'Payload', 'database'],
  ['source', 'Source', 'code'],
];

/** A fresh detail view for a notification: its delivery tab and first channel. */
const detailView = (notification, detailOpen) => ({
  selected: notification?.execution ?? null,
  detailOpen,
  tab: 'delivery',
  channel: notification?.deliveries?.[0]?.channel ?? null,
});

/** Logical Laravel notifications with channel-level delivery diagnostics. */
export function NotificationsInspector({ inspector, profileId }) {
  const shell = useShell();
  const summary = inspector.summary ?? {};
  const payload = inspector.payload ?? {};
  const groups = useMemo(
    () => presentNotificationGroups(payload.items, profileId, payload.retained_mail_message_ids),
    [payload.items, payload.retained_mail_message_ids, profileId],
  );
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState(() => detailView(groups[0], false));
  const detail = useRef(null);
  const visible = useMemo(() => filterNotifications(groups, filter, search), [groups, filter, search]);

  // Keep a visible notification selected when filters or refreshed data hide the current one.
  const fallback = visible.some((group) => group.execution === view.selected)
    ? view.selected
    : (visible[0]?.execution ?? null);
  if (fallback !== view.selected) {
    setView(detailView(visible[0], view.detailOpen));
  }

  const notification = groups.find((group) => group.execution === view.selected) ?? null;
  const delivery = notificationDelivery(notification, view.channel);

  useLayoutEffect(() => {
    detail.current?.scrollTo?.({ top: 0, behavior: 'instant' });
  }, [view.selected, view.tab]);

  const select = (execution) => {
    const target = groups.find((group) => group.execution === execution);
    if (target) setView(detailView(target, true));
  };
  const setTab = (tab) =>
    NOTIFICATION_DETAIL_TABS.includes(tab) && setView((current) => ({ ...current, tab }));
  const setChannel = (channel) => {
    if (!notification?.deliveries.some((candidate) => candidate.channel === channel)) return;
    setView((current) => ({ ...current, channel }));
  };
  const close = () => setView((current) => ({ ...current, detailOpen: false }));

  if (groups.length === 0) {
    return (
      <div
        data-ndb-notifications=""
        className="ndb:space-y-4 ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col ndb:lg:space-y-0"
      >
        <EmptyState label="No notifications were sent." />
      </div>
    );
  }

  const count = Number(summary.notification_count ?? groups.length);

  return (
    <div
      data-ndb-notifications=""
      className="ndb:space-y-4 ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col ndb:lg:space-y-0"
    >
      <InspectorWorkspace frame="top" data-ndb-notification-workspace="">
        <InspectorListPanel
          detailOpen={view.detailOpen}
          controls={
            <InspectorListControls
              showSearch={groups.length > 5}
              leading={
                <p
                  data-ndb-notification-summary=""
                  className="ndb:min-w-0 ndb:text-xs ndb:font-semibold ndb:text-zinc-600 ndb:dark:text-zinc-300"
                >
                  <span data-ndb-notification-summary-count="" className="ndb:block">
                    {formatNumber(count)} {plural('notification', count)}
                  </span>
                  <span
                    data-ndb-notification-summary-runtime=""
                    className="ndb:mt-0.5 ndb:block ndb:text-xs ndb:font-medium ndb:tabular-nums ndb:text-zinc-400"
                  >
                    {formatDuration(summary.duration_ms ?? 0)} total
                  </span>
                </p>
              }
              search={
                <SearchField
                  label="Search captured notifications"
                  placeholder="Search notification or recipient"
                  data-ndb-notification-search=""
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              }
              filter={
                <SelectField
                  label="Filter captured notifications"
                  data-ndb-notification-filter=""
                  value={filter}
                  onChange={(event) =>
                    NOTIFICATION_FILTERS.includes(event.target.value) && setFilter(event.target.value)
                  }
                >
                  {notificationFilterOptions(groups).map(([value, label, total]) => (
                    <option key={value} value={value}>
                      {`${label} (${total})`}
                    </option>
                  ))}
                </SelectField>
              }
            />
          }
          listProps={{ 'data-ndb-notification-list': '' }}
          list={visible.map((group) => {
            const selected = view.selected === group.execution;

            return (
              <button
                key={group.execution}
                type="button"
                data-ndb-notification-item={group.execution}
                data-ndb-execution={group.execution}
                data-ndb-status={group.status}
                data-ndb-search={group.search}
                onClick={() => select(group.execution)}
                aria-pressed={selected}
                className={cx(
                  'ndb:grid ndb:h-auto ndb:w-full ndb:grid-cols-[minmax(0,1fr)_auto] ndb:items-baseline ndb:gap-x-3 ndb:gap-y-1 ndb:px-3 ndb:py-2.5 ndb:text-left ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:sm:py-3',
                  selected
                    ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
                    : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
                )}
              >
                <span
                  data-ndb-notification-list-title=""
                  className="ndb:min-w-0 ndb:truncate ndb:text-xs ndb:font-bold"
                >
                  {group.label}
                </span>
                <span
                  data-ndb-notification-list-status=""
                  className={cx('ndb:justify-self-end ndb:text-xs ndb:font-bold', {
                    'ndb:text-emerald-600 ndb:dark:text-emerald-300': group.status === 'sent',
                    'ndb:text-amber-600 ndb:dark:text-amber-300': ['partial', 'delayed', 'waiting'].includes(
                      group.status,
                    ),
                    'ndb:text-red-600 ndb:dark:text-red-300': group.status === 'failed',
                    'ndb:text-sky-600 ndb:dark:text-sky-300': group.status === 'queued',
                    'ndb:text-indigo-600 ndb:dark:text-indigo-300': group.status === 'processing',
                  })}
                >
                  {group.status_label}
                </span>
                <span
                  data-ndb-notification-list-recipient=""
                  className="ndb:col-start-1 ndb:min-w-0 ndb:truncate ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400"
                >
                  To {group.recipient_label}
                </span>
                <span
                  data-ndb-notification-list-activity=""
                  className="ndb:col-start-2 ndb:justify-self-end ndb:text-right ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-400"
                >
                  {notificationActivity(group, ['sent', 'failed', 'partial'], 'Waiting for worker')}
                </span>
              </button>
            );
          })}
          emptyProps={{ hidden: visible.length !== 0 }}
          empty={<EmptyState label="No notifications match these filters." />}
        />

        <InspectorDetailPane
          detailOpen={view.detailOpen}
          detailRef={detail}
          detailLabel="Selected notification details"
          backLabel="Notifications"
          onClose={close}
          data-ndb-notification-detail=""
          back={
            <InspectorDetailBack data-ndb-notification-detail-back="" onClick={close} label="Notifications" />
          }
        >
          {notification ? (
            <div className="ndb:flex ndb:flex-col">
              <NotificationHeader
                notification={notification}
                onTab={setTab}
                onOpenRelated={() =>
                  shell.openRelatedProfile(notification.related_profile_id, notification.related_inspector)
                }
              />

              <InspectorDetailTabs
                label="Notification detail"
                asideProps={{
                  'data-ndb-notification-channel-control': '',
                  hidden: !(view.tab === 'payload' && notification.delivery_count > 1),
                  className: 'ndb:shrink-0',
                }}
                aside={
                  <SelectField
                    label="Choose notification channel payload"
                    data-ndb-notification-channel=""
                    value={delivery?.channel ?? ''}
                    onChange={(event) => setChannel(event.target.value)}
                    className="ndb:max-w-44 ndb:truncate"
                  >
                    {notification.deliveries.map((candidate) => (
                      <option key={candidate.execution} value={candidate.channel}>
                        {candidate.channel_label}
                      </option>
                    ))}
                  </SelectField>
                }
              >
                {DETAIL_TABS.map(([tab, label, icon]) => (
                  <FilterTab
                    key={tab}
                    variant="segmented"
                    data-ndb-notification-detail-tab={tab}
                    onClick={() => setTab(tab)}
                    aria-pressed={view.tab === tab}
                    aria-label={label}
                    className="ndb:h-auto"
                  >
                    <Icon
                      name={icon}
                      size={3.5}
                      data-ndb-notification-detail-tab-icon={tab}
                      className="ndb:sm:hidden"
                    />
                    <span className="ndb:hidden ndb:sm:inline">{label}</span>
                  </FilterTab>
                ))}
              </InspectorDetailTabs>

              {view.tab === 'delivery' ? (
                <NotificationDeliveryPanel
                  notification={notification}
                  onOpenMail={(messageId) => shell.selectInspector('mail', { messageId })}
                />
              ) : null}
              {view.tab === 'payload' ? (
                <NotificationPayloadPanel notification={notification} delivery={delivery} />
              ) : null}
              {view.tab === 'source' ? <NotificationSourcePanel notification={notification} /> : null}
            </div>
          ) : null}
        </InspectorDetailPane>
      </InspectorWorkspace>
    </div>
  );
}
