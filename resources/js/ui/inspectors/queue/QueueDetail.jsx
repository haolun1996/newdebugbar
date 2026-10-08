import { cx, useShell } from '../../../app/hooks.js';
import {
  queueAttemptLabel,
  queueDetailStatusClass,
  queueRetryText,
  queueTargets,
} from '../../../inspectors/queue.js';
import { InspectorAction } from '../../components/InspectorAction.jsx';
import { InspectorDefinitionRow } from '../../components/InspectorDefinitionRow.jsx';
import { InspectorDetailBack } from '../../components/InspectorDetailBack.jsx';
import { InspectorDetailEmpty } from '../../components/InspectorDetailEmpty.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorDetailPane } from '../../components/InspectorDetailPane.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';

/** Retained worker attempts with links to their profiles (queue/attempts.blade.php). */
function QueueAttempts({ activity }) {
  const shell = useShell();

  return (
    <section
      data-ndb-queue-attempts=""
      aria-labelledby="newdebugbar-queue-attempts-heading"
      className="ndb:border-t ndb:border-zinc-200/90 ndb:p-3 ndb:sm:p-4 ndb:dark:border-zinc-800"
    >
      <h4 id="newdebugbar-queue-attempts-heading" className="ndb:mb-3 ndb:text-xs ndb:font-bold">
        Attempts
      </h4>
      <div className="ndb:divide-y ndb:divide-zinc-200/90 ndb:border-y ndb:border-zinc-200/90 ndb:dark:divide-zinc-800 ndb:dark:border-zinc-800">
        {activity.attempts.map((attempt) => (
          <article
            key={attempt.sequence}
            data-ndb-queue-attempt=""
            className="ndb:grid ndb:min-w-0 ndb:gap-2 ndb:py-2.5 ndb:sm:grid-cols-[5rem_6rem_minmax(0,1fr)_auto] ndb:sm:items-center ndb:sm:py-3"
          >
            <span className="ndb:text-xs ndb:font-bold ndb:tabular-nums">{queueAttemptLabel(attempt)}</span>
            <span className="ndb:text-xs ndb:font-semibold">{attempt.status_label}</span>
            <span className="ndb:min-w-0 ndb:break-all ndb:text-xs ndb:text-zinc-500 ndb:dark:text-zinc-400">
              {attempt.exception_class ?? attempt.recorded_at ?? 'No exception recorded'}
            </span>
            <InspectorAction
              icon="external-link"
              hidden={!attempt.profile_id}
              onClick={() => shell.openRelatedProfile(attempt.profile_id, 'queue')}
              className="ndb:h-9 ndb:min-h-0 ndb:bg-transparent"
            >
              Open worker
            </InspectorAction>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Job identity, status, linked profile, and metadata. */
function QueueHeader({ activity }) {
  const shell = useShell();

  return (
    <InspectorDetailHeader
      data-ndb-queue-detail-header=""
      title={
        <h3 className="ndb:min-w-0 ndb:break-all ndb:font-mono ndb:text-sm ndb:font-bold">{activity.job}</h3>
      }
      aside={
        <div className="ndb:flex ndb:flex-wrap ndb:items-center ndb:gap-2">
          <span
            data-ndb-queue-detail-status=""
            className={cx(
              'ndb:inline-flex ndb:justify-self-end ndb:rounded-md ndb:px-2 ndb:py-1 ndb:text-xs ndb:font-bold',
              queueDetailStatusClass(activity.status),
            )}
          >
            {activity.status_label}
          </span>
          <InspectorAction
            icon="external-link"
            data-ndb-queue-profile-link=""
            hidden={!activity.related_profile_id}
            onClick={() => shell.openRelatedProfile(activity.related_profile_id, activity.related_inspector)}
            className="ndb:h-8 ndb:min-h-0 ndb:bg-transparent ndb:px-2"
          >
            <span>{activity.related_label}</span>
          </InspectorAction>
        </div>
      }
      metadata={
        <>
          <div>
            <dt className="ndb:text-zinc-400">Connection</dt>
            <dd className="ndb:font-semibold">{activity.connection}</dd>
          </div>
          <div>
            <dt className="ndb:text-zinc-400">Queue</dt>
            <dd className="ndb:font-semibold">{activity.queue}</dd>
          </div>
          <div>
            <dt className="ndb:text-zinc-400">Captured at</dt>
            <dd className="ndb:font-semibold ndb:tabular-nums">{activity.at_label}</dd>
          </div>
        </>
      }
    />
  );
}

/** Status explanation, facts, communication, failure, and lifecycle notes. */
function QueueContent({ activity }) {
  const channels = Array.isArray(activity.display_channels) ? activity.display_channels : [];

  return (
    <div data-ndb-queue-detail-content="" className="ndb:space-y-3 ndb:p-3 ndb:sm:space-y-4 ndb:sm:p-4">
      <p className="ndb:text-xs ndb:leading-5 ndb:text-zinc-600 ndb:dark:text-zinc-300">
        {activity.status_description}
      </p>

      <InspectorFacts columns={4} data-ndb-queue-facts="">
        <InspectorFact label="Job ID">{activity.job_id ?? '—'}</InspectorFact>
        <InspectorFact label="Duration" valueProps={{ className: 'ndb:tabular-nums' }}>
          {activity.duration_label}
        </InspectorFact>
        <InspectorFact label="Delay" valueProps={{ className: 'ndb:tabular-nums' }}>
          {activity.delay_label}
        </InspectorFact>
        <InspectorFact label="Attempt" valueProps={{ className: 'ndb:tabular-nums' }}>
          {activity.attempt ?? '—'}
        </InspectorFact>
      </InspectorFacts>

      <dl
        data-ndb-queue-communication=""
        hidden={!activity.communication_type}
        className="ndb:divide-y ndb:divide-zinc-200/90 ndb:bg-transparent ndb:dark:divide-zinc-800"
      >
        <InspectorDefinitionRow label="Type">{activity.communication_label}</InspectorDefinitionRow>
        {channels.length ? (
          <InspectorDefinitionRow label="Channels">{channels.join(', ')}</InspectorDefinitionRow>
        ) : null}
        <InspectorDefinitionRow label="Targets">{queueTargets(activity)}</InspectorDefinitionRow>
        <InspectorDefinitionRow label="Source" valueProps={{ className: 'ndb:break-all ndb:font-mono' }}>
          {activity.communication_class ?? activity.job}
        </InspectorDefinitionRow>
      </dl>

      <section
        hidden={!activity.exception_class}
        className="ndb:rounded-lg ndb:border ndb:border-red-200 ndb:bg-red-50/55 ndb:p-3 ndb:dark:border-red-950 ndb:dark:bg-red-950/20"
      >
        <p className="ndb:text-xs ndb:font-bold ndb:text-red-700 ndb:dark:text-red-300">Worker exception</p>
        <p className="ndb:mt-1 ndb:break-all ndb:font-mono ndb:text-xs ndb:text-red-700 ndb:dark:text-red-300">
          {activity.exception_class}
        </p>
        <p className="ndb:mt-1 ndb:text-xs ndb:leading-5 ndb:text-red-700/80 ndb:dark:text-red-300/80">
          {queueRetryText(activity)}
        </p>
      </section>

      <p
        data-ndb-queue-after-response=""
        hidden={activity.lifecycle !== 'after_response'}
        className="ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400"
      >
        This job ran after Laravel sent the response
        <span hidden={!activity.after_response_label}>
          {' '}
          at <span className="ndb:tabular-nums">{activity.after_response_label}</span>
        </span>
        , so its time is not part of the response time.
      </p>
    </div>
  );
}

/** The selected queue activity's evidence. */
export function QueueDetail({ activity, detailOpen, detailRef, onClose }) {
  return (
    <InspectorDetailPane
      detailOpen={detailOpen}
      detailRef={detailRef}
      detailLabel="Selected queue activity details"
      backLabel="Queue"
      onClose={onClose}
      id="newdebugbar-queue-detail"
      data-ndb-queue-detail=""
      className="ndb:border-x-0 ndb:bg-transparent"
      back={<InspectorDetailBack data-ndb-queue-back="" onClick={onClose} label="Queue" />}
    >
      {activity ? (
        <div className="ndb:flex ndb:flex-col">
          <QueueHeader activity={activity} />
          <QueueContent activity={activity} />
          {(activity.attempts ?? []).length > 0 ? <QueueAttempts activity={activity} /> : null}
        </div>
      ) : null}

      <InspectorDetailEmpty label="Choose a job to inspect its queue evidence." hidden={Boolean(activity)} />
    </InspectorDetailPane>
  );
}
