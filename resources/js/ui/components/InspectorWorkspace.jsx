import { cx } from '../../app/hooks.js';
import { InspectorDetailBack } from './InspectorDetailBack.jsx';

const FRAMES = {
  card: 'ndb:rounded-xl ndb:border ndb:border-zinc-200/90 ndb:dark:border-zinc-800',
  top: 'ndb:-mx-3 ndb:border-t ndb:border-zinc-200/90 ndb:sm:mx-0 ndb:dark:border-zinc-800',
};

const MODES = {
  split:
    'ndb:overflow-hidden ndb:bg-white/45 ndb:lg:grid ndb:lg:min-h-0 ndb:lg:flex-1 ndb:lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.68fr)] ndb:dark:bg-zinc-950/35',
  focus: 'ndb:min-h-0 ndb:min-w-0 ndb:flex-1',
  stream:
    'ndb:flex ndb:min-h-0 ndb:min-w-0 ndb:flex-1 ndb:flex-col ndb:overflow-hidden ndb:bg-white/45 ndb:dark:bg-zinc-950/35',
};

const split = ({ className, ...attributes } = {}) => [className, attributes];

/**
 * Inspector workspace frame (inspector-workspace.blade.php).
 * Common props: mode ('split' | 'focus' | 'stream'), frame ('card' | 'top'), className, other <div> attributes.
 * split: children (InspectorListPanel + InspectorDetailPane).
 * focus: list + listProps, detail + detailProps, detailOpen (boolean; shows detail instead of list), detailId
 *   (required, must start with 'newdebugbar'), detailRef (ref for the detail <section>), detailLabel, backLabel, onClose.
 * stream: controls + controlsProps, header + headerProps, body + bodyProps (falls back to children), empty + emptyProps.
 */
export function InspectorWorkspace({
  mode = 'split',
  frame = 'card',
  detailOpen = false,
  detailId = null,
  detailRef,
  detailLabel = 'Selected item details',
  backLabel = 'Items',
  onClose,
  list,
  listProps,
  detail,
  detailProps,
  controls,
  controlsProps,
  header,
  headerProps,
  body,
  bodyProps,
  empty,
  emptyProps,
  className,
  children,
  ...rest
}) {
  if (!FRAMES[frame]) throw new Error(`Unknown inspector workspace frame [${frame}].`);
  if (!MODES[mode]) throw new Error(`Unknown inspector workspace mode [${mode}].`);
  if (mode === 'focus' && (typeof detailId !== 'string' || !detailId.startsWith('newdebugbar'))) {
    throw new Error('Focused inspector workspaces require a namespaced detail ID.');
  }

  let content = children;

  if (mode === 'focus') {
    const [listClass, listAttributes] = split(listProps);
    const [detailClass, detailAttributes] = split(detailProps);

    content = (
      <>
        <div
          hidden={Boolean(detailOpen)}
          data-ndb-inspector-focus-list=""
          {...listAttributes}
          className={cx('ndb:min-w-0', listClass)}
        >
          {list}
        </div>

        <section
          id={detailId}
          hidden={!detailOpen}
          ref={detailRef}
          data-ndb-inspector-focus-detail=""
          aria-live="polite"
          aria-label={detailLabel}
          tabIndex={-1}
          {...detailAttributes}
          className={cx(
            'ndb:@container ndb:min-w-0 ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500',
            detailClass,
          )}
        >
          <InspectorDetailBack
            persistent
            data-ndb-inspector-focus-back=""
            onClick={onClose}
            label={backLabel}
          />

          {detail}
        </section>
      </>
    );
  } else if (mode === 'stream') {
    const [controlsClass, controlsAttributes] = split(controlsProps);
    const [headerClass, headerAttributes] = split(headerProps);
    const [bodyClass, bodyAttributes] = split(bodyProps);
    const [emptyClass, emptyAttributes] = split(emptyProps);

    content = (
      <>
        {controls !== undefined ? (
          <div
            {...controlsAttributes}
            className={cx(
              'ndb:border-b ndb:border-zinc-200/90 ndb:p-3 ndb:dark:border-zinc-800',
              controlsClass,
            )}
          >
            {controls}
          </div>
        ) : null}

        {header !== undefined ? (
          <div
            {...headerAttributes}
            className={cx('ndb:border-b ndb:border-zinc-200/90 ndb:dark:border-zinc-800', headerClass)}
          >
            {header}
          </div>
        ) : null}

        <div
          data-ndb-inspector-stream-body=""
          {...(body !== undefined ? bodyAttributes : {})}
          className={cx(
            'ndb-scrollbar ndb:min-h-0 ndb:flex-1 ndb:overflow-y-auto',
            body !== undefined ? bodyClass : null,
          )}
        >
          {body !== undefined ? body : children}
        </div>

        {empty !== undefined ? (
          <div {...emptyAttributes} className={cx('ndb:p-3', emptyClass)}>
            {empty}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div {...rest} className={cx(MODES[mode], FRAMES[frame], className)}>
      {content}
    </div>
  );
}
