import { DefaultInspector } from './DefaultInspector.jsx';
import { AuthorizationInspector } from './AuthorizationInspector.jsx';
import { CacheInspector } from './CacheInspector.jsx';
import { EventsInspector } from './EventsInspector.jsx';
import { ExceptionsInspector } from './ExceptionsInspector.jsx';
import { HttpClientInspector } from './HttpClientInspector.jsx';
import { LogsInspector } from './LogsInspector.jsx';
import { LivewireInspector } from './LivewireInspector.jsx';
import { MailInspector } from './MailInspector.jsx';
import { ModelsInspector } from './ModelsInspector.jsx';
import { NotificationsInspector } from './NotificationsInspector.jsx';
import { QueriesInspector } from './QueriesInspector.jsx';
import { QueueInspector } from './QueueInspector.jsx';
import { RedisInspector } from './RedisInspector.jsx';
import { RequestInspector } from './RequestInspector.jsx';
import { TimelineInspector } from './TimelineInspector.jsx';
import { ValidationInspector } from './ValidationInspector.jsx';
import { ViewsInspector } from './ViewsInspector.jsx';

/**
 * One component per inspector key. Each receives
 * { inspectorKey, inspector, profile, profileId } where `inspector` is the presented
 * inspector ({ label, summary, payload }) and `profile` the shared profile slice.
 */
export const INSPECTORS = {
  authorization: AuthorizationInspector,
  cache: CacheInspector,
  events: EventsInspector,
  exceptions: ExceptionsInspector,
  http_client: HttpClientInspector,
  logs: LogsInspector,
  livewire: LivewireInspector,
  mail: MailInspector,
  models: ModelsInspector,
  notifications: NotificationsInspector,
  queries: QueriesInspector,
  queue: QueueInspector,
  redis: RedisInspector,
  request: RequestInspector,
  timeline: TimelineInspector,
  validation: ValidationInspector,
  views: ViewsInspector,
};

export function inspectorComponent(key) {
  return INSPECTORS[key] ?? DefaultInspector;
}
