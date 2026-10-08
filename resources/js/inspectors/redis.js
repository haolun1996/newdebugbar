/** Pure view logic for the Redis inspector. */

export const REDIS_FILTERS = ['all', 'failed'];

const number = (value) => Number(value).toLocaleString('en-US');

export function matchesRedisCommand(command, { filter = 'all', search = '' } = {}) {
  const term = String(search).toLowerCase().trim();
  const matchesFilter = filter === 'all' || (filter === 'failed' && Boolean(command.failed));

  return matchesFilter && (term === '' || String(command.search ?? '').includes(term));
}

/** Every command with its visibility, the visible count, and the selection kept or moved to the first visible. */
export function redisView(commands, { filter = 'all', search = '', selected = null } = {}) {
  const rows = commands.map((item) => ({ item, visible: matchesRedisCommand(item, { filter, search }) }));
  const visible = rows.filter((row) => row.visible).map((row) => row.item.execution);

  return {
    rows,
    visibleCount: visible.length,
    selected: visible.includes(selected) ? selected : (visible[0] ?? null),
  };
}

/** Command count, failures, and the summary line under it (redis.blade.php). */
export function redisSummary(summary = {}, commands = [], formatDuration = String) {
  const count = commands.length;
  const failures =
    Math.trunc(
      Number(summary.failed_count ?? commands.filter((command) => command.failed === true).length),
    ) || 0;
  const parts = [`${formatDuration(Number(summary.duration_ms ?? 0))} total`];

  if (failures > 0) parts.push(`${number(failures)} ${failures === 1 ? 'failure' : 'failures'}`);

  return {
    count,
    countLabel: `${number(count)} ${count === 1 ? 'command' : 'commands'}`,
    failures,
    line: parts.join(', '),
  };
}

/** Copy action and labels for a command's retained keys or protected identifiers. */
export function redisKeyEvidence(command) {
  const keys = Array.isArray(command.keys) ? command.keys : [];
  const hashes = Array.isArray(command.key_hashes) ? command.key_hashes : [];
  const dropped = Number(command.key_dropped ?? 0);

  return {
    keys,
    hashes,
    protectedOnly: keys.length === 0 && hashes.length > 0,
    none: keys.length === 0 && hashes.length === 0,
    copy: (keys.length ? keys : hashes).join('\n'),
    copyLabel: keys.length ? 'Copy keys' : 'Copy identifiers',
    dropped,
    droppedLabel:
      dropped === 1
        ? 'more key was not retained because this command reached the capture limit.'
        : 'more keys were not retained because this command reached the capture limit.',
  };
}

/** Explains time spent after the response was sent. */
export function redisAfterResponseText(command) {
  return command.after_response_label
    ? `This command ran ${command.after_response_label} after the response was sent, so its time is not part of the response time.`
    : 'This command ran after the response was sent, so its time is not part of the response time.';
}
