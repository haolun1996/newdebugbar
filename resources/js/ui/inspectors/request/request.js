import { formatDuration } from '../../../duration.js';
import { titleCase } from '../../../inspectors/timeline.js';

/** Symfony's Response::$statusTexts, which the PHP view used for the response label. */
export const STATUS_TEXTS = {
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  226: 'IM Used',
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Content Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a teapot",
  421: 'Misdirected Request',
  422: 'Unprocessable Content',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required',
};

const isRecord = (value) => value !== null && typeof value === 'object';
const record = (value) => (isRecord(value) ? value : {});
const integer = (value) => Math.trunc(Number(value)) || 0;
const count = (value) => (isRecord(value) ? Object.keys(value).length : 0);

/** `number_format()` with optional decimals. */
const numberFormat = (value, decimals = 0) =>
  Number(value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export function formatBytes(bytes) {
  return bytes >= 1024 ? `${numberFormat(bytes / 1024, 2)} KB` : `${numberFormat(bytes)} B`;
}

/** One captured value as table text: JSON for arrays and objects, PHP-style words for scalars. */
export function formatRequestValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (isRecord(value)) return JSON.stringify(value);

  return String(value);
}

/** The scheme, host, and port of an absolute URL (PHP parse_url), or '' for a relative one. */
export function requestOrigin(url) {
  const match = /^([a-z][a-z0-9+.-]*):\/\/(?:[^@/?#]*@)?(\[[^\]]*\]|[^:/?#]+)(?::(\d+))?/i.exec(url);

  return match ? `${match[1]}://${match[2]}${match[3] ? `:${match[3]}` : ''}` : '';
}

/** Everything the request inspector shows, derived from the request payload and profile metrics. */
export function requestView(payload, profile) {
  const request = record(payload);
  const status = integer(request.status);
  const succeeded = status >= 200 && status < 300;
  const failed = status >= 400;
  const url = String(request.url ?? '');
  const path = request.path || request.url || '—';
  const action = request.action || 'Closure';
  const separator = action.lastIndexOf('\\');
  const session = record(request.session);
  const duration = formatDuration(profile?.metrics?.duration_ms ?? 0);
  const headers = record(request.headers);
  const input = record(request.input);
  const query = record(request.query);

  return {
    isHttp: (profile?.profile_type ?? 'http') === 'http',
    method: request.method ?? 'HTTP',
    path,
    url,
    origin: requestOrigin(url),
    requestSize:
      integer(request.request_size_bytes) > 0 ? formatBytes(integer(request.request_size_bytes)) : null,
    actionName: separator === -1 ? action : action.slice(separator + 1),
    actionNamespace: separator === -1 ? '' : action.slice(0, separator),
    route: request.route || 'Unnamed route',
    middleware: Array.isArray(request.middleware)
      ? request.middleware
      : Object.values(record(request.middleware)),
    guard: record(request.authentication).guard ?? 'unknown',
    authenticationModel:
      request.authenticated && record(request.authentication).model
        ? record(request.authentication).model
        : null,
    authenticationLabel: request.authenticated ? 'Authenticated' : 'Guest',
    status,
    statusLabel: `${status || '—'} ${STATUS_TEXTS[status] ?? ''}`.trim(),
    succeeded,
    failed,
    tone: failed ? 'error' : succeeded ? 'success' : 'neutral',
    contentType: request.content_type || '—',
    responseSize: formatBytes(integer(request.response_size_bytes)),
    duration,
    detailGroups: [
      { key: 'headers', label: 'Headers', count: count(headers), items: headers },
      { key: 'input', label: 'Input', count: count(input), items: input },
      { key: 'query', label: 'Query', count: count(query), items: query },
      {
        key: 'session',
        label: 'Session',
        count: integer(session.key_count),
        items: {
          started: Boolean(session.present ?? false),
          driver: session.driver ?? '—',
          keys: session.keys ?? [],
          'flash keys': session.flash_keys ?? [],
          'error bags': session.error_bags ?? [],
        },
      },
    ],
    runtimeFacts: [
      ['Type', titleCase(profile?.profile_type ?? 'runtime')],
      ['Name', request.name || path],
      ['Status', request.exit_code ?? request.status ?? '—'],
      ['Duration', duration],
    ],
  };
}

/** The "Copy all" text for one detail group (pretty JSON with unescaped slashes and unicode). */
export function detailGroupCopy(items) {
  return JSON.stringify(items, null, 4);
}
