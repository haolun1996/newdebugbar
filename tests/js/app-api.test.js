import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, createApi } from '../../resources/js/app/api.js';

const recorder = (responses) => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    const body = responses.shift() ?? {};

    return { ok: body.status === undefined, status: body.status ?? 200, json: async () => body };
  };

  return { calls, fetcher };
};

test('requests every profile endpoint with JSON headers and unwraps their payloads', async () => {
  const { calls, fetcher } = recorder([
    { summary: { id: 'a' } },
    { summary: { id: 'b' } },
    { summary: { id: 'a' }, related_profiles: [] },
    { profiles: [{ id: 'c' }] },
    {},
    { profile: {} },
    { data: { name: 'Ada' } },
    {},
    { explain: [] },
  ]);
  const api = createApi('/__newdebugbar/api/', fetcher);

  assert.deepEqual(await api.summary('a/1'), { id: 'a' });
  assert.deepEqual(await api.notice('b'), { id: 'b' });
  assert.deepEqual(await api.related('a'), { summary: { id: 'a' }, related_profiles: [] });
  assert.deepEqual(await api.recent(), [{ id: 'c' }]);
  assert.deepEqual(await api.recent(), []);
  assert.deepEqual(await api.inspector('a', 'timeline', { filter: 'queries', limit: 50 }), { profile: {} });
  assert.deepEqual(await api.viewData('a', '3'), { name: 'Ada' });
  assert.deepEqual(await api.viewData('a', 4), {});
  assert.deepEqual(await api.explainQuery('a', 2), { explain: [] });

  assert.deepEqual(
    calls.map(({ url }) => url),
    [
      '/__newdebugbar/api/profiles/a%2F1',
      '/__newdebugbar/api/profiles/b/notice',
      '/__newdebugbar/api/profiles/a/related',
      '/__newdebugbar/api/recent',
      '/__newdebugbar/api/recent',
      '/__newdebugbar/api/profiles/a/inspectors/timeline?timeline_filter=queries&timeline_limit=50',
      '/__newdebugbar/api/profiles/a/views/3',
      '/__newdebugbar/api/profiles/a/views/4',
      '/__newdebugbar/api/profiles/a/queries/2/explain',
    ],
  );
  assert.deepEqual(calls[0].options, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'X-NewDebugBar': '1' },
  });
  assert.equal(calls.at(-1).options.method, 'POST');
});

test('reports failed responses as API errors with their status', async () => {
  const { fetcher } = recorder([{ status: 404 }]);
  const api = createApi(undefined, fetcher);

  await assert.rejects(api.summary('missing'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.name, 'NewDebugBarApiError');
    assert.equal(error.status, 404);
    assert.match(error.message, /404/);

    return true;
  });
});

test('uses the window fetch by default', async () => {
  const original = globalThis.window;
  const calls = [];
  globalThis.window = {
    fetch: async (url) => {
      calls.push(url);

      return { ok: true, json: async () => ({ profiles: [] }) };
    },
  };

  try {
    assert.deepEqual(await createApi().recent(), []);
    assert.deepEqual(calls, ['/__newdebugbar/api/recent']);
  } finally {
    globalThis.window = original;
  }
});
