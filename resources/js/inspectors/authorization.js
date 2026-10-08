/** Presents captured authorization decisions for the authorization inspector. */

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isRecord = (value) => value !== null && typeof value === 'object';
const isScalar = (value) => ['string', 'number', 'boolean'].includes(typeof value);
const filledString = (value) => (typeof value === 'string' && value !== '' ? value : null);
const list = (value) => (Array.isArray(value) ? value : isObject(value) ? Object.values(value) : []);

/** PHP's `(string)` cast for scalars. */
const phpString = (value) => (value === true ? '1' : value === false ? '' : String(value));

/** Laravel's `class_basename()`. */
export function shortType(type) {
  const parts = String(type).replaceAll('\\', '/').split('/');

  return parts[parts.length - 1];
}

/** PHP `json_encode` with JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE. */
export function prettyJson(value) {
  return JSON.stringify(value, null, 4) ?? 'null';
}

const valueLabel = (value) => {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null || value === undefined) return 'null';
  if (isScalar(value)) return phpString(value);

  return JSON.stringify(value) || 'Unavailable';
};

function userView(rawUser) {
  const user = isObject(rawUser) ? rawUser : {};
  const type = filledString(user.type);
  const name = filledString(user.name);
  const identifierName = filledString(user.identifier_name);
  const identifier = isScalar(user.identifier) ? user.identifier : null;
  let label = shortType(type ?? '');

  if (type === null) label = 'Guest';
  else if (name !== null) label = name;
  else if (identifier !== null) label = `${shortType(type)} ${phpString(identifier)}`;

  return { label, type, identifierName, identifier };
}

function rawArguments(item) {
  const captured = list(item.arguments).filter(isRecord);
  if (captured.length > 0 || Object.hasOwn(item, 'arguments')) return captured;

  return list(item.argument_types)
    .filter((type) => typeof type === 'string' && type !== '')
    .map((type, index) => ({ position: index + 1, kind: 'object', type }));
}

function argumentView(argument, index, handlerKind) {
  const position = Math.max(1, Math.trunc(Number(argument.position ?? index + 1)) || 0);
  const type = filledString(argument.type) ?? 'unknown';
  const name = filledString(argument.name);
  const identifier = isScalar(argument.identifier) ? argument.identifier : null;
  const routeKeyName = filledString(argument.route_key_name);
  const routeKey = isScalar(argument.route_key) ? argument.route_key : null;
  const hasValue = Object.hasOwn(argument, 'value');
  const value = valueLabel(argument.value ?? null);
  let label = shortType(type);
  let identityLabel = null;

  if (name !== null) label = name;
  else if (routeKey !== null) label = `${shortType(type)} ${phpString(routeKey)}`;
  else if (identifier !== null) label = `${shortType(type)} ${phpString(identifier)}`;
  else if (hasValue) label = value;

  if (routeKey !== null && routeKeyName !== null) identityLabel = `${routeKeyName} ${phpString(routeKey)}`;
  else if (identifier !== null) identityLabel = `Identifier ${phpString(identifier)}`;
  else if (hasValue) identityLabel = `Value ${value}`;

  let roleLabel = `Argument ${position}`;
  if (handlerKind === 'policy')
    roleLabel = position === 1 ? 'Resource' : `Additional context ${position - 1}`;

  return {
    position,
    role_label: roleLabel,
    kind: typeof argument.kind === 'string' ? argument.kind : 'value',
    type,
    label,
    identity_label: identityLabel,
  };
}

const locationLabel = (location) => `${location.file ?? 'Unknown source'}:${location.line ?? '?'}`;

/** One captured decision as the list and detail pane show it. */
export function authorizationDecision(item, index) {
  const ability = filledString(item.ability) ?? 'Ability unavailable';
  const result = item.result === 'allowed' ? 'allowed' : 'denied';
  const user = userView(item.user);
  const legacyHandler = filledString(item.handler) ?? 'callback';
  const handlerKind = ['policy', 'callback'].includes(item.handler_kind)
    ? item.handler_kind
    : legacyHandler === 'callback'
      ? 'callback'
      : 'policy';
  const handlerName =
    filledString(item.handler_name) ?? (legacyHandler === 'callback' ? 'Gate callback' : legacyHandler);
  const handlerSource = isObject(item.handler_source) ? item.handler_source : null;
  const handlerSourceLabel = handlerSource === null ? null : locationLabel(handlerSource);
  const handlerAvailable =
    handlerKind === 'policy' || handlerSource !== null || handlerName !== 'Gate callback';
  const handlerLabel = !handlerAvailable
    ? 'Authorization logic'
    : handlerKind === 'policy'
      ? 'Matched policy method'
      : 'Matched Gate callback';
  const args = rawArguments(item).map((argument, position) => argumentView(argument, position, handlerKind));
  const argumentSummary =
    args.length === 0
      ? '—'
      : args.length === 1
        ? args[0].label
        : `${args[0].label} and ${args.length - 1} more`;
  const callsite = isObject(item.callsite) ? item.callsite : null;
  const callsiteLabel = callsite === null ? null : (callsite.copy ?? locationLabel(callsite));
  const resultMessage = filledString(item.result_message);
  const resultCode = isScalar(item.result_code) ? phpString(item.result_code) : null;
  const status = item.result_status;
  const resultStatus =
    (typeof status === 'number' && Number.isFinite(status)) ||
    (typeof status === 'string' && status.trim() !== '' && Number.isFinite(Number(status)))
      ? Math.trunc(Number(status))
      : null;
  const stack = list(item.stack).filter((frame) => isObject(frame) && typeof frame.file === 'string');
  const firstFrame = stack[0] ?? null;
  const callsiteDuplicatesStack =
    callsite !== null &&
    firstFrame !== null &&
    (callsite.file ?? null) === (firstFrame.file ?? null) &&
    (callsite.line ?? null) === (firstFrame.line ?? null);
  const evidence = {
    result,
    ability,
    user: item.user ?? null,
    arguments: item.arguments ?? item.argument_types ?? [],
    authorization_logic: { kind: handlerKind, name: handlerName, source: handlerSource },
    authorization_response: { message: resultMessage, code: resultCode, status: resultStatus },
    stack,
  };

  if (callsite !== null && !callsiteDuplicatesStack) evidence.checked_from = callsite;

  return {
    execution: Math.trunc(Number(item.execution ?? index + 1)) || 0,
    ability,
    result,
    result_label: result === 'allowed' ? 'Allowed' : 'Denied',
    result_message: resultMessage,
    result_code: resultCode,
    result_status: resultStatus,
    user_label: user.label,
    user_type: user.type,
    user_identifier_name: user.identifierName,
    user_identifier: user.identifier,
    arguments: args,
    argument_summary: argumentSummary,
    handler_kind: handlerKind,
    handler_label: handlerLabel,
    handler_available: handlerAvailable,
    handler_name: handlerName,
    handler_source_label: handlerSourceLabel,
    callsite_label: callsiteLabel,
    stack,
    copy_evidence: prettyJson(evidence),
    search: [
      ability,
      result,
      user.label,
      user.type,
      argumentSummary,
      handlerName,
      handlerSourceLabel,
      callsiteLabel,
      resultMessage,
      resultCode,
    ]
      .filter(isScalar)
      .map(phpString)
      .join(' ')
      .toLowerCase(),
  };
}

/** Every captured decision, in capture order. */
export function authorizationDecisions(payload) {
  return list(payload?.items)
    .filter(isRecord)
    .map((item, index) => authorizationDecision(item, index));
}

export const AUTHORIZATION_FILTERS = ['all', 'denied', 'allowed'];

/** Result filter options with their counts. */
export function authorizationFilters(decisions) {
  const count = (result) => decisions.filter((decision) => decision.result === result).length;

  return [
    { value: 'all', label: 'All', count: decisions.length },
    { value: 'denied', label: 'Denied', count: count('denied') },
    { value: 'allowed', label: 'Allowed', count: count('allowed') },
  ];
}

/** Decisions matching the result filter and search text. */
export function visibleAuthorizationDecisions(decisions, filter, search) {
  const needle = String(search ?? '')
    .toLowerCase()
    .trim();

  return decisions.filter(
    (decision) =>
      (filter === 'all' || decision.result === filter) && (needle === '' || decision.search.includes(needle)),
  );
}

/**
 * Keeps the selected decision while it stays visible; otherwise selects the first visible one.
 * The detail stays open only when a decision remains selected.
 */
export function reconcileAuthorizationSelection(visible, selected, detailOpen) {
  if (visible.some((decision) => decision.execution === selected)) return { selected, detailOpen };

  const first = visible[0]?.execution ?? null;

  return { selected: first, detailOpen: first !== null && detailOpen };
}
