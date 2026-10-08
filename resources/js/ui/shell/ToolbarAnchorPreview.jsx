import { cx, useShell } from '../../app/hooks.js';

/** Highlights the anchor a dragged toolbar will pin to. */
export function ToolbarAnchorPreview({ placement }) {
  const shell = useShell();
  const isTop = placement.startsWith('top');
  const isLeft = placement.endsWith('-left');
  const isRight = placement.endsWith('-right');
  const isCorner = isLeft || isRight;
  const active = shell.toolbarDragging && shell.toolbarDragTarget === placement;

  return (
    <div
      aria-hidden="true"
      data-ndb-toolbar-anchor={placement}
      data-ndb-active={active ? 'true' : undefined}
      style={
        isCorner
          ? undefined
          : {
              width: `${shell.toolbarPreviewWidth(placement)}px`,
              height: `${shell.toolbarPreviewHeight(placement)}px`,
            }
      }
      className={cx(
        'ndb:pointer-events-none ndb:fixed ndb:transition-[opacity,transform] ndb:duration-[180ms] ndb:ease-out',
        {
          'ndb:size-56 ndb:rounded-full ndb:bg-[radial-gradient(circle,rgba(99,102,241,0.24)_0%,rgba(99,102,241,0.14)_38%,rgba(99,102,241,0.05)_58%,transparent_78%)] ndb:dark:bg-[radial-gradient(circle,rgba(129,140,248,0.3)_0%,rgba(99,102,241,0.17)_40%,rgba(79,70,229,0.06)_60%,transparent_80%)]':
            isCorner,
          'ndb:rounded-[18px] ndb:border ndb:border-indigo-400/50 ndb:bg-indigo-500/10 ndb:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.08),0_12px_40px_-20px_rgba(79,70,229,0.55)]':
            !isCorner,
          'ndb:top-0': isCorner && isTop,
          'ndb:bottom-0': isCorner && !isTop,
          'ndb:left-0 ndb:-translate-x-1/2': isLeft,
          'ndb:right-0 ndb:translate-x-1/2': isRight,
          'ndb:-translate-y-1/2': isCorner && isTop,
          'ndb:translate-y-1/2': isCorner && !isTop,
          'ndb:top-3': !isCorner && isTop,
          'ndb:bottom-3': !isCorner && !isTop,
          'ndb:left-1/2 ndb:-translate-x-1/2': !isCorner,
        },
        active ? 'ndb:scale-100 ndb:opacity-100' : 'ndb:scale-[0.985] ndb:opacity-0',
      )}
    />
  );
}
