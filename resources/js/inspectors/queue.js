/** Pure view logic for the Queue inspector. */

export const QUEUE_FILTERS = ['all', 'waiting', 'failed', 'completed'];

const number = (value) => Number(value).toLocaleString('en-US');

export const QUEUE_STATUS_CLASSES = {
  queued: 'ndb:bg-sky-100 ndb:text-sky-700 ndb:dark:bg-sky-950 ndb:dark:text-sky-300',
  delayed: 'ndb:bg-amber-100 ndb:text-amber-700 ndb:dark:bg-amber-950 ndb:dark:text-amber-300',
  processing: 'ndb:bg-indigo-100 ndb:text-indigo-700 ndb:dark:bg-indigo-950 ndb:dark:text-indigo-300',
  sent: 'ndb:bg-emerald-100 ndb:text-emerald-700 ndb:dark:bg-emerald-950 ndb:dark:text-emerald-300',
  completed: 'ndb:bg-emerald-100 ndb:text-emerald-700 ndb:dark:bg-emerald-950 ndb:dark:text-emerald-300',
  failed: 'ndb:bg-red-100 ndb:text-red-700 ndb:dark:bg-red-950 ndb:dark:text-red-300',
  waiting: 'ndb:bg-amber-100 ndb:text-amber-700 ndb:dark:bg-amber-950 ndb:dark:text-amber-300',
};

export const QUEUE_STATUS_FALLBACK =
  'ndb:bg-zinc-100 ndb:text-zinc-600 ndb:dark:bg-zinc-900 ndb:dark:text-zinc-300';

export function queueStatusClass(status) {
  return QUEUE_STATUS_CLASSES[status] ?? QUEUE_STATUS_FALLBACK;
}

/** The filter in effect: a group that no longer has activity falls back to all. */
export function effectiveQueueFilter(activities, filter) {
  return filter === 'all' || activities.some((activity) => activity.status_group === filter) ? filter : 'all';
}

export function matchesQueueActivity(activity, { filter = 'all', search = '' } = {}) {
  const term = String(search).toLowerCase().trim();

  return (
    (filter === 'all' || activity.status_group === filter) &&
    (term === '' || String(activity.search ?? '').includes(term))
  );
}

/** Every activity with its visibility, the visible count, and the selection kept or moved to the first visible. */
export function queueView(activities, { filter = 'all', search = '', selected = null } = {}) {
  const rows = activities.map((item) => ({ item, visible: matchesQueueActivity(item, { filter, search }) }));
  const visible = rows.filter((row) => row.visible).map((row) => row.item.execution);

  return {
    rows,
    visibleCount: visible.length,
    selected: visible.includes(selected) ? selected : (visible[0] ?? null),
  };
}

/** Job count, filter options, and the summary line (queue.blade.php). */
export function queueSummary(summary = {}, activities = [], formatDuration = String) {
  const count = activities.length;
  const groups = activities.reduce((counts, activity) => {
    counts[activity.status_group] = (counts[activity.status_group] ?? 0) + 1;

    return counts;
  }, {});
  const waiting = groups.waiting ?? 0;
  const failures = Math.trunc(Number(summary.failed_count ?? 0)) || 0;
  const parts = [`${formatDuration(Number(summary.duration_ms ?? 0))} total`];

  if (waiting > 0) parts.push(`${number(waiting)} waiting`);
  if (failures > 0) parts.push(`${number(failures)} ${failures === 1 ? 'failure' : 'failures'}`);

  return {
    count,
    countLabel: `${number(count)} ${count === 1 ? 'job' : 'jobs'}`,
    line: parts.join(', '),
    filters: [
      ['all', 'All', count],
      ['waiting', 'Waiting', waiting],
      ['failed', 'Failed', groups.failed ?? 0],
      ['completed', 'Completed', groups.completed ?? 0],
    ].filter(([key, , total]) => key === 'all' || total > 0),
  };
}

/** The badge classes for the selected activity's status in the detail header. */
export function queueDetailStatusClass(status) {
  if (status === 'failed') return 'ndb:bg-red-100 ndb:text-red-700 ndb:dark:bg-red-950 ndb:dark:text-red-300';
  if (['delayed', 'waiting'].includes(status))
    return 'ndb:bg-amber-100 ndb:text-amber-700 ndb:dark:bg-amber-950 ndb:dark:text-amber-300';
  if (status === 'processing')
    return 'ndb:bg-indigo-100 ndb:text-indigo-700 ndb:dark:bg-indigo-950 ndb:dark:text-indigo-300';
  if (status === 'queued') return 'ndb:bg-sky-100 ndb:text-sky-700 ndb:dark:bg-sky-950 ndb:dark:text-sky-300';
  if (['sent', 'completed'].includes(status))
    return 'ndb:bg-emerald-100 ndb:text-emerald-700 ndb:dark:bg-emerald-950 ndb:dark:text-emerald-300';

  return '';
}

/** What a worker exception means for retries. */
export function queueRetryText(activity) {
  if (activity.will_retry && (activity.attempts ?? []).length > 0)
    return 'Laravel can retry this job. Check the retained worker attempts below.';
  if (activity.will_retry) return 'Laravel can retry this job. No worker attempt has been retained yet.';

  return 'Open the linked worker profile to inspect the failure in context.';
}

export function queueAttemptLabel(attempt) {
  return attempt.attempt === null || attempt.attempt === undefined
    ? `Attempt ${attempt.sequence}`
    : `Attempt ${attempt.attempt}`;
}

/** Recipients or notifiables a queued communication targets. */
export function queueTargets(activity) {
  return activity.recipient_count || activity.notifiable_count || '—';
}
