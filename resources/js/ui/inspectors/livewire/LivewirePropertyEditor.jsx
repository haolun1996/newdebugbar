import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx, useShell } from '../../../app/hooks.js';
import { PopoverSurface } from '../../components/PopoverSurface.jsx';
import { useClickOutside } from '../../shell/useClickOutside.js';
import { useAnchor } from './useAnchor.js';

const FIELD =
  'ndb:h-9 ndb:w-full ndb:rounded-lg ndb:border ndb:border-zinc-200 ndb:bg-white ndb:px-3 ndb:text-xs ndb:outline-none ndb:focus:border-indigo-400 ndb:focus:ring-2 ndb:focus:ring-indigo-500/15 ndb:dark:border-zinc-700 ndb:dark:bg-zinc-900';

function BooleanControl({ state, row, draft }) {
  return (
    <button
      type="button"
      role="switch"
      data-ndb-livewire-edit-control=""
      aria-checked={Boolean(draft.value)}
      onClick={() => state.toggleLivewireBoolean(row)}
      className="ndb:group ndb:flex ndb:w-full ndb:items-center ndb:justify-center ndb:gap-3 ndb:focus-visible:outline-none"
    >
      <span
        data-ndb-livewire-boolean-label="false"
        className={cx(
          'ndb:text-right ndb:text-xs ndb:leading-none ndb:font-semibold ndb:transition-colors',
          draft.value ? 'ndb:text-zinc-400' : 'ndb:font-bold ndb:text-zinc-900 ndb:dark:text-zinc-100',
        )}
      >
        False
      </span>
      <span
        aria-hidden="true"
        className="ndb:relative ndb:h-6 ndb:w-11 ndb:shrink-0 ndb:rounded-full ndb:bg-zinc-300 ndb:shadow-inner ndb:transition-colors ndb:group-aria-checked:bg-indigo-600 ndb:group-focus-visible:ring-2 ndb:group-focus-visible:ring-indigo-500 ndb:group-focus-visible:ring-offset-2 ndb:dark:bg-zinc-700 ndb:dark:group-aria-checked:bg-indigo-500 ndb:dark:group-focus-visible:ring-indigo-400 ndb:dark:group-focus-visible:ring-offset-zinc-950"
      >
        <span className="ndb:absolute ndb:top-0.5 ndb:left-0.5 ndb:size-5 ndb:rounded-full ndb:bg-white ndb:shadow-sm ndb:transition-transform ndb:group-aria-checked:translate-x-5" />
      </span>
      <span
        data-ndb-livewire-boolean-label="true"
        className={cx(
          'ndb:text-left ndb:text-xs ndb:leading-none ndb:font-semibold ndb:transition-colors',
          draft.value ? 'ndb:font-bold ndb:text-zinc-900 ndb:dark:text-zinc-100' : 'ndb:text-zinc-400',
        )}
      >
        True
      </span>
    </button>
  );
}

function PropertyPopover({ state, row, draft, trigger, ids }) {
  const surface = useClickOutside(() => {
    if (draft.status !== 'updating') state.cancelLivewireDraft(row);
  });
  useAnchor(surface, trigger, 'bottom-end');

  useEffect(() => {
    surface.current?.querySelector('[data-ndb-livewire-edit-control]')?.focus();
  }, [surface]);

  // Text and number fields stay uncontrolled so typing never fights the store; each type gets a fresh field.
  const write = (event) => {
    draft.value = event.target.value;
  };
  const apply = () => state.applyLivewireDraft(row, trigger);

  return (
    <PopoverSurface
      ref={surface}
      anchored
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        event.preventDefault();
        state.cancelLivewireDraft(row, true);
      }}
      data-ndb-livewire-property-popover=""
      id={ids.popover}
      aria-labelledby={ids.title}
      role="dialog"
      direction="below"
      align="left"
      widthClass="ndb:w-[min(21rem,calc(100vw-3rem))]"
      surfaceClass="ndb:p-0"
      arrowClass="ndb:hidden"
      className="ndb:pointer-events-auto ndb:py-3"
    >
      <div className="ndb:border-b ndb:border-zinc-200/80 ndb:px-4 ndb:py-3 ndb:dark:border-zinc-700/80">
        <p id={ids.title} className="ndb:truncate ndb:text-xs ndb:font-bold" title={row.path}>
          Edit <span>{row.path}</span>
        </p>
      </div>

      <div className="ndb:space-y-3 ndb:px-4 ndb:py-3">
        {row.value === null ? (
          <select
            data-ndb-livewire-edit-control=""
            value={draft.type}
            onChange={(event) => {
              draft.type = event.target.value;
            }}
            aria-label={`Value type for ${row.path}`}
            className={FIELD}
          >
            <option>String</option>
            <option>Integer</option>
            <option>Float</option>
            <option>Boolean</option>
          </select>
        ) : null}

        {draft.type === 'Boolean' ? <BooleanControl state={state} row={row} draft={draft} /> : null}

        {['Integer', 'Float'].includes(draft.type) ? (
          <input
            key={draft.type}
            data-ndb-livewire-edit-control=""
            defaultValue={draft.value}
            onChange={write}
            type="number"
            aria-keyshortcuts="Enter"
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.stopPropagation();
              state.applyLivewireDraftOnEnter(row, trigger, event.nativeEvent);
            }}
            step={draft.type === 'Float' ? 'any' : '1'}
            aria-label={`New value for ${row.path}`}
            className={FIELD}
          />
        ) : null}

        {draft.type === 'String' ? (
          <div className="ndb:space-y-2">
            <textarea
              data-ndb-livewire-edit-control=""
              defaultValue={draft.value}
              onChange={write}
              rows={3}
              aria-label={`New value for ${row.path}`}
              aria-keyshortcuts="Meta+Enter Control+Enter"
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
                event.stopPropagation();
                event.preventDefault();
                apply();
              }}
              className="ndb:field-sizing-content ndb:max-h-[min(20rem,50vh)] ndb:min-h-20 ndb:w-full ndb:resize-y ndb:overflow-y-auto ndb:rounded-lg ndb:border ndb:border-zinc-200 ndb:bg-white ndb:px-3 ndb:py-2.5 ndb:text-xs ndb:leading-5 ndb:outline-none ndb:focus:border-indigo-400 ndb:focus:ring-2 ndb:focus:ring-indigo-500/15 ndb:dark:border-zinc-700 ndb:dark:bg-zinc-900"
            />
            <kbd aria-hidden="true" className="ndb:block ndb:text-xs ndb:font-semibold ndb:text-zinc-400">
              ⌘/Ctrl + Enter
            </kbd>
          </div>
        ) : null}

        <p
          hidden={!draft.error}
          role="alert"
          className="ndb:text-xs ndb:font-semibold ndb:text-red-700 ndb:dark:text-red-300"
        >
          {draft.error}
        </p>
      </div>

      <div className="ndb:flex ndb:items-center ndb:justify-end ndb:gap-3 ndb:border-t ndb:border-zinc-200/80 ndb:bg-zinc-50/70 ndb:px-4 ndb:py-3 ndb:dark:border-zinc-700/80 ndb:dark:bg-zinc-950/30">
        <div className="ndb:flex ndb:shrink-0 ndb:gap-2">
          <button
            data-ndb-livewire-edit-cancel=""
            type="button"
            onClick={() => state.cancelLivewireDraft(row, true)}
            className="ndb:h-9 ndb:rounded-lg ndb:px-3 ndb:text-xs ndb:font-bold ndb:text-zinc-500 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-zinc-400"
          >
            Cancel
          </button>
          <button
            data-ndb-livewire-edit-apply=""
            type="button"
            onClick={apply}
            disabled={draft.status === 'updating'}
            className="ndb:h-9 ndb:rounded-lg ndb:bg-indigo-600 ndb:px-3 ndb:text-xs ndb:font-bold ndb:text-white ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-2 ndb:focus-visible:outline-indigo-500 ndb:disabled:opacity-50 ndb:dark:bg-indigo-500"
          >
            <span>{draft.status === 'updating' ? 'Applying…' : 'Apply'}</span>
          </button>
        </div>
      </div>
    </PopoverSurface>
  );
}

/** The Edit control for one editable property row and its anchored editor popover. */
export function LivewirePropertyEditor({ state, row }) {
  const shell = useShell();
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const ids = {
    trigger: `newdebugbar-livewire-edit-trigger-${uid}`,
    popover: `newdebugbar-livewire-edit-popover-${uid}`,
    title: `newdebugbar-livewire-edit-title-${uid}`,
  };
  const [trigger, setTrigger] = useState(null);
  const key = state.livewireDraftKey(row);
  const draft = state.livewireDrafts[key];
  const open = Boolean(draft && draft.status !== 'closing');
  const portalTarget = shell.$root ?? document.getElementById('newdebugbar');

  return (
    <div
      className="ndb:relative ndb:w-full ndb:sm:w-auto ndb:sm:justify-self-end"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        if (state.livewireDrafts[key]) state.cancelLivewireDraft(row, true);
      }}
    >
      <button
        ref={setTrigger}
        hidden={!row.editable}
        type="button"
        id={ids.trigger}
        data-ndb-livewire-edit-key={key}
        aria-controls={ids.popover}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          state.toggleLivewirePropertyEditor(row);
        }}
        className={cx(
          'ndb:inline-flex ndb:h-7 ndb:items-center ndb:rounded-md ndb:px-2 ndb:text-xs ndb:font-bold ndb:text-indigo-600 ndb:transition ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:dark:text-indigo-300',
          open
            ? 'ndb:bg-indigo-50 ndb:dark:bg-indigo-950/60'
            : 'ndb:hover:bg-zinc-100 ndb:dark:hover:bg-zinc-800',
        )}
      >
        Edit
      </button>

      {open && trigger && portalTarget
        ? createPortal(
            <PropertyPopover state={state} row={row} draft={draft} trigger={trigger} ids={ids} />,
            portalTarget,
          )
        : null}
    </div>
  );
}
