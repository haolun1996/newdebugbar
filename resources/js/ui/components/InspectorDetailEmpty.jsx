import { cx } from '../../app/hooks.js';

/** Placeholder shown in a detail pane with nothing selected (inspector-detail-empty.blade.php). Props: label, className. */
export function InspectorDetailEmpty({ label, className, ...rest }) {
  return (
    <div
      data-ndb-inspector-detail-empty=""
      {...rest}
      className={cx(
        'ndb:flex ndb:min-h-[32rem] ndb:flex-1 ndb:items-center ndb:justify-center ndb:p-6 ndb:lg:min-h-0',
        className,
      )}
    >
      <p className="ndb:max-w-sm ndb:text-center ndb:text-xs ndb:font-semibold ndb:text-zinc-400">{label}</p>
    </div>
  );
}
