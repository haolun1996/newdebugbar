import { cx, useShell } from '../../app/hooks.js';
import { IconButton } from '../components/IconButton.jsx';

/** Expand, shrink, and close controls shared by the toolbar and the inspector header. */
export function WindowControls({ darkSurface = false, className, ...rest }) {
  const shell = useShell();
  const open = shell.inspectorOpen;

  return (
    <div
      role="group"
      aria-label="Window controls"
      {...rest}
      className={cx('ndb:flex ndb:items-center', className)}
    >
      <IconButton
        name="expand"
        iconClass="ndb:size-4 ndb:translate-x-2"
        darkSurface={darkSurface}
        colorOnly
        data-ndb-window-action="expand"
        onClick={() => shell.openInspector()}
        disabled={open}
        aria-label={open ? 'Expand debug bar (already expanded)' : 'Expand debug bar'}
        title={open ? 'Already expanded' : 'Expand debug bar'}
        className="ndb:size-8 ndb:rounded-lg"
      />
      <IconButton
        name="shrink"
        darkSurface={darkSurface}
        colorOnly
        data-ndb-window-action="shrink"
        onClick={() => shell.closeInspector()}
        disabled={!open}
        aria-label={open ? 'Shrink debug bar' : 'Shrink debug bar (already compact)'}
        title={open ? 'Shrink debug bar' : 'Already compact'}
        className="ndb:size-8 ndb:rounded-lg"
      />
      <IconButton
        name="close"
        iconClass="ndb:size-4 ndb:-translate-x-2"
        darkSurface={darkSurface}
        colorOnly
        data-ndb-window-action="close"
        onClick={() => shell.dismissBar()}
        className="ndb:size-8 ndb:rounded-lg"
        aria-label="Close debug bar until reload"
        title="Close debug bar until reload"
      />
    </div>
  );
}
