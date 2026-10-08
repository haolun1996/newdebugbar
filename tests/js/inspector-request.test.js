import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STATUS_TEXTS,
  detailGroupCopy,
  formatBytes,
  formatRequestValue,
  requestOrigin,
  requestView,
} from '../../resources/js/ui/inspectors/request/request.js';

const payload = {
  method: 'POST',
  status: 422,
  url: 'https://example.test:8443/trips/kyoto?season=autumn',
  path: '/trips/kyoto',
  route: 'trips.show',
  action: 'App\\Http\\Controllers\\TripWorkspaceController@show',
  middleware: ['web', 'auth'],
  headers: { 'content-type': ['application/x-www-form-urlencoded'] },
  input: { title: 'Kyoto', nights: 3, private: false, note: null },
  query: { season: 'autumn' },
  session: {
    present: true,
    driver: 'file',
    key_count: 2,
    keys: ['_token', 'cart'],
    flash_keys: [],
    error_bags: [],
  },
  authentication: { guard: 'web', model: 'App\\Models\\User' },
  authenticated: true,
  content_type: 'application/json; charset=utf-8',
  request_size_bytes: 2048,
  response_size_bytes: 512,
};

test('request evidence follows the received, matched, and responded stages', () => {
  const view = requestView(payload, { profile_type: 'http', metrics: { duration_ms: 12.5 } });

  assert.equal(view.isHttp, true);
  assert.equal(view.method, 'POST');
  assert.equal(view.path, '/trips/kyoto');
  assert.equal(view.origin, 'https://example.test:8443');
  assert.equal(view.requestSize, '2.00 KB');
  assert.equal(view.actionName, 'TripWorkspaceController@show');
  assert.equal(view.actionNamespace, 'App\\Http\\Controllers');
  assert.equal(view.route, 'trips.show');
  assert.deepEqual(view.middleware, ['web', 'auth']);
  assert.equal(view.guard, 'web');
  assert.equal(view.authenticationModel, 'App\\Models\\User');
  assert.equal(view.statusLabel, '422 Unprocessable Content');
  assert.equal(view.tone, 'error');
  assert.equal(view.failed, true);
  assert.equal(view.succeeded, false);
  assert.equal(view.contentType, 'application/json; charset=utf-8');
  assert.equal(view.responseSize, '512 B');
  assert.equal(view.duration, '12.5 ms');
  assert.deepEqual(
    view.detailGroups.map(({ key, label, count }) => [key, label, count]),
    [
      ['headers', 'Headers', 1],
      ['input', 'Input', 4],
      ['query', 'Query', 1],
      ['session', 'Session', 2],
    ],
  );
  assert.deepEqual(view.detailGroups[3].items, {
    started: true,
    driver: 'file',
    keys: ['_token', 'cart'],
    'flash keys': [],
    'error bags': [],
  });
});

test('missing request evidence falls back to neutral labels', () => {
  const view = requestView({ status: 599, middleware: { first: 'web' } }, undefined);

  assert.equal(view.isHttp, true);
  assert.equal(view.method, 'HTTP');
  assert.equal(view.path, '—');
  assert.equal(view.origin, '');
  assert.equal(view.requestSize, null);
  assert.equal(view.actionName, 'Closure');
  assert.equal(view.actionNamespace, '');
  assert.equal(view.route, 'Unnamed route');
  assert.deepEqual(view.middleware, ['web']);
  assert.equal(view.guard, 'unknown');
  assert.equal(view.authenticationModel, null);
  assert.equal(view.authenticationLabel, 'Guest');
  assert.equal(view.statusLabel, '599');
  assert.equal(view.tone, 'error');
  assert.equal(view.contentType, '—');
  assert.equal(view.responseSize, '0 B');
  assert.equal(view.duration, '0 µs');
  assert.deepEqual(view.detailGroups[3].items, {
    started: false,
    driver: '—',
    keys: [],
    'flash keys': [],
    'error bags': [],
  });

  assert.equal(requestView({ status: 200 }, {}).statusLabel, '200 OK');
  assert.equal(requestView({ status: 200 }, {}).tone, 'success');
  assert.equal(requestView({ status: 302, url: '/relative' }, {}).statusLabel, '302 Found');
  assert.equal(requestView({ status: 302 }, {}).tone, 'neutral');
  assert.equal(requestView({}, {}).statusLabel, '—');
  assert.equal(requestView(null, {}).path, '—');
  assert.equal(requestView({ authenticated: true }, {}).authenticationLabel, 'Authenticated');
  assert.equal(requestView({ url: 'http://x.test/a' }, {}).path, 'http://x.test/a');
  assert.equal(STATUS_TEXTS[418], "I'm a teapot");
});

test('non-HTTP profiles show a runtime summary', () => {
  const view = requestView(
    { name: 'reports:build', exit_code: 0, path: 'artisan' },
    { profile_type: 'artisan_command', metrics: { duration_ms: 1500 } },
  );

  assert.equal(view.isHttp, false);
  assert.deepEqual(view.runtimeFacts, [
    ['Type', 'Artisan Command'],
    ['Name', 'reports:build'],
    ['Status', 0],
    ['Duration', '1.5 s'],
  ]);
  assert.deepEqual(requestView({ status: 1 }, { profile_type: 'queue_job' }).runtimeFacts.slice(0, 3), [
    ['Type', 'Queue Job'],
    ['Name', '—'],
    ['Status', 1],
  ]);
  assert.equal(requestView({}, { profile_type: 'queue_job' }).runtimeFacts[2][1], '—');
});

test('request values and sizes format like the PHP view', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1023), '1,023 B');
  assert.equal(formatBytes(1536), '1.50 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5,120.00 KB');
  assert.equal(formatRequestValue(null), 'null');
  assert.equal(formatRequestValue(undefined), 'null');
  assert.equal(formatRequestValue(true), 'true');
  assert.equal(formatRequestValue(false), 'false');
  assert.equal(formatRequestValue(3), '3');
  assert.equal(formatRequestValue(['text/html', 'https://a.test/ü']), '["text/html","https://a.test/ü"]');
  assert.equal(formatRequestValue({ a: 1 }), '{"a":1}');
  assert.equal(requestOrigin('http://user:secret@[::1]:8000/path'), 'http://[::1]:8000');
  assert.equal(requestOrigin('https://example.test'), 'https://example.test');
  assert.equal(requestOrigin('/trips'), '');
  assert.equal(
    detailGroupCopy({ accept: ['text/html'] }),
    '{\n    "accept": [\n        "text/html"\n    ]\n}',
  );
  assert.equal(detailGroupCopy({}), '{}');
});
