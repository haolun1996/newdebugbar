import { cx, useShell } from '../../../app/hooks.js';
import { CodeBlock } from '../../components/CodeBlock.jsx';
import { InspectorAction } from '../../components/InspectorAction.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';
import { LivewireActivityTrace } from './LivewireActivityTrace.jsx';

const COMPONENT_LINK =
  'ndb:max-w-full ndb:truncate ndb:bg-transparent ndb:p-0 ndb:text-left ndb:text-xs ndb:font-semibold ndb:text-zinc-700 ndb:underline ndb:decoration-zinc-300 ndb:underline-offset-2 ndb:hover:text-zinc-950 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-zinc-200 ndb:dark:decoration-zinc-600 ndb:dark:hover:text-white';

const hasParams = (params) => Object.keys(params ?? {}).length > 0;

const titleCase = (value) =>
  String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function ComponentLink({ state, item }) {
  return (
    <button type="button" onClick={() => state.inspectLivewireActivityComponent()} className={COMPONENT_LINK}>
      {state.livewireActivityComponentTitle(item)}
    </button>
  );
}

function ChangeValue({ label, children }) {
  return (
    <p className="ndb:flex ndb:min-w-0 ndb:gap-2 ndb:text-xs ndb:sm:block">
      <span className="ndb:w-14 ndb:shrink-0 ndb:text-zinc-400 ndb:sm:hidden">{label}</span>
      <code className="ndb:min-w-0 ndb:break-all">{children}</code>
    </p>
  );
}

/** What one Livewire interaction did: outcome, related requests, changes, actions, events, and its trace. */
export function LivewireActivityDetail({ state, item }) {
  const shell = useShell();
  const profileIds = state.livewireActivityProfileIds(item);
  const sourceLabel = state.livewireActivitySourceLabel(item);
  const actions = state.livewireMeaningfulActions(item);
  const events = state.livewireActivityEvents(item);
  const failed = item.status === 'failed' || item.status === 'failed_validation';

  return (
    <article data-ndb-livewire-activity-detail="" className="ndb:flex ndb:min-h-0 ndb:flex-1 ndb:flex-col">
      <InspectorDetailHeader
        data-ndb-livewire-activity-header=""
        title={
          <div className="ndb:min-w-0">
            <h3 className="ndb:min-w-0 ndb:break-words ndb:text-sm ndb:font-bold">{item.title}</h3>
            <p className="ndb:mt-0.5 ndb:max-w-2xl ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400">
              {state.livewireActivitySummary(item)}
            </p>
          </div>
        }
        aside={
          <div className="ndb:flex ndb:max-w-44 ndb:flex-wrap ndb:items-center ndb:justify-end ndb:gap-2">
            <span
              data-ndb-livewire-activity-status=""
              hidden={item.status === 'complete'}
              className={cx(
                'ndb:inline-flex ndb:min-h-7 ndb:items-center ndb:justify-self-end ndb:rounded-md ndb:px-2 ndb:text-xs ndb:font-bold',
                failed
                  ? 'ndb:bg-red-50 ndb:text-red-700 ndb:dark:bg-red-950/60 ndb:dark:text-red-300'
                  : item.status === 'updating'
                    ? 'ndb:bg-indigo-50 ndb:text-indigo-700 ndb:dark:bg-indigo-950/60 ndb:dark:text-indigo-300'
                    : 'ndb:bg-zinc-100 ndb:text-zinc-600 ndb:dark:bg-zinc-800 ndb:dark:text-zinc-300',
              )}
            >
              {state.livewireActivityStatusLabel(item)}
            </span>
            <div
              role="group"
              aria-label="Related activity requests"
              hidden={profileIds.length === 0}
              className="ndb:flex ndb:max-w-full ndb:flex-wrap ndb:items-center ndb:justify-end ndb:gap-1.5"
            >
              {profileIds.map((profileId, index) => (
                <InspectorAction
                  key={profileId}
                  icon="external-link"
                  onClick={() => shell.openRelatedProfile(profileId, 'request')}
                  aria-label={`Open related request ${index + 1}`}
                >
                  <span>{profileIds.length === 1 ? 'Open request' : `Open request ${index + 1}`}</span>
                </InspectorAction>
              ))}
            </div>
          </div>
        }
      />

      <div
        data-ndb-livewire-activity-evidence=""
        className="ndb:space-y-3 ndb:p-3 ndb:sm:space-y-5 ndb:sm:p-4"
      >
        <div hidden={item.kind !== 'mount'} data-ndb-livewire-mount-facts="">
          <InspectorFacts columns={2}>
            <InspectorFact label="Component">
              <ComponentLink state={state} item={item} />
            </InspectorFact>
            <InspectorFact label="Parent" valueProps={{ className: 'ndb:truncate ndb:font-semibold' }}>
              {state.livewireActivityParentTitle(item)}
            </InspectorFact>
            <InspectorFact
              label="Mounted at"
              valueProps={{
                'data-ndb-livewire-mount-time': '',
                className: 'ndb:truncate ndb:font-semibold ndb:tabular-nums',
              }}
            >
              {state.livewireMountTime(item)}
            </InspectorFact>
            <InspectorFact
              label="Initial render"
              valueProps={{
                'data-ndb-livewire-initial-render-duration': '',
                className: 'ndb:truncate ndb:font-semibold ndb:tabular-nums',
              }}
            >
              {state.livewireInitialRenderDuration(item)}
            </InspectorFact>
          </InspectorFacts>
        </div>

        <div hidden={item.kind === 'mount'}>
          <InspectorFacts columns={4}>
            <InspectorFact label="Component">
              <ComponentLink state={state} item={item} />
            </InspectorFact>
            <InspectorFact label="Type" valueProps={{ className: 'ndb:truncate ndb:font-semibold' }}>
              {titleCase(item.kind)}
            </InspectorFact>
            <InspectorFact
              label="Happened"
              valueProps={{ className: 'ndb:truncate ndb:font-semibold ndb:tabular-nums' }}
            >
              {state.livewireActivityAge(item)}
            </InspectorFact>
            <InspectorFact
              label="Duration"
              valueProps={{ className: 'ndb:truncate ndb:font-semibold ndb:tabular-nums' }}
            >
              {state.livewireDuration(item)}
            </InspectorFact>
          </InspectorFacts>
        </div>

        <div
          hidden={!item.error}
          role="alert"
          className="ndb:rounded-lg ndb:border ndb:border-red-200 ndb:bg-red-50/70 ndb:px-3 ndb:py-2.5 ndb:text-xs ndb:font-semibold ndb:text-red-800 ndb:dark:border-red-950 ndb:dark:bg-red-950/30 ndb:dark:text-red-200"
        >
          {item.error}
        </div>

        <div
          role="group"
          aria-label="Activity source"
          hidden={!sourceLabel}
          className="ndb:flex ndb:min-w-0 ndb:items-center ndb:gap-2 ndb:border-b ndb:border-zinc-200/90 ndb:pb-3 ndb:dark:border-zinc-800"
        >
          <span className="ndb:shrink-0 ndb:text-xs ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400">
            Source
          </span>
          <InspectorSourceLink
            title={sourceLabel ?? undefined}
            copy={sourceLabel ?? ''}
            className="ndb:min-w-0"
          >
            {sourceLabel}
          </InspectorSourceLink>
        </div>

        <section hidden={!(item.changes?.length > 0)}>
          <div className="ndb:border-b ndb:border-zinc-200/90 ndb:dark:border-zinc-800">
            <div className="ndb:hidden ndb:grid-cols-[minmax(8rem,1fr)_minmax(6rem,0.8fr)_minmax(6rem,0.8fr)_minmax(6rem,0.8fr)] ndb:gap-3 ndb:border-b ndb:border-zinc-200/90 ndb:py-2 ndb:text-xs ndb:font-semibold ndb:text-zinc-400 ndb:dark:border-zinc-800 ndb:sm:grid">
              <span>Property</span>
              <span>Before</span>
              <span>Sent</span>
              <span>Server</span>
            </div>
            <div className="ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800">
              {(item.changes ?? []).map((change) => (
                <div
                  key={change.path}
                  className="ndb:grid ndb:min-w-0 ndb:gap-2 ndb:py-2.5 ndb:sm:grid-cols-[minmax(8rem,1fr)_minmax(6rem,0.8fr)_minmax(6rem,0.8fr)_minmax(6rem,0.8fr)] ndb:sm:items-center ndb:sm:gap-3"
                >
                  <code className="ndb:min-w-0 ndb:break-all ndb:text-xs ndb:font-semibold">
                    {change.path}
                  </code>
                  <ChangeValue label="Before">{JSON.stringify(change.before)}</ChangeValue>
                  <ChangeValue label="Sent">{JSON.stringify(change.submitted)}</ChangeValue>
                  <ChangeValue label="Server">
                    {change.serverKnown ? JSON.stringify(change.server) : 'Not confirmed'}
                  </ChangeValue>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section hidden={actions.length === 0}>
          <h4 className="ndb:text-xs ndb:font-bold">Server actions</h4>
          <div className="ndb:mt-2 ndb:space-y-2">
            {actions.map((action, index) => (
              <div
                key={`${action.name}-${index}`}
                className="ndb:rounded-lg ndb:bg-zinc-50 ndb:px-3 ndb:py-2.5 ndb:dark:bg-zinc-900/65"
              >
                <code className="ndb:text-xs ndb:font-bold">{action.name}</code>
                <CodeBlock
                  language="json"
                  hidden={!hasParams(action.params)}
                  className="ndb:mt-2"
                  source={JSON.stringify(action.params, null, 2) ?? ''}
                />
              </div>
            ))}
          </div>
        </section>

        <section hidden={events.length === 0}>
          <h4 className="ndb:text-xs ndb:font-bold">Events</h4>
          <div className="ndb:mt-2 ndb:space-y-2">
            {events.map((event) => (
              <div
                key={event.name}
                className="ndb:rounded-lg ndb:border ndb:border-zinc-200/90 ndb:px-3 ndb:py-3 ndb:dark:border-zinc-800"
              >
                <div className="ndb:flex ndb:flex-wrap ndb:items-center ndb:gap-2">
                  <code className="ndb:text-xs ndb:font-bold">{event.name}</code>
                  <span className="ndb:text-xs ndb:font-semibold ndb:text-zinc-400">{event.mode}</span>
                </div>
                <p
                  hidden={!event.declaredTarget}
                  className="ndb:mt-2 ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400"
                >
                  Declared target <code>{event.declaredTarget}</code>
                </p>
                <div
                  hidden={!(event.observedRecipientIds?.length > 0)}
                  className="ndb:mt-2 ndb:flex ndb:flex-wrap ndb:items-center ndb:gap-1.5 ndb:text-xs"
                >
                  <span className="ndb:text-zinc-400">Observed recipients</span>
                  {(event.observedRecipientIds ?? []).map((recipient) => (
                    <button
                      key={recipient}
                      type="button"
                      onClick={() => state.inspectLivewireComponent(recipient)}
                      className="ndb:bg-transparent ndb:p-0 ndb:font-semibold ndb:text-zinc-700 ndb:underline ndb:decoration-zinc-300 ndb:underline-offset-2 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-zinc-200 ndb:dark:decoration-zinc-600"
                    >
                      {state.livewireComponentTitle(recipient)}
                    </button>
                  ))}
                </div>
                <CodeBlock
                  language="json"
                  hidden={!hasParams(event.params)}
                  className="ndb:mt-2"
                  source={JSON.stringify(event.params, null, 2) ?? ''}
                />
              </div>
            ))}
          </div>
        </section>

        {(item.phases ?? []).some((phase) => phase.name !== 'Queued') ? (
          <LivewireActivityTrace state={state} item={item} />
        ) : null}
      </div>
    </article>
  );
}
