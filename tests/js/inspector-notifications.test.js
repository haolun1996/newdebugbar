import assert from 'node:assert/strict';
import test from 'node:test';

import {
  channelLabel,
  filterNotifications,
  formatNotificationDestinations,
  formatNotificationEvidence,
  headline,
  notificationActivity,
  notificationDelivery,
  notificationFilterOptions,
  presentNotificationGroups,
} from '../../resources/js/inspectors/notifications.js';

test('notification channel labels follow Laravel headlines with common acronyms', () => {
  assert.equal(channelLabel('profiled-sms'), 'Profiled SMS');
  assert.equal(channelLabel('mail'), 'Mail');
  assert.equal(channelLabel('vonage_mms'), 'Vonage MMS');
  assert.equal(channelLabel('webhookUrl'), 'Webhook URL');
  assert.equal(channelLabel('slack api'), 'Slack API');
  assert.equal(headline('TelegramChannel'), 'Telegram Channel');
  assert.equal(headline('already Titled words'), 'Already Titled Words');
});

test('notification destinations become readable labels', () => {
  assert.deepEqual(formatNotificationDestinations(' elise@example.test '), ['elise@example.test']);
  assert.deepEqual(formatNotificationDestinations(' '), []);
  assert.deepEqual(formatNotificationDestinations(true), ['1']);
  assert.deepEqual(formatNotificationDestinations(false), []);
  assert.deepEqual(formatNotificationDestinations(null), []);
  assert.deepEqual(formatNotificationDestinations([]), []);
  assert.deepEqual(formatNotificationDestinations({}), []);
  assert.deepEqual(formatNotificationDestinations({ type: 'App\\Models\\User', id: 7, name: 'Elise' }), [
    'Elise (User #7)',
  ]);
  assert.deepEqual(formatNotificationDestinations({ type: 'App\\Models\\User', id: '', name: 'User' }), [
    'User',
  ]);
  assert.deepEqual(formatNotificationDestinations({ type: 'App\\Models\\Team', name: ' ' }), ['Team']);
  assert.deepEqual(
    formatNotificationDestinations({
      'elise@example.test': 'Elise',
      'sam@example.test': '',
      'x@example.test': {},
    }),
    ['Elise <elise@example.test>', 'sam@example.test', 'x@example.test'],
  );
  assert.deepEqual(formatNotificationDestinations(['+32 470', ' ', 5, { nested: true }]), ['+32 470', '5']);
  assert.deepEqual(formatNotificationDestinations([{ channel: '#ops/alerts' }]), [
    '[{"channel":"#ops/alerts"}]',
  ]);
});

test('notification attempts group into logical notifications with delivery evidence', () => {
  const groups = presentNotificationGroups(
    [
      {
        group_id: 'journey',
        notification: 'App\\Notifications\\JourneyReady',
        notification_id: 'uuid-1',
        notifiable_type: 'App\\Models\\Traveler',
        notifiable_id: 4,
        notifiable_name: ' Elise Martin ',
        notification_source: { file: 'app/Notifications/JourneyReady.php', line: 12 },
        notification_data: { city: 'Kyoto' },
        routes: { mail: 'guest@example.test' },
        locale: 'fr',
        is_origin: false,
        origin_profile_id: 'origin',
        channel: 'mail',
        status: 'sent',
        duration_ms: 3,
        destination: { 'elise@example.test': 'Elise' },
        mail_message_id: 'mail-1',
        callsite: { file: 'app/Http/Controllers/TripController.php', line: 30 },
        stack: [{ file: 'a.php', line: 1 }],
      },
      {
        group_id: 'journey',
        channel: 'profiled-sms',
        status: 'failed',
        duration_ms: 2,
        destination: '+32 470',
        response_type: 'App\\Sms\\Response',
        failure_data: { reason: ' Traveler phone number is not verified. ' },
        exception_class: 'RuntimeException',
        exception_location: { file: 'app/Sms.php', line: 9 },
      },
      {
        correlation_key: 'push',
        notification: 'App\\Notifications\\Departure',
        notifiable_type: 'App\\Models\\Traveler',
        channel: 'database',
        status: 'unknown-status',
        is_origin: true,
        worker_profile_id: 'self',
        queueable: true,
        queue_name: 'notifications',
        job_id: 12,
        response: { message_id: 'abc' },
      },
      {
        notification: 'App\\Notifications\\Reminder',
        channel: 'slack',
        status: 'queued',
        delay_seconds: '30',
        connection: 'redis',
        queue: 'low',
        is_origin: true,
        worker_profile_id: 'worker',
        response: { provider: 'Slack' },
        exception_message: 'Rate limited',
      },
      'not an attempt',
    ],
    'self',
    ['mail-1'],
  );

  assert.equal(groups.length, 4);
  const [journey, departure, reminder, unknown] = groups;

  assert.equal(journey.group_id, 'journey');
  assert.equal(journey.label, 'JourneyReady');
  assert.equal(journey.status, 'partial');
  assert.equal(journey.status_label, 'Needs attention');
  assert.equal(journey.recipient_label, 'Elise Martin');
  assert.equal(journey.recipient_context_label, 'Traveler #4');
  assert.equal(journey.channel_count_label, '2 channels');
  assert.equal(journey.duration_label, '5 ms');
  assert.equal(journey.execution_mode_label, 'Synchronous');
  assert.equal(journey.related_profile_id, 'origin');
  assert.equal(journey.related_label, 'Open request');
  assert.equal(journey.callsite_short_label, 'TripController.php:30');
  assert.equal(journey.stack.length, 1);
  assert.ok(journey.search.includes('traveler phone number is not verified.'));

  const [mail, sms] = journey.deliveries;
  assert.equal(mail.mail_available, true);
  assert.equal(mail.response_summary, 'Mail message mail-1');
  assert.equal(mail.evidence_summary, 'Mail transport accepted the message.');
  assert.equal(mail.destination_label, 'Elise <elise@example.test>');
  assert.equal(mail.status_label, 'Sent to channel');
  assert.equal(sms.channel_label, 'Profiled SMS');
  assert.equal(sms.failure_message, 'Traveler phone number is not verified.');
  assert.equal(sms.evidence_summary, null);
  assert.equal(sms.response_summary, 'Response');
  assert.equal(sms.mail_available, false);

  assert.equal(departure.status, 'sent');
  assert.equal(departure.recipient_label, 'Traveler');
  assert.equal(departure.recipient_context_label, null);
  assert.equal(departure.related_profile_id, null);
  assert.equal(departure.related_inspector, 'notifications');
  assert.equal(departure.related_label, 'Open worker');
  assert.equal(departure.execution_mode_label, 'Queueable on notifications');
  assert.equal(departure.callsite_label, 'Source unavailable');
  assert.equal(departure.callsite_short_label, 'Unavailable');
  assert.equal(departure.deliveries[0].evidence_summary, 'Notification stored in the database.');
  assert.equal(departure.deliveries[0].response_summary, 'Message abc');
  assert.equal(departure.deliveries[0].destination_summary_label, 'No destination resolved');

  assert.equal(reminder.status, 'queued');
  assert.equal(reminder.delay_seconds, 30);
  assert.equal(reminder.deliveries[0].delay_seconds, 30);
  assert.equal(reminder.execution_mode_label, 'Queueable on low');
  assert.equal(reminder.related_profile_id, 'worker');
  assert.equal(reminder.deliveries[0].failure_message, 'Rate limited');
  assert.equal(reminder.deliveries[0].evidence_summary, 'Waiting for a queue worker.');
  assert.equal(reminder.deliveries[0].response_summary, 'Slack response');
  assert.equal(notificationActivity(reminder.deliveries[0], ['sent', 'failed'], 'Queued'), '30 s delay');
  assert.equal(
    notificationActivity(reminder, ['sent', 'failed', 'partial'], 'Waiting for worker'),
    '30 s delay',
  );
  assert.equal(notificationActivity(journey, ['sent', 'failed', 'partial'], 'Waiting'), '5 ms');

  assert.equal(unknown.label, 'Notification');
  assert.equal(unknown.deliveries[0].channel, 'unknown');
  assert.equal(unknown.deliveries[0].evidence_summary, 'Channel completed without throwing.');
});

test('notification group status, related inspector, and delivery evidence summaries', () => {
  const [processing, failed, sentMail, provider, waiting] = presentNotificationGroups(
    {
      a: { group_id: 'a', channel: 'slack', status: 'processing' },
      b: { group_id: 'b', channel: 'slack', status: 'failed', failure_data: { detail: 42 } },
      c: {
        group_id: 'c',
        channel: 'mail',
        status: 'sent',
        is_origin: true,
        worker_profile_id: 'worker',
        destination: ['one@example.test', 'two@example.test'],
        queue_connection: 'sync',
        notifiable_id: true,
      },
      d: { group_id: 'd', channel: 'sms', status: 'sent', response: 'ok', destination: ['a', 'b'] },
      e: { group_id: 'e', channel: 'slack', status: 'waiting', duration_ms: 2 },
    },
    'self',
    null,
  );

  assert.equal(processing.status_label, 'Processing');
  assert.equal(notificationActivity(processing, ['sent'], 'Pending'), 'Pending');
  assert.equal(processing.deliveries[0].evidence_summary, 'A queue worker is processing this notification.');
  assert.equal(failed.status, 'failed');
  assert.equal(failed.deliveries[0].failure_message, '42');
  assert.equal(sentMail.related_inspector, 'mail');
  assert.equal(sentMail.related_label, 'Open mail preview');
  assert.equal(sentMail.execution_mode_label, 'Queueable');
  assert.equal(sentMail.recipient_label, 'Notifiable #1');
  assert.equal(sentMail.deliveries[0].destination_summary_label, '2 recipients');
  assert.equal(sentMail.deliveries[0].mail_available, false);
  assert.equal(provider.deliveries[0].destination_summary_label, '2 destinations');
  assert.equal(provider.deliveries[0].evidence_summary, 'Channel returned a provider response.');
  assert.equal(provider.deliveries[0].response_summary, null);
  assert.equal(waiting.status_label, 'Waiting for worker');
  assert.equal(notificationActivity(waiting, ['sent'], 'Pending'), '2 ms');
  assert.deepEqual(presentNotificationGroups('invalid', 'self'), []);
});

test('notification filters, channel selection, and evidence formatting', () => {
  const groups = [
    {
      execution: 1,
      status: 'partial',
      search: 'journey ready profile sms',
      deliveries: [{ channel: 'mail' }, { channel: 'profiled-sms' }],
    },
    { execution: 2, status: 'sent', search: 'departure push', deliveries: [{ channel: 'push' }] },
    { execution: 3, status: 'failed', search: 'payment failure slack', deliveries: [] },
  ];

  assert.deepEqual(notificationFilterOptions(groups), [
    ['all', 'All', 3],
    ['attention', 'Needs attention', 2],
    ['sent', 'Sent', 1],
  ]);
  const executions = (filter, search) =>
    filterNotifications(groups, filter, search).map((group) => group.execution);
  assert.deepEqual(executions('all', ''), [1, 2, 3]);
  assert.deepEqual(executions('attention', null), [1, 3]);
  assert.deepEqual(executions('sent', ''), [2]);
  assert.deepEqual(executions('all', ' SLACK '), [3]);
  assert.deepEqual(executions('unknown', ''), []);

  assert.equal(notificationDelivery(groups[0], 'profiled-sms').channel, 'profiled-sms');
  assert.equal(notificationDelivery(groups[0], 'missing').channel, 'mail');
  assert.equal(notificationDelivery(groups[2], 'slack'), null);
  assert.equal(notificationDelivery(null, 'mail'), null);

  assert.equal(formatNotificationEvidence(null), 'No data was captured.');
  assert.equal(formatNotificationEvidence('', 'Nothing'), 'Nothing');
  assert.equal(formatNotificationEvidence('raw'), 'raw');
  assert.equal(formatNotificationEvidence({ city: 'Kyoto' }), '{\n  "city": "Kyoto"\n}');
});
