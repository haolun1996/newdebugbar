/** Pure helpers for the events inspector. */

const SOURCES = ['all', 'application', 'framework'];

const number = (value) => Number(value).toLocaleString('en-US');

/** Application events first when the request dispatched any. */
export function defaultEventSource(groups = []) {
  return groups.some((event) => event.source === 'application') ? 'application' : 'all';
}

/** The initially selected event: the first application event, else the first event. */
export function defaultEventSelection(groups = []) {
  return (groups.find((event) => event.source === 'application') ?? groups[0])?.id ?? null;
}

/** Events that match the source filter and search, plus the dispatches behind them. */
export function filterEvents(groups = [], { source = 'all', search = '' } = {}) {
  const origin = SOURCES.includes(source) ? source : 'all';
  const needle = String(search).toLowerCase().trim();
  const visible = groups.filter(
    (event) =>
      (origin === 'all' || event.source === origin) &&
      (needle === '' || String(event.search ?? '').includes(needle)),
  );

  return {
    visible,
    dispatches: visible.reduce((count, event) => count + (Number(event.occurrence_count ?? 0) || 0), 0),
  };
}

export function eventSummaryText(groupCount, dispatchCount) {
  if (groupCount === 0) return 'No events';

  const events = `${groupCount} ${groupCount === 1 ? 'event' : 'events'}`;

  return dispatchCount === groupCount ? events : `${events}, ${dispatchCount} dispatches`;
}

export function eventListenerActivity(event) {
  const completed = Number(event.completed_listener_count ?? 0);
  const queued = Number(event.queued_listener_count ?? 0);

  if (Number(event.listener_count ?? 0) === 0) return 'No listeners';
  if (completed > 0 && queued > 0) return `${number(completed)} completed, ${number(queued)} queued`;
  if (queued > 0) return `${number(queued)} queued`;

  return `${number(completed)} completed`;
}

export function eventOrigin(event) {
  if (event.source !== 'application') return 'Framework';

  return event.broadcast ? 'Application broadcast' : 'Application';
}

export function eventSequence(event) {
  return event.first_sequence === event.last_sequence
    ? `#${event.first_sequence}`
    : `#${event.first_sequence}–${event.last_sequence}`;
}

/** Count phrases such as `1 extra registration needs review.` */
export const countPhrase = (count, singular, pluralPhrase) =>
  `${count}${count === 1 ? singular : pluralPhrase}`;

export const sourceLabel = (source) => (source ? `${source.file}:${source.line}` : '');
