import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx, useShell, useStore, useWindowEvent } from '../../../app/hooks.js';
import { createStore } from '../../../app/store.js';
import { createTraceHelp } from '../../../inspectors/livewire/trace-help.js';
import { Icon } from '../../components/Icon.jsx';
import { IconButton } from '../../components/IconButton.jsx';
import { PopoverSurface } from '../../components/PopoverSurface.jsx';
import { useClickOutside } from '../../shell/useClickOutside.js';
import { useAnchor } from './useAnchor.js';

function PhaseHelp({ help, id, description }) {
  const surface = useClickOutside(() => help.closePhaseHelp());
  useAnchor(surface, help.phaseHelpTrigger, 'bottom-start');

  return (
    <PopoverSurface
      ref={surface}
      anchored
      data-ndb-livewire-phase-help=""
      id={id}
      role="tooltip"
      onPointerEnter={() => help.holdPhaseHelp()}
      onPointerLeave={() => help.leavePhaseHelp()}
      widthClass="ndb:w-[min(18rem,calc(100vw-2rem))]"
      surfaceClass="ndb:px-3 ndb:py-2.5"
      arrowClass="ndb:hidden"
      className="ndb:pointer-events-auto ndb:border-0 ndb:bg-transparent ndb:px-0 ndb:py-1 ndb:text-xs ndb:text-zinc-900 ndb:dark:text-zinc-100"
    >
      <p className="ndb:text-xs ndb:leading-5">{description}</p>
    </PopoverSurface>
  );
}

/** The browser → server → browser checkpoints of one update, with an explanation for every step. */
export function LivewireActivityTrace({ state, item }) {
  const shell = useShell();
  const [helpStore] = useState(() => createStore(createTraceHelp()));
  const help = useStore(helpStore);
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const triggerId = (index) => `newdebugbar-livewire-phase-trigger-${uid}-${index}`;
  const helpId = `newdebugbar-livewire-phase-help-${uid}`;
  const groups = state.livewireActivityPhaseGroups(item);
  const open = help.phaseHelpIndex;

  useEffect(() => () => help.destroy(), [help]);

  // A different selection or closing the detail pane dismisses the explanation.
  useEffect(() => help.closePhaseHelp(), [help, state.livewireSelectedActivityId, state.livewireDetailOpen]);

  useEffect(() => {
    if (shell.paletteOpen || shell.selected !== 'livewire' || !shell.inspectorOpen || !shell.barVisible) {
      help.closePhaseHelp();
    }
  }, [help, shell.paletteOpen, shell.selected, shell.inspectorOpen, shell.barVisible]);

  useWindowEvent(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || help.phaseHelpIndex === null) return;
      event.preventDefault();
      event.stopPropagation();
      help.closePhaseHelp();
    },
    true,
  );

  const portalTarget = shell.$root ?? document.getElementById('newdebugbar');

  return (
    <section data-ndb-livewire-trace="">
      <ol aria-label="Livewire update timeline" className="ndb:m-0 ndb:list-none ndb:p-0">
        {groups.map((group, groupIndex) => (
          <li
            key={`${item.id}-${group.start}`}
            data-ndb-livewire-phase-group={group.kind}
            className={cx(
              'ndb:grid ndb:grid-cols-[2rem_minmax(0,1fr)] ndb:gap-x-3 ndb:border-0 ndb:bg-transparent ndb:p-0 ndb:text-sm ndb:text-zinc-900 ndb:dark:text-zinc-100',
              { 'ndb:pb-8 ndb:sm:pb-10': groupIndex < groups.length - 1 },
            )}
          >
            <div aria-hidden="true" className="ndb:relative ndb:row-span-2">
              <span
                data-ndb-livewire-phase-connector=""
                hidden={!(groupIndex < groups.length - 1)}
                className="ndb:absolute ndb:top-4 ndb:-bottom-12 ndb:left-1/2 ndb:w-px ndb:-translate-x-1/2 ndb:border-0 ndb:bg-zinc-200 ndb:p-0 ndb:sm:-bottom-14 ndb:dark:bg-zinc-800"
              />
              <span
                data-ndb-livewire-phase-node=""
                className="ndb:relative ndb:z-10 ndb:grid ndb:size-8 ndb:place-items-center ndb:rounded-full ndb:border-0 ndb:bg-zinc-100 ndb:p-0 ndb:text-zinc-500 ndb:ring-4 ndb:ring-white ndb:dark:bg-zinc-900 ndb:dark:text-zinc-400 ndb:dark:ring-zinc-950"
              >
                <Icon name="monitor" size={4} hidden={group.kind === 'server'} />
                <Icon name="server" size={4} hidden={group.kind !== 'server'} />
              </span>
            </div>
            <div className="ndb:flex ndb:min-h-8 ndb:items-center">
              <h4 className="ndb:text-sm ndb:font-semibold ndb:leading-5">{group.label}</h4>
            </div>
            <div className="ndb:col-start-2 ndb:mt-1">
              <p
                hidden={group.kind !== 'server'}
                className="ndb:max-w-sm ndb:text-sm ndb:leading-6 ndb:text-zinc-600 ndb:dark:text-zinc-300"
              >
                Processes the update and builds the response.
              </p>
              <ol hidden={group.steps.length === 0} className="ndb:m-0 ndb:list-none ndb:p-0">
                {group.steps.map(({ phase, index }) => (
                  <li
                    key={`${item.id}-${index}`}
                    data-ndb-livewire-phase={phase.name}
                    className="ndb:m-0 ndb:border-0 ndb:bg-transparent ndb:px-0 ndb:py-2 ndb:text-sm ndb:text-zinc-600 ndb:dark:text-zinc-300"
                  >
                    <div className="ndb:flex ndb:min-w-0 ndb:items-center ndb:gap-1">
                      <span data-ndb-livewire-phase-name="" className="ndb:min-w-0 ndb:text-sm ndb:leading-5">
                        {state.livewirePhaseLabel(phase.name)}
                      </span>
                      <IconButton
                        data-ndb-livewire-phase-trigger=""
                        id={triggerId(index)}
                        aria-label={`Explain ${state.livewirePhaseLabel(phase.name)}`}
                        aria-expanded={open === index}
                        aria-describedby={open === index ? helpId : undefined}
                        onPointerEnter={(event) => {
                          if (event.pointerType !== 'touch') help.showPhaseHelp(index, event.currentTarget);
                        }}
                        onPointerLeave={() => help.leavePhaseHelp()}
                        onFocus={(event) => help.showPhaseHelp(index, event.currentTarget)}
                        onBlur={() => help.leavePhaseHelp()}
                        onKeyDown={(event) => {
                          if (event.key === 'Tab') help.closePhaseHelp();
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          help.togglePhaseHelp(index, event.currentTarget);
                        }}
                        className="ndb:-my-2.5 ndb:size-10 ndb:shrink-0 ndb:rounded-lg ndb:sm:-my-1 ndb:sm:size-7"
                        colorOnly
                      >
                        <Icon name="info" size={3.5} />
                      </IconButton>
                    </div>
                    <span
                      data-ndb-livewire-phase-time=""
                      className="ndb:mt-0.5 ndb:block ndb:text-xs ndb:leading-4 ndb:tabular-nums ndb:text-zinc-500 ndb:dark:text-zinc-400"
                    >
                      {`+${state.formatDuration(Math.max(0, phase.at - item.startedAt))}`}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </li>
        ))}
      </ol>

      {open !== null && portalTarget
        ? createPortal(
            <PhaseHelp
              help={help}
              id={helpId}
              description={state.livewirePhaseDescription(item.phases?.[open]?.name)}
            />,
            portalTarget,
          )
        : null}
    </section>
  );
}
