import { formatDuration } from '../duration.js';

/** Pure presentation rules for the mail inspector (ported from the former Blade view). */

const STATUS_LABELS = {
  queued: 'Queued',
  delayed: 'Delayed',
  processing: 'Processing',
  sent: 'Sent',
  failed: 'Failed',
  waiting: 'Waiting for worker',
};

const STATUS_TEXT_CLASSES = {
  queued: 'ndb:text-sky-600 ndb:dark:text-sky-300',
  delayed: 'ndb:text-amber-600 ndb:dark:text-amber-300',
  processing: 'ndb:text-indigo-600 ndb:dark:text-indigo-300',
  sent: 'ndb:text-emerald-600 ndb:dark:text-emerald-300',
  failed: 'ndb:text-red-600 ndb:dark:text-red-300',
  waiting: 'ndb:text-amber-600 ndb:dark:text-amber-300',
};

export const MAIL_FILTERS = ['all', 'attachments'];
export const MAIL_DETAIL_TABS = ['preview', 'message', 'source'];
export const PENDING_MAIL_STATUSES = ['queued', 'delayed', 'processing', 'waiting'];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value : isObject(value) ? Object.values(value) : []);
const text = (value) => (typeof value === 'string' ? value : null);
const filled = (value) => (typeof value === 'string' && value !== '' ? value : null);
const isNumeric = (value) =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));

/** PHP class_basename / basename for namespaced classes and paths. */
export const basename = (value) => String(value).replaceAll('\\', '/').split('/').pop();

export const plural = (word, count) => (Math.abs(Number(count)) === 1 ? word : `${word}s`);

export const formatNumber = (value) => Number(value).toLocaleString('en-US');

/** Byte sizes as the former Blade view printed them (number_format with two decimals). */
export function formatMailBytes(bytes) {
  const decimals = (value) =>
    value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (bytes >= 1024 * 1024) return `${decimals(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${decimals(bytes / 1024)} KB`;

  return `${formatNumber(bytes)} B`;
}

/** Same-origin mail routes derived from the API base injected with the bar. */
export function mailRoutes(apiBase = '/__newdebugbar/api') {
  const root = `${String(apiBase)
    .replace(/\/+$/, '')
    .replace(/\/api$/, '')}/mail`;
  const message = (profileId, index) => `${root}/${encodeURIComponent(profileId)}/${index}`;

  return {
    preview: (profileId, index, format) => `${message(profileId, index)}/${format}`,
    attachment: (profileId, index, attachment) => `${message(profileId, index)}/attachment/${attachment}`,
  };
}

function presentAttachment(attachment, attachmentIndex, index, profileId, routes) {
  const value = isObject(attachment) ? attachment : {};
  const sizeBytes = isNumeric(value.size_bytes) ? Math.max(0, Math.trunc(Number(value.size_bytes))) : null;

  return {
    name: filled(value.name) ?? `Attachment ${attachmentIndex + 1}`,
    content_type: text(value.content_type) ?? 'application/octet-stream',
    disposition: text(value.disposition) ?? 'attachment',
    content_id: text(value.content_id),
    size_bytes: sizeBytes,
    size_label: sizeBytes === null ? 'Size unavailable' : formatMailBytes(sizeBytes),
    download_url:
      typeof value.body_base64 === 'string' ? routes.attachment(profileId, index, attachmentIndex) : null,
  };
}

function deliveryLabel(item, mailer, transport) {
  if (mailer !== null && transport !== null && mailer !== transport) return `${mailer} via ${transport}`;
  if (mailer === null && transport === null && item.connection !== null && item.connection !== undefined) {
    return `${item.connection} on ${item.queue || 'default queue'}`;
  }

  return mailer ?? transport ?? 'Unavailable';
}

function attachmentSummaryLabel(count, downloadable) {
  if (count === 0) return 'None';
  if (downloadable === count) return `${count} available`;
  if (downloadable > 0) return `${downloadable} of ${count} available`;

  return `${count} not retained`;
}

/** Turns captured mail items into the message rows and details the inspector renders. */
export function presentMailMessages(items, profileId, routes = mailRoutes()) {
  return list(items).map((rawItem, index) => {
    const item = isObject(rawItem) ? rawItem : {};
    const preview = isObject(item.preview) ? item.preview : {};
    const attachments = list(preview.attachments).map((attachment, attachmentIndex) =>
      presentAttachment(attachment, attachmentIndex, index, profileId, routes),
    );
    const to = list(preview.to);
    const cc = list(preview.cc);
    const bcc = list(preview.bcc);
    const from = list(preview.from);
    const replyTo = list(preview.reply_to);
    const callsite = isObject(item.callsite) ? item.callsite : null;
    const stack = list(item.stack);
    const source = text(item.source);
    const mailer = filled(item.mailer);
    const transport = filled(item.transport);
    const status = String(item.status ?? 'sent');
    const statusLabel = STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
    const subject = filled(preview.subject) ?? (source === null ? '(No subject)' : basename(source));
    const hasHtml = typeof preview.html === 'string';
    const hasText = typeof preview.text === 'string';
    const isOrigin = Boolean(item.is_origin);
    const relatedId = isOrigin ? item.worker_profile_id : item.origin_profile_id;
    const relatedInspector = isOrigin && status === 'sent' ? 'mail' : 'queue';
    const attachmentCount = Math.trunc(Number(item.attachment_count ?? attachments.length)) || 0;
    const downloadable = attachments.filter((attachment) => attachment.download_url !== null).length;
    const recipientCount = Number(item.recipient_count ?? 0);

    return {
      execution: index + 1,
      subject,
      from,
      to,
      cc,
      bcc,
      reply_to: replyTo,
      sender: text(preview.sender),
      return_path: text(preview.return_path),
      date: text(preview.date),
      primary_recipient:
        to[0] ??
        cc[0] ??
        bcc[0] ??
        (recipientCount > 0
          ? `${recipientCount} ${plural('recipient', recipientCount)}`
          : 'Recipient resolved by worker'),
      status,
      status_label: statusLabel,
      status_text_class: STATUS_TEXT_CLASSES[status] ?? 'ndb:text-zinc-600 ndb:dark:text-zinc-300',
      duration_label: formatDuration(item.duration_ms ?? 0),
      mailer,
      transport,
      delivery_label: deliveryLabel(item, mailer, transport),
      transport_message_id: item.transport_message_id ?? null,
      connection: item.connection ?? null,
      queue: item.queue ?? null,
      job_id: item.job_id ?? null,
      delay_seconds: item.delay_seconds ?? null,
      lifecycle: item.lifecycle ?? null,
      related_profile_id: typeof relatedId === 'string' && relatedId !== profileId ? relatedId : null,
      related_inspector: relatedInspector,
      related_label: isOrigin
        ? relatedInspector === 'mail'
          ? 'Open worker preview'
          : 'Open failed worker'
        : 'Open request',
      source,
      callsite,
      callsite_label: callsite === null ? 'Source unavailable' : `${callsite.file}:${callsite.line}`,
      callsite_short_label: callsite === null ? 'Unavailable' : `${basename(callsite.file)}:${callsite.line}`,
      stack,
      attachments,
      attachment_count: attachmentCount,
      attachment_summary_label: attachmentSummaryLabel(attachmentCount, downloadable),
      attachment_bodies_omitted: Math.trunc(Number(preview.attachments_omitted ?? 0)) || 0,
      attachment_metadata_omitted: Math.trunc(Number(preview.attachment_metadata_omitted ?? 0)) || 0,
      addresses_omitted: Math.trunc(Number(preview.addresses_omitted ?? 0)) || 0,
      truncated: Boolean(preview.truncated),
      has_html: hasHtml,
      has_text: hasText,
      html_url: hasHtml ? routes.preview(profileId, index, 'html') : null,
      text_url: hasText ? routes.preview(profileId, index, 'text') : null,
      eml_url: hasHtml || hasText ? routes.preview(profileId, index, 'eml') : null,
      search: [
        subject,
        ...from,
        ...to,
        ...cc,
        ...bcc,
        source,
        callsite?.file,
        ...attachments.map((attachment) => attachment.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };
  });
}

export function mailFilterOptions(messages) {
  return [
    ['all', 'All', messages.length],
    ['attachments', 'Attachments', messages.filter((message) => message.attachment_count > 0).length],
  ];
}

export function filterMailMessages(messages, filter, search) {
  const query = String(search ?? '')
    .toLowerCase()
    .trim();

  return messages.filter(
    (message) =>
      (filter !== 'attachments' || message.attachment_count > 0) &&
      (query === '' || message.search.includes(query)),
  );
}

export function mailHasSource(message) {
  return Boolean(message?.source || message?.callsite?.file || message?.stack?.length);
}

/** The preview format a message supports, keeping the requested one when it exists. */
export function mailPreviewFormat(message, requested) {
  if (requested === 'text') return message?.has_text ? 'text' : 'html';

  return message?.has_html || !message?.has_text ? 'html' : 'text';
}

export function mailPreviewUrl(message, format) {
  if (!message) return null;

  return format === 'text' ? message.text_url : message.html_url;
}

export function formatMailAddresses(addresses) {
  return Array.isArray(addresses) && addresses.length > 0 ? addresses.join(', ') : '—';
}

/** The list row's right-hand activity text, or null when the row shows none. */
export function mailListActivity(message) {
  if (['sent', 'failed'].includes(message.status)) return message.duration_label;
  if (message.delay_seconds > 0) return `${message.delay_seconds} s delay`;

  return null;
}

export function mailDurationFact(message) {
  if (message.status === 'sent') return message.duration_label;
  if (message.delay_seconds > 0) return `${message.delay_seconds} s delay`;

  return message.status_label;
}

export function mailAddressFields(message) {
  return [
    ['From', message.from],
    ['To', message.to],
    ['CC', message.cc],
    ['BCC', message.bcc],
    ['Reply to', message.reply_to],
  ].filter(([label, addresses]) => addresses.length > 0 || ['From', 'To'].includes(label));
}

export function mailDeliveryFields(message) {
  return [
    ['Sender', message.sender],
    ['Return path', message.return_path],
    ['Date', message.date],
    ['Message ID', message.transport_message_id],
    ['Default mailer', message.mailer],
    ['Transport', message.transport],
    ['Connection', message.connection],
    ['Queue', message.queue],
    ['Job ID', message.job_id],
    ['Delay seconds', message.delay_seconds],
  ].filter(([, value]) => value);
}

export function mailBounded(message) {
  return (
    message.truncated ||
    message.addresses_omitted > 0 ||
    message.attachment_bodies_omitted > 0 ||
    message.attachment_metadata_omitted > 0
  );
}
