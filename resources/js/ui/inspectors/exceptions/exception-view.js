/** Pure presentation rules for the exceptions inspector. */

const PROFILE_ACTIONS = {
  http: 'Open request',
  queue: 'Open worker',
  artisan: 'Open command',
  test: 'Open test run',
};

/** Names the current profile truthfully for the "open the request" action. */
export function profileActionLabel(profileType) {
  return PROFILE_ACTIONS[profileType ?? 'http'] ?? 'Open runtime';
}

/** Numbered source excerpt with right-aligned line numbers and a `>` on the failing line. */
export function exceptionSourceText(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return null;

  const width = Math.max(...lines.map((line) => String(line.number).length));

  return lines
    .map((line) => {
      const number = String(line.number);

      return `${' '.repeat(Math.max(0, width - number.length))}${number}${line.focus ? '>' : ' '} ${line.code}`;
    })
    .join('\n');
}

/** Retained causes (array entries only) and the tabs the detail offers. */
export function exceptionCauses(exception) {
  return (Array.isArray(exception?.causes) ? exception.causes : []).filter(
    (cause) => cause !== null && typeof cause === 'object' && !Array.isArray(cause),
  );
}

export function exceptionTabs(causes) {
  const tabs = [
    ['source', 'Source'],
    ['stack', 'Stack'],
  ];
  if (causes.length > 0) tabs.push(['causes', 'Causes']);

  return tabs;
}

/** Laravel's filled() for a captured message. */
export function filled(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';

  return true;
}
