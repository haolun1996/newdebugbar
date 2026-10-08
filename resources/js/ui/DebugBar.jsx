import { useCallback, useEffect } from 'react';
import { cx, registerScope, useRefBinding, useShell, useWindowEvent } from '../app/hooks.js';
import { Icon } from './components/Icon.jsx';
import { Inspector } from './shell/Inspector.jsx';
import { Toolbar } from './shell/Toolbar.jsx';
import { ToolbarAnchorPreview } from './shell/ToolbarAnchorPreview.jsx';

const ANCHORS = ['top-left', 'top', 'top-right', 'bottom-left', 'bottom', 'bottom-right'];

/** The bar root: owns the shell lifecycle, window events, and the command palette. */
export function DebugBar() {
  const shell = useShell();

  const rootRef = useCallback(
    (element) => {
      if (!element) return;
      shell.$root = element;
      registerScope(element, shell);
    },
    [shell],
  );

  useEffect(() => {
    shell.init();

    return () => shell.destroy();
  }, [shell]);

  useWindowEvent('keydown', (event) => shell.handleShortcut(event));
  useWindowEvent('focus', () => shell.loadRecentProfiles());
  useWindowEvent('newdebugbar-content-updated', () =>
    shell.$nextTick(() => {
      shell.syncInspectorHeading();
      shell.syncInspectorPanels();
      shell.refreshInspector();
      shell.syncHostLock();
      window.newDebugBarHighlight?.(shell.$root);
    }),
  );
  useWindowEvent('newdebugbar-profile-switched', (event) => shell.switchProfile(event.detail.summary));
  useWindowEvent('newdebugbar-profile-noticed', (event) => shell.receiveProfile(event.detail.summary));
  useWindowEvent('newdebugbar-profile-refreshed', (event) =>
    shell.receiveActivityRefresh(event.detail.summary, event.detail.relatedProfiles),
  );
  useWindowEvent('newdebugbar-recent-profiles-loaded', (event) =>
    shell.receiveRecentProfiles(event.detail.profiles),
  );
  useWindowEvent('newdebugbar-inspector-loaded', (event) =>
    shell.receiveInspector(event.detail.inspector, event.detail.profileId),
  );

  return (
    <div
      id="newdebugbar"
      ref={rootRef}
      data-ndb-theme={shell.resolvedTheme}
      className="ndb:pointer-events-none ndb:fixed ndb:inset-0 ndb:z-[2147483000] ndb:text-zinc-900 ndb:dark:text-zinc-100"
    >
      <span id="newdebugbar-toolbar-drag-hint" className="ndb:sr-only">
        Drag this toolbar to pin it to the top, bottom, or any corner. The command palette offers the same
        actions.
      </span>

      {ANCHORS.map((placement) => (
        <ToolbarAnchorPreview key={placement} placement={placement} />
      ))}

      <Toolbar />

      <Inspector />

      <CommandPalette />
    </div>
  );
}

function CommandPalette() {
  const shell = useShell();
  const searchRef = useRefBinding(shell, 'paletteSearch');
  const filtered = shell.filteredCommands;
  const activeId = filtered[shell.paletteIndex]?.id;
  const commandClass = (id) =>
    cx(
      'ndb:flex ndb:w-full ndb:items-center ndb:gap-3 ndb:rounded-lg ndb:px-3 ndb:py-2.5 ndb:text-left ndb:transition',
      activeId === id
        ? 'ndb:bg-blue-100/60 ndb:text-blue-700 ndb:dark:bg-indigo-950/60 ndb:dark:text-indigo-200'
        : 'ndb:text-zinc-700 ndb:dark:text-zinc-300',
    );

  return (
    <div
      hidden={!shell.paletteOpen}
      className="ndb:pointer-events-auto ndb:fixed ndb:inset-0 ndb:z-50 ndb:grid ndb:justify-items-center ndb:bg-zinc-950/45 ndb:px-3 ndb:pt-[12vh] ndb:backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && shell.closePalette()}
    >
      <div
        hidden={!shell.paletteOpen}
        onKeyDown={(event) => shell.keepFocusWithin(event, event.currentTarget)}
        className="ndb:w-full ndb:max-w-xl ndb:self-start ndb:overflow-hidden ndb:rounded-2xl ndb:border ndb:border-white/70 ndb:bg-white/90 ndb:shadow-2xl ndb:backdrop-blur-2xl ndb:dark:border-zinc-700/80 ndb:dark:bg-zinc-900/90"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="ndb:flex ndb:items-center ndb:gap-3 ndb:border-b ndb:border-zinc-200 ndb:px-4 ndb:dark:border-zinc-800">
          <Icon name="search" className="ndb:size-5 ndb:text-zinc-400" />
          <input
            data-ndb-palette-search
            ref={searchRef}
            value={shell.paletteSearch}
            onChange={(event) => {
              shell.paletteSearch = event.target.value;
              shell.paletteIndex = 0;
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                shell.movePalette(1);
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                shell.movePalette(-1);
              } else if (event.key === 'Enter') {
                event.preventDefault();
                shell.runActiveCommand();
              }
            }}
            type="search"
            placeholder="Jump to an inspector or change a setting…"
            className="ndb:h-14 ndb:min-w-0 ndb:flex-1 ndb:border-0 ndb:bg-transparent ndb:text-sm ndb:font-medium ndb:outline-none ndb:placeholder:text-zinc-400"
          />
          <kbd className="ndb:rounded-md ndb:border ndb:border-zinc-200 ndb:bg-zinc-50 ndb:px-1.5 ndb:py-1 ndb:text-xs ndb:font-bold ndb:text-zinc-400 ndb:dark:border-zinc-700 ndb:dark:bg-zinc-800">
            ESC
          </kbd>
        </div>
        <div className="ndb-scrollbar ndb:max-h-[min(420px,60vh)] ndb:overflow-y-auto ndb:p-2">
          {shell.allCommands.map((command) => (
            <button
              key={command.id}
              hidden={shell.commandIndex(command.id) === -1}
              type="button"
              data-ndb-command={command.id}
              onMouseEnter={() => (shell.paletteIndex = shell.commandIndex(command.id))}
              onClick={() => shell.runCommand(command.id)}
              className={commandClass(command.id)}
            >
              <span className="ndb:flex-1 ndb:text-sm ndb:font-semibold">{command.label}</span>
              <span className="ndb:text-xs ndb:font-bold ndb:uppercase ndb:tracking-wider ndb:text-zinc-400">
                {command.hint}
              </span>
            </button>
          ))}
          <button
            hidden={shell.commandIndex('collectors:show') === -1}
            type="button"
            data-ndb-command="collectors:show"
            onMouseEnter={() => (shell.paletteIndex = shell.commandIndex('collectors:show'))}
            onClick={() => shell.runCommand('collectors:show')}
            className={commandClass('collectors:show')}
          >
            <span className="ndb:flex-1 ndb:text-sm ndb:font-semibold">Show other collectors</span>
            <span className="ndb:text-xs ndb:font-bold ndb:uppercase ndb:tracking-wider ndb:text-zinc-400">
              {`${shell.hiddenCommandCount} hidden`}
            </span>
          </button>
          <p
            hidden={filtered.length !== 0}
            className="ndb:px-3 ndb:py-8 ndb:text-center ndb:text-sm ndb:text-zinc-500"
          >
            No matching commands.
          </p>
        </div>
        <div className="ndb:flex ndb:items-center ndb:gap-3 ndb:border-t ndb:border-zinc-200 ndb:bg-zinc-50 ndb:px-4 ndb:py-2 ndb:text-xs ndb:font-medium ndb:text-zinc-400 ndb:dark:border-zinc-800 ndb:dark:bg-zinc-950">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span className="ndb:ml-auto">⌘/Ctrl ⇧ P</span>
        </div>
      </div>
    </div>
  );
}
