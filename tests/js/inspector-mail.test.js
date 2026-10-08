import assert from 'node:assert/strict';
import test from 'node:test';

import {
  basename,
  filterMailMessages,
  formatMailAddresses,
  formatMailBytes,
  mailAddressFields,
  mailBounded,
  mailDeliveryFields,
  mailDurationFact,
  mailFilterOptions,
  mailHasSource,
  mailListActivity,
  mailPreviewFormat,
  mailPreviewUrl,
  mailRoutes,
  presentMailMessages,
} from '../../resources/js/inspectors/mail.js';
import { createMailPreviewFrame } from '../../resources/js/inspectors/mail-preview.js';

const routes = mailRoutes('https://app.test/__newdebugbar/api/');

test('mail routes follow the injected API base and fall back to the package path', () => {
  assert.equal(routes.preview('a b', 0, 'html'), 'https://app.test/__newdebugbar/mail/a%20b/0/html');
  assert.equal(routes.attachment('p', 2, 1), 'https://app.test/__newdebugbar/mail/p/2/attachment/1');
  assert.equal(mailRoutes().preview('p', 1, 'eml'), '/__newdebugbar/mail/p/1/eml');
});

test('mail messages present previews, attachments, delivery, and related profiles', () => {
  const [rich, queued, failed, minimal] = presentMailMessages(
    [
      {
        status: 'sent',
        mailer: 'smtp',
        transport: 'log',
        duration_ms: 12.5,
        transport_message_id: 'id@example.test',
        is_origin: true,
        worker_profile_id: 'worker',
        source: 'App\\Mail\\Receipt',
        callsite: { file: 'app/Http/Controllers/OrderController.php', line: 42 },
        stack: [{ file: 'a.php', line: 1 }],
        lifecycle: 'after_response',
        preview: {
          subject: 'Payment receipt',
          from: ['shop@example.test'],
          to: ['alex@example.test', 'sam@example.test'],
          cc: [],
          bcc: [],
          reply_to: ['help@example.test'],
          sender: 'sender@example.test',
          date: 'Mon',
          html: '<p>Hi</p>',
          text: 'Hi',
          truncated: true,
          attachments: [
            { name: 'receipt.pdf', content_type: 'application/pdf', size_bytes: 2048, body_base64: 'AA==' },
            { size_bytes: '3145728' },
            'invalid',
          ],
          attachments_omitted: 1,
        },
      },
      {
        status: 'delayed',
        delay_seconds: 30,
        connection: 'redis',
        queue: null,
        recipient_count: 2,
        origin_profile_id: 'origin',
        source: 'App\\Mail\\Welcome',
      },
      { status: 'failed', mailer: 'ses', recipient_count: 1, is_origin: true, worker_profile_id: 'self' },
      'not an item',
    ],
    'self',
    routes,
  );

  assert.equal(rich.execution, 1);
  assert.equal(rich.subject, 'Payment receipt');
  assert.equal(rich.status_label, 'Sent');
  assert.equal(rich.delivery_label, 'smtp via log');
  assert.equal(rich.duration_label, '12.5 ms');
  assert.equal(rich.primary_recipient, 'alex@example.test');
  assert.equal(rich.related_profile_id, 'worker');
  assert.equal(rich.related_inspector, 'mail');
  assert.equal(rich.related_label, 'Open worker preview');
  assert.equal(rich.callsite_label, 'app/Http/Controllers/OrderController.php:42');
  assert.equal(rich.callsite_short_label, 'OrderController.php:42');
  assert.equal(rich.html_url, 'https://app.test/__newdebugbar/mail/self/0/html');
  assert.equal(rich.text_url, 'https://app.test/__newdebugbar/mail/self/0/text');
  assert.equal(rich.eml_url, 'https://app.test/__newdebugbar/mail/self/0/eml');
  assert.equal(rich.attachment_count, 3);
  assert.equal(rich.attachment_summary_label, '1 of 3 available');
  assert.deepEqual(
    rich.attachments.map(({ name, content_type, size_label, download_url }) => [
      name,
      content_type,
      size_label,
      download_url,
    ]),
    [
      [
        'receipt.pdf',
        'application/pdf',
        '2.00 KB',
        'https://app.test/__newdebugbar/mail/self/0/attachment/0',
      ],
      ['Attachment 2', 'application/octet-stream', '3.00 MB', null],
      ['Attachment 3', 'application/octet-stream', 'Size unavailable', null],
    ],
  );
  assert.ok(rich.search.includes('receipt.pdf') && rich.search.includes('ordercontroller'));
  assert.equal(mailBounded(rich), true);
  assert.equal(mailHasSource(rich), true);

  assert.equal(queued.subject, 'Welcome');
  assert.equal(queued.status_label, 'Delayed');
  assert.equal(queued.delivery_label, 'redis on default queue');
  assert.equal(queued.primary_recipient, '2 recipients');
  assert.equal(queued.related_profile_id, 'origin');
  assert.equal(queued.related_label, 'Open request');
  assert.equal(queued.attachment_summary_label, 'None');
  assert.equal(queued.eml_url, null);
  assert.equal(queued.callsite_short_label, 'Unavailable');
  assert.equal(mailListActivity(queued), '30 s delay');
  assert.equal(mailDurationFact(queued), '30 s delay');

  assert.equal(failed.subject, '(No subject)');
  assert.equal(failed.primary_recipient, '1 recipient');
  assert.equal(failed.delivery_label, 'ses');
  assert.equal(failed.related_profile_id, null);
  assert.equal(failed.related_label, 'Open failed worker');
  assert.equal(mailListActivity(failed), failed.duration_label);
  assert.equal(mailDurationFact(failed), 'Failed');

  assert.equal(minimal.status, 'sent');
  assert.equal(minimal.primary_recipient, 'Recipient resolved by worker');
  assert.equal(minimal.delivery_label, 'Unavailable');
  assert.equal(minimal.callsite_label, 'Source unavailable');
  assert.equal(mailHasSource(minimal), false);
  assert.equal(mailBounded(minimal), false);

  const [custom, waiting, retained, pending] = presentMailMessages(
    {
      a: { status: 'custom', mailer: 'smtp', transport: 'smtp', attachment_count: 1 },
      b: { status: 'waiting', transport: 'log' },
      c: { preview: { attachments: [{ body_base64: 'AA==', size_bytes: 10 }] } },
      d: { status: 'queued' },
    },
    'self',
  );
  assert.equal(custom.status_label, 'Custom');
  assert.equal(custom.status_text_class, 'ndb:text-zinc-600 ndb:dark:text-zinc-300');
  assert.equal(custom.delivery_label, 'smtp');
  assert.equal(custom.attachment_summary_label, '1 not retained');
  assert.equal(waiting.delivery_label, 'log');
  assert.equal(waiting.status_label, 'Waiting for worker');
  assert.equal(retained.attachment_summary_label, '1 available');
  assert.equal(retained.attachments[0].size_label, '10 B');
  assert.equal(mailListActivity(pending), null);
  assert.equal(mailDurationFact(pending), 'Queued');
  assert.equal(mailDurationFact(retained), retained.duration_label);
  assert.deepEqual(presentMailMessages('invalid', 'self'), []);
});

test('mail filters, formats, and detail fields follow the selected message', () => {
  const messages = [
    { execution: 1, attachment_count: 0, search: 'welcome taylor' },
    { execution: 2, attachment_count: 1, search: 'receipt alex invoice' },
    { execution: 3, attachment_count: 0, search: 'plain text morgan' },
  ];

  assert.deepEqual(mailFilterOptions(messages), [
    ['all', 'All', 3],
    ['attachments', 'Attachments', 1],
  ]);
  assert.deepEqual(
    filterMailMessages(messages, 'attachments', '').map((message) => message.execution),
    [2],
  );
  assert.deepEqual(
    filterMailMessages(messages, 'all', '  PLAIN text ').map((message) => message.execution),
    [3],
  );
  assert.equal(filterMailMessages(messages, 'all', null).length, 3);

  const both = { has_html: true, has_text: true, html_url: '/h', text_url: '/t' };
  const textOnly = { has_html: false, has_text: true, html_url: null, text_url: '/t' };
  const htmlOnly = { has_html: true, has_text: false, html_url: '/h', text_url: null };
  assert.equal(mailPreviewFormat(both, 'html'), 'html');
  assert.equal(mailPreviewFormat(both, 'text'), 'text');
  assert.equal(mailPreviewFormat(textOnly, 'html'), 'text');
  assert.equal(mailPreviewFormat(htmlOnly, 'text'), 'html');
  assert.equal(mailPreviewFormat(null, 'html'), 'html');
  assert.equal(mailPreviewUrl(both, 'text'), '/t');
  assert.equal(mailPreviewUrl(both, 'html'), '/h');
  assert.equal(mailPreviewUrl(null, 'html'), null);

  assert.equal(
    formatMailAddresses(['one@example.test', 'two@example.test']),
    'one@example.test, two@example.test',
  );
  assert.equal(formatMailAddresses([]), '—');
  assert.equal(formatMailAddresses(null), '—');
  assert.equal(formatMailBytes(1_500_000), '1.43 MB');
  assert.equal(formatMailBytes(1_048_575), '1,024.00 KB');
  assert.equal(formatMailBytes(512), '512 B');
  assert.equal(basename('App\\Mail\\Receipt'), 'Receipt');

  const detail = {
    from: ['a@example.test'],
    to: [],
    cc: ['c@example.test'],
    bcc: [],
    reply_to: [],
    sender: null,
    return_path: '',
    date: 'Mon',
    transport_message_id: 'id',
    mailer: 'smtp',
    transport: null,
    connection: null,
    queue: null,
    job_id: 7,
    delay_seconds: 0,
  };
  assert.deepEqual(
    mailAddressFields(detail).map(([label]) => label),
    ['From', 'To', 'CC'],
  );
  assert.deepEqual(mailDeliveryFields(detail), [
    ['Date', 'Mon'],
    ['Message ID', 'id'],
    ['Default mailer', 'smtp'],
    ['Job ID', 7],
  ]);
});

function withPreviewGlobals(callback) {
  const originals = {
    HTMLIFrameElement: globalThis.HTMLIFrameElement,
    ResizeObserver: globalThis.ResizeObserver,
    window: globalThis.window,
  };
  const listeners = new Map();
  const observers = [];

  class PreviewFrame {}
  class PreviewResizeObserver {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observers.push(this);
    }

    observe(target) {
      this.target = target;
    }

    disconnect() {
      this.disconnected = true;
    }
  }

  globalThis.HTMLIFrameElement = PreviewFrame;
  globalThis.ResizeObserver = PreviewResizeObserver;
  globalThis.window = {
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    requestAnimationFrame: (callback) => callback(),
  };

  try {
    callback({ PreviewFrame, listeners, observers });
  } finally {
    for (const [name, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[name];
      else globalThis[name] = value;
    }
  }
}

const styleTarget = (values = {}) => ({
  ...values,
  setProperty(property, value, priority = '') {
    this[property] = value;
    this[`${property}Priority`] = priority;
  },
});

function previewFrame(PreviewFrame, canvas, detail = null) {
  const frame = new PreviewFrame();
  frame.style = styleTarget({ height: '640px' });
  frame.closest = (selector) => {
    if (selector === '[data-ndb-mail-preview-canvas]') return canvas;
    if (selector === '[data-ndb-mail-detail]') return detail;

    return null;
  };
  frame.contentDocument = null;
  frame.contentWindow = {
    messages: [],
    postMessage(message) {
      this.messages.push(message);
    },
  };
  Object.defineProperty(frame, 'offsetHeight', {
    get: () => (frame.style.height === '20rem' ? 320 : Number.parseFloat(frame.style.height)),
  });

  return frame;
}

test('mail preview keeps desktop and mobile viewport widths inside a narrow canvas', () => {
  withPreviewGlobals(({ PreviewFrame }) => {
    const canvas = { clientWidth: 320, style: styleTarget() };
    const frame = previewFrame(PreviewFrame, canvas);
    const settings = { format: 'html', viewport: 'desktop' };
    const preview = createMailPreviewFrame(frame, { settings: () => settings });

    preview.layout();
    assert.equal(frame.style.width, '1024px');
    assert.equal(frame.style.transform, 'translateX(-50%) scale(0.3125)');
    assert.equal(canvas.style.height, '200px');
    assert.equal(canvas.style.heightPriority, 'important');

    settings.viewport = 'mobile';
    preview.reset();
    assert.equal(frame.style.width, '375px');
    assert.equal(frame.style.transform, 'translateX(-50%) scale(0.8533333333333334)');
    assert.equal(canvas.style.height, '274px');
    assert.deepEqual(frame.contentWindow.messages.at(-1), { type: 'newdebugbar:measure-mail-preview' });

    settings.format = 'text';
    preview.reset();
    assert.equal(frame.style.width, '320px');
    assert.equal(frame.style.transform, 'translateX(-50%) scale(1)');
    assert.equal(canvas.style.height, '320px');

    canvas.clientWidth = 1200;
    frame.style.height = '640px';
    Object.assign(settings, { format: 'html', viewport: 'desktop' });
    preview.layout();
    assert.equal(frame.style.transform, 'translateX(-50%) scale(1)');
    assert.equal(canvas.style.height, '640px');

    canvas.clientWidth = 0;
    frame.style.width = 'unchanged';
    preview.layout();
    assert.equal(frame.style.width, 'unchanged');

    canvas.clientWidth = 512;
    const defaults = createMailPreviewFrame(frame);
    defaults.connect();
    assert.equal(frame.style.transform, 'translateX(-50%) scale(0.5)');
    defaults.disconnect();

    frame.closest = () => null;
    preview.layout();
    const detached = createMailPreviewFrame({});
    detached.layout();
    detached.reset();
    detached.resize();
    detached.connect();
    detached.disconnect();
  });
});

test('mail preview follows canvas resizes and reported heights, and cleans up its observers', () => {
  withPreviewGlobals(({ PreviewFrame, listeners, observers }) => {
    const scrolls = [];
    const canvas = { clientWidth: 640, style: styleTarget() };
    const detail = { clientHeight: 500, scrollBy: ({ top }) => scrolls.push(top) };
    const frame = previewFrame(PreviewFrame, canvas, detail);
    frame.style.height = '320px';
    const pendingFrames = [];
    let active = false;
    const preview = createMailPreviewFrame(frame, {
      isActive: () => active,
      settings: () => ({ format: 'html', viewport: 'desktop' }),
      nextFrame: (callback) => pendingFrames.push(callback),
    });
    const flush = () => {
      while (pendingFrames.length) pendingFrames.shift()();
    };

    preview.connect();
    preview.resize();
    assert.equal(listeners.has('message'), false, 'hidden previews do not listen');
    assert.equal(observers.length, 0);

    active = true;
    preview.connect();
    preview.connect();
    flush();
    assert.equal(observers.length, 2);
    assert.equal(observers[0].disconnected, true, 'reconnecting replaces the previous observer');
    assert.equal(observers[1].target, canvas);
    assert.equal(frame.style.width, '1024px');
    assert.equal(frame.style.transform, 'translateX(-50%) scale(0.625)');

    canvas.clientWidth = 320;
    observers[1].callback();
    observers[1].callback();
    flush();
    assert.equal(frame.style.transform, 'translateX(-50%) scale(0.3125)');

    const handleMessage = listeners.get('message');
    handleMessage({ source: {}, data: { type: 'newdebugbar:mail-preview-height', height: 700 } });
    handleMessage({ source: frame.contentWindow, data: undefined });
    handleMessage({
      source: frame.contentWindow,
      data: { type: 'newdebugbar:mail-preview-height', height: Number.POSITIVE_INFINITY },
    });
    for (const [deltaY, deltaMode] of [
      [2, 1],
      [0.5, 2],
      [3, 0],
    ]) {
      handleMessage({
        source: frame.contentWindow,
        data: { type: 'newdebugbar:mail-preview-scroll', deltaY, deltaMode },
      });
    }
    assert.deepEqual(scrolls, [32, 250, 3]);

    frame.closest = (selector) => (selector === '[data-ndb-mail-preview-canvas]' ? canvas : null);
    handleMessage({
      source: frame.contentWindow,
      data: { type: 'newdebugbar:mail-preview-scroll', deltaY: 10, deltaMode: 0 },
    });
    assert.deepEqual(scrolls, [32, 250, 3]);

    handleMessage({
      source: frame.contentWindow,
      data: { type: 'newdebugbar:mail-preview-height', height: 480 },
    });
    assert.equal(frame.style.height, '480px');
    assert.equal(canvas.style.height, '150px');

    const body = { scrollHeight: 900, offsetHeight: 900 };
    frame.contentDocument = { body, documentElement: { scrollHeight: 900, offsetHeight: 900 } };
    preview.resize();
    assert.equal(observers[2].target, body);
    active = false;
    flush();
    assert.equal(frame.style.height, '480px', 'a hidden preview ignores late measurements');

    active = true;
    preview.resize();
    observers[3].callback();
    flush();
    assert.equal(frame.style.height, '900px');
    preview.resize();
    flush();
    assert.equal(frame.style.height, '900px');

    Object.defineProperty(frame, 'contentDocument', {
      get() {
        throw new Error('cross-origin');
      },
    });
    preview.resize();

    preview.disconnect();
    assert.equal(listeners.has('message'), false);
    assert.ok(observers.every((observer) => observer.disconnected));
    observers[1].callback();
    flush();
  });
});
