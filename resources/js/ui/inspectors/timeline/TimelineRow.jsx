import { cx } from '../../../app/hooks.js';

/** The waterfall mark for one activity: a bar for durations, a rule for milestones, and a dot for events. */
function TimelineMark({ kind }) {
  if (kind === 'span') {
    return (
      <span
        data-ndb-timeline-mark=""
        className="ndb:absolute ndb:top-1/2 ndb:left-[var(--ndb-timeline-start)] ndb:h-2.5 ndb:w-[max(3px,var(--ndb-timeline-width))] ndb:-translate-y-1/2 ndb:rounded-sm ndb:bg-indigo-500 ndb:dark:bg-indigo-400"
      />
    );
  }

  if (kind === 'milestone') {
    return (
      <span
        data-ndb-timeline-mark=""
        className="ndb:absolute ndb:top-1/2 ndb:left-[clamp(4px,var(--ndb-timeline-at),calc(100%-4px))] ndb:h-5 ndb:w-px ndb:-translate-x-1/2 ndb:-translate-y-1/2 ndb:bg-zinc-700 ndb:dark:bg-zinc-200"
      />
    );
  }

  return (
    <span
      data-ndb-timeline-mark=""
      className="ndb:absolute ndb:top-1/2 ndb:left-[clamp(4px,var(--ndb-timeline-at),calc(100%-4px))] ndb:size-2.5 ndb:-translate-x-1/2 ndb:-translate-y-1/2 ndb:rounded-full ndb:border-2 ndb:border-white ndb:bg-zinc-500 ndb:dark:border-zinc-950 ndb:dark:bg-zinc-300"
    />
  );
}

/** One selectable timeline activity row. */
export function TimelineRow({ item, selected, onSelect }) {
  return (
    <button
      type="button"
      data-ndb-timeline-item={item.id}
      data-ndb-timeline-inspector={item.inspector}
      data-ndb-timeline-inspector-label={item.inspectorLabel}
      data-ndb-timeline-kind={item.kindLabel}
      data-ndb-timeline-label={item.label}
      data-ndb-timeline-at={item.atMs}
      data-ndb-timeline-at-label={item.atLabel}
      data-ndb-timeline-start={item.startMs ?? ''}
      data-ndb-timeline-start-label={item.startLabel ?? ''}
      data-ndb-timeline-duration={item.durationMs ?? ''}
      data-ndb-timeline-duration-label={item.durationLabel ?? ''}
      data-ndb-timeline-source={item.source ?? ''}
      aria-controls="newdebugbar-timeline-detail"
      aria-pressed={selected ? 'true' : 'false'}
      onClick={onSelect}
      className={cx(
        'ndb:grid ndb:h-auto ndb:w-full ndb:min-w-0 ndb:grid-cols-[minmax(0,1fr)_auto] ndb:items-center ndb:gap-x-3 ndb:bg-transparent ndb:px-3 ndb:py-2.5 ndb:text-left ndb:transition-colors ndb:focus-visible:relative ndb:focus-visible:z-10 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:sm:py-3 ndb:lg:grid-cols-[minmax(13rem,0.8fr)_minmax(20rem,2fr)_6rem] ndb:lg:px-0 ndb:lg:py-0',
        selected
          ? 'ndb:bg-indigo-50/65 ndb:dark:bg-indigo-950/20'
          : 'ndb:hover:bg-zinc-50/80 ndb:dark:hover:bg-zinc-900/60',
      )}
      style={{
        '--ndb-timeline-at': `${item.atPercent}%`,
        '--ndb-timeline-start': `${item.startPercent}%`,
        '--ndb-timeline-width': `${item.durationPercent}%`,
      }}
    >
      <span className="ndb:min-w-0 ndb:lg:px-3 ndb:lg:py-2.5">
        <span className="ndb:block ndb:truncate ndb:text-xs ndb:font-bold">{item.label}</span>
        <span
          data-ndb-timeline-activity-inspector=""
          className="ndb:mt-0.5 ndb:block ndb:truncate ndb:text-xs ndb:font-medium ndb:text-zinc-500 ndb:dark:text-zinc-400"
        >
          {item.inspectorLabel}
          {item.durationLabel !== null && <span className="ndb:lg:hidden">, {item.durationLabel}</span>}
        </span>
      </span>

      <span
        data-ndb-timeline-track=""
        className="ndb:relative ndb:hidden ndb:h-full ndb:min-h-11 ndb:border-x ndb:border-zinc-200/90 ndb:bg-[linear-gradient(to_right,transparent_calc(25%-0.5px),rgba(161,161,170,0.16)_25%,transparent_calc(25%+0.5px),transparent_calc(50%-0.5px),rgba(161,161,170,0.16)_50%,transparent_calc(50%+0.5px),transparent_calc(75%-0.5px),rgba(161,161,170,0.16)_75%,transparent_calc(75%+0.5px))] ndb:dark:border-zinc-800 ndb:lg:block"
      >
        <TimelineMark kind={item.kind} />
      </span>

      <span className="ndb:text-right ndb:text-xs ndb:font-semibold ndb:tabular-nums ndb:text-zinc-600 ndb:dark:text-zinc-300 ndb:lg:px-3 ndb:lg:py-2.5">
        {item.atLabel}
      </span>
    </button>
  );
}
