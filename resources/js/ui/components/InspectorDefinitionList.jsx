import { cx } from '../../app/hooks.js';

/** Divided <dl> for InspectorDefinitionRow children (inspector-definition-list.blade.php). Props: className, children. */
export function InspectorDefinitionList({ className, children, ...rest }) {
  return (
    <dl {...rest} className={cx('ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800', className)}>
      {children}
    </dl>
  );
}
