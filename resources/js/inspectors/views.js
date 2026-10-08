/** Pure helpers for the views inspector. */

const ORIGINS = ['application', 'all', 'framework'];

/** Application views first when the request rendered any, otherwise every view. */
export const defaultViewFilter = (groups = []) =>
  groups.some((group) => group.origin === 'application') ? 'application' : 'all';

/** View groups that match the origin filter and search, plus the renders behind them. */
export function filterViews(groups = [], { filter = 'application', search = '' } = {}) {
  const origin = ORIGINS.includes(filter) ? filter : 'all';
  const needle = String(search).toLowerCase().trim();
  const visible = groups.filter(
    (group) =>
      (origin === 'all' || group.origin === origin) &&
      (needle === '' || String(group.search ?? '').includes(needle)),
  );

  return { visible, renders: visible.reduce((count, group) => count + (Number(group.count ?? 0) || 0), 0) };
}

export const firstRenderOrder = (group) => group?.items?.[0]?.render_order ?? null;

export const findRender = (group, renderOrder) =>
  group?.items?.find((view) => Number(view.render_order) === Number(renderOrder)) ?? null;

export const viewDataIsEmpty = (data) =>
  data === null || data === undefined || typeof data !== 'object' || Object.keys(data).length === 0;

export const formatViewData = (data) => JSON.stringify(data ?? {}, null, 2);

/** Loads one render's data, ignoring answers that arrive after the request moved on. */
export function createViewDataLoader(load) {
  let request = 0;

  return {
    cancel() {
      request++;
    },
    load(renderOrder, { onLoad, onError }) {
      const order = Number(renderOrder);
      const current = ++request;

      if (!Number.isInteger(order) || order <= 0) {
        onError();

        return Promise.resolve();
      }

      return Promise.resolve()
        .then(() => load(order))
        .then(
          (data) => current === request && onLoad(data ?? {}),
          () => current === request && onError(),
        );
    },
  };
}
