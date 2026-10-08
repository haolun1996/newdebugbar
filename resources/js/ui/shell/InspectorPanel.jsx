import { cx, useShell } from '../../app/hooks.js';
import { inspectorComponent } from '../inspectors/index.js';

const number = (value) => Number(value).toLocaleString('en-US');

function CollectionStatus({ name, children }) {
  return (
    <div
      data-ndb-collection-status={name}
      role="status"
      className="ndb:rounded-lg ndb:border ndb:border-amber-200 ndb:bg-amber-50/60 ndb:px-3 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:text-amber-800 ndb:dark:border-amber-950 ndb:dark:bg-amber-950/25 ndb:dark:text-amber-300"
    >
      {children}
    </div>
  );
}

/** Renders the one loaded inspector, or explains that its request has expired. */
export function InspectorPanel() {
  const shell = useShell();
  const loaded = shell.inspectorData;

  if (!loaded) return <span data-ndb-inspector-placeholder hidden />;

  const { profileId, inspector: inspectorKey, profile } = loaded;
  const inspector = profile?.inspectors?.[inspectorKey];

  if (!profile || !inspector || typeof inspector !== 'object') {
    return (
      <div data-ndb-inspector-expired className="ndb:p-8 ndb:text-center">
        <p className="ndb:text-sm ndb:font-semibold">This request is no longer available.</p>
        <p className="ndb:mt-1 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
          It may have expired or been cleared.
        </p>
        <p className="ndb:mt-3 ndb:text-xs ndb:font-semibold">Reload the page to capture a new request.</p>
      </div>
    );
  }

  const summary = inspector.summary ?? {};
  const payload = inspector.payload ?? {};
  const dropped = Number(summary.dropped_count ?? 0);
  const retained = Number(summary.retained_count ?? (payload.items ?? []).length);
  const total = Number(summary.count ?? retained + dropped);
  const transactionsDropped = Number(summary.transaction_dropped_count ?? 0);
  const Content = inspectorComponent(inspectorKey);

  return (
    <div
      key={`profile-inspector-${profileId}-${inspectorKey}`}
      data-ndb-loaded-inspector={inspectorKey}
      hidden={!(shell.loadedInspector === inspectorKey || shell.requestedInspector === inspectorKey)}
      className={cx(
        'ndb:px-3 ndb:py-3 ndb:sm:px-0 ndb:sm:py-6 ndb:lg:min-h-0',
        inspectorKey === 'request' ? 'ndb:lg:shrink-0' : 'ndb:lg:flex-1',
      )}
    >
      <section
        data-ndb-inspector-panel={inspectorKey}
        className="ndb:space-y-3 ndb:sm:space-y-4 ndb:lg:flex ndb:lg:h-full ndb:lg:min-h-0 ndb:lg:flex-col ndb:lg:gap-4 ndb:lg:space-y-0"
      >
        {inspectorKey !== 'notifications' && dropped > 0 && (
          <CollectionStatus name={inspectorKey}>
            Showing {number(retained)} of {number(total)} {String(inspector.label ?? '').toLowerCase()}.
          </CollectionStatus>
        )}
        {inspectorKey === 'notifications' && dropped > 0 && (
          <CollectionStatus name="notifications">
            Showing {number(retained)} of {number(summary.delivery_count ?? total)} channel attempts.
          </CollectionStatus>
        )}
        {inspectorKey === 'queries' && transactionsDropped > 0 && (
          <CollectionStatus name="query-transactions">
            Showing {number(summary.transaction_retained_count ?? (payload.transactions ?? []).length)} of{' '}
            {number(summary.transaction_count ?? 0)} query transaction events.
          </CollectionStatus>
        )}
        {inspectorKey === 'timeline' && payload.incomplete && (
          <div
            data-ndb-timeline-incomplete
            role="status"
            className="ndb:rounded-lg ndb:border ndb:border-amber-200 ndb:bg-amber-50/60 ndb:px-3 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:text-amber-800 ndb:dark:border-amber-950 ndb:dark:bg-amber-950/25 ndb:dark:text-amber-300"
          >
            Timeline incomplete: {number(payload.omitted_count ?? 0)} source events were omitted.
          </div>
        )}
        <Content
          key={`${profileId}-${inspectorKey}`}
          inspectorKey={inspectorKey}
          inspector={inspector}
          profile={profile}
          profileId={profileId}
        />
      </section>
    </div>
  );
}
