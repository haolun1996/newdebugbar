import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareHttpClientRequests,
  formatHttpClientEvidence,
  httpClientBodyTruncated,
  httpClientContentTypes,
  httpClientFilterOptions,
  httpClientHeaderCount,
  httpClientView,
  matchesHttpClientRequest,
  nextHttpClientSort,
  normalizeHttpClientRequests,
} from '../../resources/js/inspectors/http-client.js';

const requests = normalizeHttpClientRequests([
  { execution: 1, duration_ms: 12, failed: false, slow: false, search: 'get api.example.test 200' },
  { execution: 2, duration_ms: '319.53', failed: false, slow: true, search: 'get api.slow.test 200' },
  { execution: 3, duration_ms: 68.44, failed: true, slow: false, search: 'delete api.error.test 503' },
  { execution: 4, duration_ms: null, failed: true, slow: false, search: 'post api.missing.test failed' },
]);
const order = (view) => view.rows.map((row) => row.item.execution);
const visible = (view) => view.rows.filter((row) => row.visible).map((row) => row.item.execution);

test('HTTP client normalizes source and evidence flags', () => {
  const [full, sparse, unnumbered, keyed] = normalizeHttpClientRequests([
    {
      execution: 1,
      callsite: { file: ' app/Services/Trips.php ', line: '42' },
      stack: { 0: { file: 'app/A.php', line: 3 } },
      request: { headers: { accept: ['json'] }, body: 'raw' },
      response: { headers: {}, body: { ok: true } },
    },
    { execution: 2, callsite: 'invalid', stack: null, request: null, response: [] },
    { execution: 3, callsite: { file: 'routes/web.php', line: '' }, request: { body: '' } },
    { execution: 4, callsite: { file: 'routes/api.php', line: null }, stack: [] },
  ]);

  assert.equal(full.callsite_label, 'app/Services/Trips.php:42');
  assert.deepEqual(full.stack, [{ file: 'app/A.php', line: 3 }]);
  assert.equal(full.has_source, true);
  assert.deepEqual(
    [full.request_has_headers, full.request_has_body, full.response_has_headers, full.response_has_body],
    [true, true, false, true],
  );
  assert.equal(sparse.callsite_label, null);
  assert.deepEqual(sparse.stack, []);
  assert.equal(sparse.has_source, false);
  assert.equal(sparse.request_has_body, false);
  assert.equal(unnumbered.callsite_label, 'routes/web.php');
  assert.equal(unnumbered.request_has_body, false);
  assert.equal(keyed.callsite_label, 'routes/api.php');
  assert.equal(keyed.has_source, true);
  assert.deepEqual(normalizeHttpClientRequests(null), []);
  assert.deepEqual(
    normalizeHttpClientRequests({ first: { execution: 9 } }).map((item) => item.execution),
    [9],
  );
});

test('HTTP client filters, searches, sorts, and keeps one visible selection', () => {
  assert.deepEqual(httpClientFilterOptions(requests), [
    ['all', 'All', 4],
    ['failed', 'Failed', 2],
    ['slow', 'Slow', 1],
  ]);
  assert.equal(matchesHttpClientRequest(requests[0]), true);
  assert.equal(matchesHttpClientRequest({ execution: 5 }, { search: 'x' }), false);

  let view = httpClientView(requests, { selected: 1 });
  assert.deepEqual(order(view), [1, 2, 3, 4]);
  assert.equal(view.visibleCount, 4);
  assert.equal(view.selected, 1);

  view = httpClientView(requests, { sort: 'duration', direction: 'desc', selected: 1 });
  assert.deepEqual(order(view), [2, 3, 1, 4]);
  view = httpClientView(requests, { sort: 'duration', direction: 'asc', selected: 1 });
  assert.deepEqual(order(view), [1, 3, 2, 4]);

  view = httpClientView(requests, { filter: 'failed', selected: 1 });
  assert.deepEqual(visible(view), [3, 4]);
  assert.equal(view.selected, 3);
  view = httpClientView(requests, { filter: 'slow', selected: 3 });
  assert.equal(view.selected, 2);
  view = httpClientView(requests, { search: ' 503 ', selected: 1 });
  assert.deepEqual(visible(view), [3]);
  view = httpClientView(requests, { search: 'nothing matches' });
  assert.equal(view.visibleCount, 0);
  assert.equal(view.selected, null);
  assert.equal(httpClientView([]).selected, null);

  const tie = { execution: 9, duration_ms: 12 };
  assert.equal(compareHttpClientRequests(requests[0], tie, 'duration', 'desc') < 0, true);
  assert.equal(compareHttpClientRequests(requests[3], requests[0], 'duration', 'asc'), 1);
  assert.equal(compareHttpClientRequests({}, {}, 'duration', 'asc'), 0);
});

test('HTTP client cycles the Time sort and ignores other columns', () => {
  const off = { sort: 'execution', direction: 'asc' };
  const slowest = nextHttpClientSort(off, 'duration');
  const fastest = nextHttpClientSort(slowest, 'duration');

  assert.deepEqual(slowest, { sort: 'duration', direction: 'desc' });
  assert.deepEqual(fastest, { sort: 'duration', direction: 'asc' });
  assert.deepEqual(nextHttpClientSort(fastest, 'duration'), off);
  assert.deepEqual(nextHttpClientSort(slowest, 'status'), slowest);
});

test('HTTP client formats evidence, header counts, content types, and capture limits', () => {
  assert.equal(formatHttpClientEvidence(null), '—');
  assert.equal(formatHttpClientEvidence(undefined), '—');
  assert.equal(formatHttpClientEvidence(''), '—');
  assert.equal(formatHttpClientEvidence('raw body'), 'raw body');
  assert.equal(formatHttpClientEvidence({ ready: true }), '{\n  "ready": true\n}');
  assert.equal(httpClientHeaderCount({ accept: 'json', host: 'a', __truncated__: 3 }), 2);
  assert.equal(httpClientHeaderCount('invalid'), 0);
  assert.deepEqual(
    httpClientContentTypes({
      'Content-Type': ['application/json', 'charset=utf-8'],
      'content-type': 'text/plain',
      etag: 'x',
    }),
    [
      ['Content-Type', 'application/json, charset=utf-8'],
      ['content-type', 'text/plain'],
    ],
  );
  assert.deepEqual(httpClientContentTypes(undefined), []);
  assert.equal(httpClientBodyTruncated({ nested: '[maximum depth reached]' }), true);
  assert.equal(httpClientBodyTruncated({ items: [1], __truncated__: 4 }), true);
  assert.equal(httpClientBodyTruncated(undefined), false);
  assert.equal(httpClientBodyTruncated({ ok: true }), false);
});
