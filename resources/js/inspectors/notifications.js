import { formatDuration } from '../duration.js';
import { basename, plural } from './mail.js';

/** Pure presentation rules for the notifications inspector (ported from the former Blade view). */

const DELIVERY_STATUSES = ['queued', 'delayed', 'processing', 'sent', 'failed', 'waiting'];

const DELIVERY_STATUS_LABELS = {
  queued: 'Queued',
  delayed: 'Delayed',
  processing: 'Processing',
  failed: 'Failed',
  waiting: 'Waiting for worker',
  sent: 'Sent to channel',
};

const GROUP_STATUS_LABELS = {
  sent: 'Sent',
  failed: 'Failed',
  partial: 'Needs attention',
  queued: 'Queued',
  delayed: 'Delayed',
  processing: 'Processing',
};

export const NOTIFICATION_FILTERS = ['all', 'attention', 'sent'];
export const NOTIFICATION_DETAIL_TABS = ['delivery', 'payload', 'source'];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isArray = (value) => Array.isArray(value) || isObject(value);
const list = (value) => (Array.isArray(value) ? value : isObject(value) ? Object.values(value) : []);
const text = (value) => (typeof value === 'string' ? value : null);
const isScalar = (value) => ['string', 'number', 'boolean'].includes(typeof value);
/** PHP (string) casts for scalars. */
const scalarString = (value) => (typeof value === 'boolean' ? (value ? '1' : '') : String(value));
const isNumeric = (value) =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));
const isEmpty = (value) => (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0);

/** Laravel's Str::headline for channel names (`profiled-sms` → `Profiled Sms`). */
export function headline(value) {
  const title = (word) =>
    word
      .toLowerCase()
      .replace(/(^|[^\p{L}\p{N}'])(\p{L})/gu, (_, before, letter) => before + letter.toUpperCase());
  let parts = String(value).split(/\s+/u);
  parts =
    parts.length > 1
      ? parts.map(title)
      : parts
          .join('_')
          .split(/(?=\p{Lu})/u)
          .filter((part) => part !== '')
          .map(title);

  return parts
    .join('_')
    .replace(/[-\s]/g, '_')
    .split('_')
    .filter((part) => part !== '')
    .join(' ');
}

export function channelLabel(channel) {
  return headline(String(channel).replace(/[-_]/g, ' '))
    .replaceAll('Sms', 'SMS')
    .replaceAll('Mms', 'MMS')
    .replaceAll('Api', 'API')
    .replaceAll('Url', 'URL');
}

/** Readable labels for a channel's routing destination. */
export function formatNotificationDestinations(destination) {
  if (isScalar(destination)) {
    const label = scalarString(destination).trim();

    return label === '' ? [] : [label];
  }

  if (!isArray(destination) || isEmpty(destination)) return [];

  if (typeof destination.type === 'string') {
    const name =
      typeof destination.name === 'string' && destination.name.trim() !== '' ? destination.name.trim() : null;
    const id = isScalar(destination.id) ? scalarString(destination.id) : null;
    const context = basename(destination.type) + (id === null || id === '' ? '' : ` #${id}`);

    return [name === null || name === context ? context : `${name} (${context})`];
  }

  const parts = [];

  Object.entries(destination).forEach(([key, value]) => {
    if (isObject(destination) && key.includes('@')) {
      const name = isScalar(value) ? scalarString(value).trim() : '';
      parts.push(name === '' ? key : `${name} <${key}>`);
    } else if (isScalar(value) && scalarString(value).trim() !== '') {
      parts.push(scalarString(value).trim());
    }
  });

  return parts.length > 0 ? parts : [JSON.stringify(destination)];
}

function failureMessage(attempt, failureData) {
  if (typeof attempt.exception_message === 'string') return attempt.exception_message;

  const key = ['reason', 'message', 'error', 'detail'].find((candidate) => isScalar(failureData[candidate]));

  return key === undefined ? null : scalarString(failureData[key]).trim();
}

function responseSummary(attempt, response, mailMessageId) {
  if (mailMessageId !== null) return `Mail message ${mailMessageId}`;
  if (isObject(response) && isScalar(response.message_id))
    return `Message ${scalarString(response.message_id)}`;
  if (isObject(response) && isScalar(response.provider)) return `${scalarString(response.provider)} response`;
  if (typeof attempt.response_type === 'string') return basename(attempt.response_type);

  return null;
}

function evidenceSummary(status, channel, mailMessageId, response) {
  if (status === 'failed') return null;
  if (['queued', 'delayed', 'waiting'].includes(status)) return 'Waiting for a queue worker.';
  if (status === 'processing') return 'A queue worker is processing this notification.';
  if (channel === 'mail' && mailMessageId !== null) return 'Mail transport accepted the message.';
  if (channel === 'database') return 'Notification stored in the database.';
  if (response !== null) return 'Channel returned a provider response.';

  return 'Channel completed without throwing.';
}

function presentDelivery(rawAttempt, attemptIndex, retainedMailIds) {
  const attempt = isObject(rawAttempt) ? rawAttempt : {};
  const callsite = isObject(attempt.callsite) ? attempt.callsite : null;
  const channel = String(attempt.channel ?? 'unknown');
  const requested = String(attempt.status ?? 'sent');
  const status = DELIVERY_STATUSES.includes(requested) ? requested : 'sent';
  const response = attempt.response ?? null;
  const failureData = isArray(attempt.failure_data) ? attempt.failure_data : [];
  const mailMessageId = text(attempt.mail_message_id);
  const destinationLabels = formatNotificationDestinations(attempt.destination ?? null);
  const destinationLabel = destinationLabels.join(', ');
  const destinationCount = destinationLabels.length;

  return {
    execution: attemptIndex + 1,
    channel,
    channel_label: channelLabel(channel),
    status,
    status_label: DELIVERY_STATUS_LABELS[status],
    duration_ms: Number(attempt.duration_ms ?? 0) || 0,
    duration_label: formatDuration(attempt.duration_ms ?? 0),
    delay_seconds: isNumeric(attempt.delay_seconds) ? Math.trunc(Number(attempt.delay_seconds)) : null,
    destination_labels: destinationLabels,
    destination_label: destinationLabel === '' ? 'No destination resolved' : destinationLabel,
    destination_summary_label:
      destinationCount === 0
        ? 'No destination resolved'
        : destinationCount === 1
          ? destinationLabel
          : `${destinationCount} ${channel === 'mail' ? 'recipients' : 'destinations'}`,
    destination_resolved: destinationCount > 0,
    response_type: text(attempt.response_type),
    response,
    response_summary: responseSummary(attempt, response, mailMessageId),
    evidence_summary: evidenceSummary(status, channel, mailMessageId, response),
    failure_data: failureData,
    failure_message: failureMessage(attempt, failureData),
    exception_class: text(attempt.exception_class),
    exception_location: isObject(attempt.exception_location) ? attempt.exception_location : null,
    mail_message_id: mailMessageId,
    mail_available: mailMessageId !== null && retainedMailIds.includes(mailMessageId),
    callsite,
    callsite_label: callsite === null ? 'Source unavailable' : `${callsite.file}:${callsite.line}`,
    stack: list(attempt.stack),
  };
}

function groupStatus(deliveries) {
  const failed = deliveries.filter((delivery) => delivery.status === 'failed').length;
  const statuses = deliveries.map((delivery) => delivery.status);
  const pending = ['processing', 'delayed', 'queued', 'waiting'].find((status) => statuses.includes(status));

  if (failed === deliveries.length) return 'failed';
  if (failed > 0) return 'partial';

  return pending ?? 'sent';
}

/** Groups channel attempts into logical notifications with their delivery diagnostics. */
export function presentNotificationGroups(items, profileId, retainedMailIds = []) {
  const retained = Array.isArray(retainedMailIds) ? retainedMailIds : [];
  const groups = new Map();

  list(items).forEach((rawItem, index) => {
    const item = isObject(rawItem) ? rawItem : {};
    const key = String(item.group_id ?? item.correlation_key ?? `notification-${index}`);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  return [...groups.entries()].map(([groupId, attempts], groupIndex) => {
    const first = attempts[0];
    const notificationClass = String(first.notification ?? 'Notification');
    const notifiableType = String(first.notifiable_type ?? 'Notifiable');
    const notifiableId = first.notifiable_id ?? null;
    const notificationSource = isObject(first.notification_source) ? first.notification_source : null;
    const deliveries = attempts.map((attempt, attemptIndex) =>
      presentDelivery(attempt, attemptIndex, retained),
    );
    const status = groupStatus(deliveries);
    const statusLabel = GROUP_STATUS_LABELS[status] ?? 'Waiting for worker';
    let recipientTypeLabel = basename(notifiableType);
    if (isScalar(notifiableId) && scalarString(notifiableId) !== '') {
      recipientTypeLabel += ` #${scalarString(notifiableId)}`;
    }
    const recipientName =
      typeof first.notifiable_name === 'string' && first.notifiable_name.trim() !== ''
        ? first.notifiable_name.trim()
        : null;
    const recipientLabel = recipientName ?? recipientTypeLabel;
    const channels = [...new Set(deliveries.map((delivery) => delivery.channel_label))];
    const deliverySummary = deliveries
      .map((delivery) => `${delivery.channel_label} ${delivery.status_label}`)
      .join(', ');
    const callsite = deliveries.find((delivery) => delivery.callsite !== null)?.callsite ?? null;
    const stack = deliveries.find((delivery) => delivery.stack.length > 0)?.stack ?? [];
    const isOrigin = Boolean(first.is_origin);
    const relatedId = isOrigin ? first.worker_profile_id : first.origin_profile_id;
    const hasMailChannel = deliveries.some((delivery) => delivery.channel === 'mail');
    const relatedInspector = isOrigin && hasMailChannel && status === 'sent' ? 'mail' : 'notifications';
    const queueConnection = text(first.queue_connection) ?? text(first.connection);
    const queueName = text(first.queue_name) ?? text(first.queue);
    const queueable = Boolean(first.queueable) || queueConnection !== null;
    const duration = deliveries.reduce((total, delivery) => total + delivery.duration_ms, 0);
    const jobId = isScalar(first.job_id) ? scalarString(first.job_id) : null;

    return {
      execution: groupIndex + 1,
      group_id: groupId,
      notification_id: text(first.notification_id),
      notification: notificationClass,
      label: basename(notificationClass),
      status,
      status_label: statusLabel,
      duration_ms: duration,
      duration_label: formatDuration(duration),
      delivery_count: deliveries.length,
      deliveries,
      channel_count_label: `${channels.length} ${plural('channel', channels.length)}`,
      delay_seconds: isNumeric(first.delay_seconds) ? Math.trunc(Number(first.delay_seconds)) : null,
      lifecycle: text(first.lifecycle),
      related_profile_id: typeof relatedId === 'string' && relatedId !== profileId ? relatedId : null,
      related_inspector: relatedInspector,
      related_label: isOrigin
        ? relatedInspector === 'mail'
          ? 'Open mail preview'
          : 'Open worker'
        : 'Open request',
      execution_mode_label: queueable
        ? `Queueable${queueName !== null ? ` on ${queueName}` : ''}`
        : 'Synchronous',
      locale: text(first.locale),
      notifiable_type: notifiableType,
      recipient_label: recipientLabel,
      recipient_context_label: recipientName === null ? null : recipientTypeLabel,
      routes: isArray(first.routes) ? first.routes : [],
      notification_data: isArray(first.notification_data) ? first.notification_data : [],
      notification_source: notificationSource,
      callsite,
      callsite_label: callsite === null ? 'Source unavailable' : `${callsite.file}:${callsite.line}`,
      callsite_short_label: callsite === null ? 'Unavailable' : `${basename(callsite.file)}:${callsite.line}`,
      stack,
      search: [
        notificationClass,
        notifiableType,
        isScalar(notifiableId) ? scalarString(notifiableId) : null,
        recipientName,
        recipientLabel,
        channels.join(' '),
        deliverySummary,
        statusLabel,
        queueConnection,
        queueName,
        jobId,
        callsite?.file,
        ...deliveries.map((delivery) => delivery.destination_label),
        ...deliveries.map((delivery) => delivery.failure_message),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };
  });
}

export function notificationFilterOptions(groups) {
  return [
    ['all', 'All', groups.length],
    ['attention', 'Needs attention', groups.filter((group) => group.status !== 'sent').length],
    ['sent', 'Sent', groups.filter((group) => group.status === 'sent').length],
  ];
}

export function filterNotifications(groups, filter, search) {
  const query = String(search ?? '')
    .toLowerCase()
    .trim();

  return groups.filter((group) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'attention' && group.status !== 'sent') ||
      (filter === 'sent' && group.status === 'sent');

    return matchesFilter && (query === '' || group.search.includes(query));
  });
}

/** The selected channel's delivery, falling back to the first channel. */
export function notificationDelivery(group, channel) {
  const deliveries = group?.deliveries ?? [];

  return deliveries.find((delivery) => delivery.channel === channel) ?? deliveries[0] ?? null;
}

export function formatNotificationEvidence(value, empty = 'No data was captured.') {
  if (value === null || value === undefined || value === '') return empty;
  if (typeof value === 'string') return value;

  return JSON.stringify(value, null, 2);
}

/** Duration, delay, or pending status for a notification or one of its deliveries. */
export function notificationActivity(entry, completedStatuses, pendingLabel) {
  if (completedStatuses.includes(entry.status) || entry.duration_ms > 0) return entry.duration_label;
  if (entry.delay_seconds > 0) return `${entry.delay_seconds} s delay`;

  return pendingLabel;
}
