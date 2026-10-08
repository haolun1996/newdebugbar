/** Reads stored profiles from the package's local JSON endpoints. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'NewDebugBarApiError';
    this.status = status;
  }
}

export function createApi(base = '/__newdebugbar/api', fetcher = (...args) => window.fetch(...args)) {
  const root = String(base).replace(/\/+$/, '');

  const request = async (path, { method = 'GET', query = null } = {}) => {
    const search = query
      ? `?${new URLSearchParams(
          Object.entries(query).filter(([, value]) => value !== null && value !== undefined),
        )}`
      : '';
    const response = await fetcher(`${root}${path}${search}`, {
      method,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'X-NewDebugBar': '1' },
    });

    if (!response.ok)
      throw new ApiError(response.status, `New Debug Bar request failed (${response.status}).`);

    return response.json();
  };

  const profile = (id) => `/profiles/${encodeURIComponent(id)}`;

  return {
    summary: (id) => request(profile(id)).then((data) => data.summary),
    notice: (id) => request(`${profile(id)}/notice`).then((data) => data.summary),
    related: (id) => request(`${profile(id)}/related`),
    recent: () => request('/recent').then((data) => data.profiles ?? []),
    inspector: (id, inspector, { filter = null, search = null, limit = null } = {}) =>
      request(`${profile(id)}/inspectors/${encodeURIComponent(inspector)}`, {
        query: { timeline_filter: filter, timeline_search: search, timeline_limit: limit },
      }),
    viewData: (id, renderOrder) =>
      request(`${profile(id)}/views/${Number(renderOrder)}`).then((data) => data.data ?? {}),
    explainQuery: (id, execution) =>
      request(`${profile(id)}/queries/${Number(execution)}/explain`, { method: 'POST' }),
  };
}
