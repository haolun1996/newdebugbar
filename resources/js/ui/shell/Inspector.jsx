import { Component, useEffect, useState } from 'react';
import { cx, useRefBinding, useShell } from '../../app/hooks.js';
import { Icon } from '../components/Icon.jsx';
import { InspectorAction } from '../components/InspectorAction.jsx';
import { InspectorHeading } from '../components/InspectorHeading.jsx';
import { InspectorHeader } from './InspectorHeader.jsx';
import { InspectorNavigation } from './InspectorNavigation.jsx';
import { InspectorPanel } from './InspectorPanel.jsx';

/**
 * Slides the inspector in from its toolbar edge: the panel first renders offscreen, then moves
 * onscreen with a transition once that frame has painted.
 */
function useEnterTransition(open) {
  const [phase, setPhase] = useState(null);
  const [wasOpen, setWasOpen] = useState(open);

  // Decide during render so the panel's first visible frame is already offscreen.
  if (open !== wasOpen) {
    setWasOpen(open);
    setPhase(open ? 'start' : null);
  }

  useEffect(() => {
    if (phase !== 'start') return undefined;

    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => setPhase('end'));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'end') return undefined;

    const timer = window.setTimeout(() => setPhase(null), 400);

    return () => window.clearTimeout(timer);
  }, [phase]);

  return {
    className:
      phase === null
        ? ''
        : cx(
            'ndb:transition ndb:duration-200 ndb:ease-out ndb:motion-reduce:transition-none',
            phase === 'start' ? 'ndb-inspector-offscreen' : 'ndb-inspector-onscreen',
          ),
    onTransitionEnd: (event) => {
      if (event.target === event.currentTarget && event.propertyName === 'transform') setPhase(null);
    },
  };
}

/**
 * Keeps a failing inspector from unmounting the whole bar: the shell shows its retry message
 * instead, and newly loaded inspector data renders again.
 */
class InspectorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(error);
    this.props.onError();
  }

  componentDidUpdate(previous) {
    if (this.state.failed && previous.data !== this.props.data) this.setState({ failed: false });
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Renders the expanded inspector shell, navigation, and inspector content. */
export function Inspector() {
  const shell = useShell();
  const visible = shell.barVisible && shell.inspectorOpen;
  const transition = useEnterTransition(visible);
  const contentRef = useRefBinding(shell, 'content');
  const selected = shell.selectedInspector;

  return (
    <div hidden={!visible} className="ndb:pointer-events-auto ndb:fixed ndb:inset-0" role="presentation">
      <div
        data-ndb-backdrop
        hidden={!visible}
        onClick={() => shell.closeInspector()}
        className="ndb:absolute ndb:inset-0 ndb:bg-zinc-950/30 ndb:backdrop-blur-[1px] ndb:dark:bg-black/55"
      />

      <aside
        hidden={!visible}
        data-ndb-placement={shell.toolbarVerticalPlacement}
        role="dialog"
        aria-modal="true"
        aria-label="Request inspector"
        onKeyDown={(event) => shell.keepFocusWithin(event, event.currentTarget)}
        onTransitionEnd={transition.onTransitionEnd}
        className={cx(
          'ndb-inspector-panel ndb:absolute ndb:inset-x-0 ndb:mx-auto ndb:flex ndb:h-[min(82vh,780px)] ndb:w-full ndb:max-w-8xl ndb:max-h-[calc(100vh-12px)] ndb:flex-col ndb:overflow-hidden ndb:border-white/70 ndb:bg-white/90 ndb:backdrop-blur-2xl ndb:dark:border-zinc-800/80 ndb:dark:bg-zinc-950/90',
          shell.toolbarIsTop
            ? 'ndb:top-0 ndb:rounded-b-2xl ndb:border-x ndb:border-b ndb:shadow-[0_24px_80px_-28px_rgba(24,24,27,0.5)]'
            : 'ndb:bottom-0 ndb:rounded-t-2xl ndb:border-x ndb:border-t ndb:shadow-[0_-24px_80px_-28px_rgba(24,24,27,0.5)]',
          transition.className,
        )}
      >
        <InspectorHeader />

        <div
          hidden={shell.backgroundActivityError === null}
          data-ndb-background-activity-error
          role="status"
          aria-live="polite"
          className="ndb:flex ndb:w-full ndb:min-w-0 ndb:shrink-0 ndb:items-center ndb:justify-between ndb:gap-3 ndb:border-b ndb:border-amber-200 ndb:bg-amber-50 ndb:px-3 ndb:py-2 ndb:text-xs ndb:text-amber-900 ndb:sm:px-6 ndb:dark:border-amber-900 ndb:dark:bg-amber-950 ndb:dark:text-amber-200"
        >
          <span className="ndb:min-w-0">{shell.backgroundActivityError}</span>
          <InspectorAction
            icon="activity"
            onClick={() => shell.refreshBackgroundActivity(true)}
            disabled={shell.activityRefreshPending}
            className="ndb:shrink-0"
          >
            Retry now
          </InspectorAction>
        </div>

        <div className="ndb:relative ndb:isolate ndb:flex ndb:min-h-0 ndb:flex-1 ndb:flex-col ndb:sm:flex-row">
          <nav
            id="newdebugbar-inspector-navigation"
            aria-label="Debug inspectors"
            className="ndb:hidden ndb:w-[210px] ndb:shrink-0 ndb:flex-col ndb:border-r ndb:border-zinc-200/80 ndb:bg-zinc-50/95 ndb:p-3 ndb:sm:flex ndb:dark:border-zinc-800/80 ndb:dark:bg-zinc-900/60"
          >
            {!shell.mobileToolbarMenu && (
              <InspectorNavigation
                id="newdebugbar-inspector-list"
                className="ndb-scrollbar ndb:overflow-y-auto"
              />
            )}
          </nav>

          <div
            data-ndb-inspector-content
            ref={contentRef}
            className="ndb-scrollbar ndb:min-w-0 ndb:flex-1 ndb:overflow-y-auto ndb:bg-white/70 ndb:lg:flex ndb:lg:flex-col ndb:dark:bg-zinc-950/70"
          >
            <InspectorHeading
              heading={selected.label}
              headingProps={{
                'data-ndb-inspector-heading': '',
                tabIndex: -1,
                'aria-describedby':
                  shell.selected === 'request' ? undefined : 'newdebugbar-inspector-description',
              }}
              description={selected.description}
              descriptionProps={{
                id: 'newdebugbar-inspector-description',
                'data-ndb-inspector-description': '',
                hidden: shell.selected === 'request',
              }}
            />

            <div
              data-ndb-inspector-stage
              aria-busy={shell.inspectorLoading ? 'true' : 'false'}
              className="ndb:relative ndb:min-h-64 ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col"
            >
              <div
                hidden={!shell.inspectorLoadingIndicator}
                data-ndb-inspector-loading
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="ndb:absolute ndb:inset-0 ndb:z-10 ndb:flex ndb:min-h-64 ndb:items-start ndb:justify-center ndb:bg-white/85 ndb:p-4 ndb:backdrop-blur-[1px] ndb:dark:bg-zinc-950/85 ndb:sm:p-6"
              >
                <div className="ndb:flex ndb:items-center ndb:gap-3 ndb:rounded-xl ndb:border ndb:border-zinc-200 ndb:bg-white/90 ndb:px-4 ndb:py-3 ndb:shadow-sm ndb:dark:border-zinc-800 ndb:dark:bg-zinc-900/90">
                  <span className="ndb-loading-pulse ndb:grid ndb:size-8 ndb:shrink-0 ndb:place-items-center ndb:rounded-lg ndb:bg-indigo-50 ndb:text-indigo-600 ndb:dark:bg-indigo-950 ndb:dark:text-indigo-300">
                    <Icon name="clock" className="ndb:size-4" />
                  </span>
                  <span className="ndb:text-sm ndb:font-semibold">
                    Loading <span>{String(selected.label ?? '').toLowerCase()}</span>…
                  </span>
                </div>
              </div>

              <div
                data-ndb-inspector-body
                className={cx(
                  'ndb:transition-opacity ndb:duration-150 ndb:ease-out ndb:lg:flex ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:flex-col ndb:motion-reduce:transition-none',
                  shell.inspectorTransitioning ? 'ndb:opacity-0' : 'ndb:opacity-100',
                )}
              >
                <div
                  hidden={!shell.inspectorError}
                  role="alert"
                  className="ndb:m-4 ndb:rounded-xl ndb:border ndb:border-red-200 ndb:bg-red-50/70 ndb:p-4 ndb:dark:border-red-950 ndb:dark:bg-red-950/25 ndb:sm:m-6"
                >
                  <p className="ndb:text-sm ndb:font-bold ndb:text-red-800 ndb:dark:text-red-200">
                    Collector details could not be loaded.
                  </p>
                  <p className="ndb:mt-1 ndb:text-xs ndb:text-red-700/80 ndb:dark:text-red-300/80">
                    The request summary is still available. Retry or reload the page to capture a new request.
                  </p>
                  <div className="ndb:mt-3 ndb:flex ndb:flex-wrap ndb:gap-2">
                    <button
                      type="button"
                      onClick={() => shell.requestInspector(shell.selected, true)}
                      className="ndb:rounded-lg ndb:bg-red-700 ndb:px-3 ndb:py-2 ndb:text-xs ndb:font-bold ndb:text-white ndb:focus-visible:outline-2 ndb:focus-visible:outline-offset-2 ndb:focus-visible:outline-red-500 ndb:dark:bg-red-300 ndb:dark:text-red-950"
                    >
                      Retry inspector
                    </button>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="ndb:rounded-lg ndb:border ndb:border-red-300 ndb:px-3 ndb:py-2 ndb:text-xs ndb:font-bold ndb:text-red-800 ndb:focus-visible:outline-2 ndb:focus-visible:outline-red-500 ndb:dark:border-red-900 ndb:dark:text-red-200"
                    >
                      Reload page
                    </button>
                  </div>
                </div>

                <InspectorBoundary
                  data={shell.inspectorData}
                  onError={() => {
                    shell.inspectorError = true;
                  }}
                >
                  <InspectorPanel />
                </InspectorBoundary>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
