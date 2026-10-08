import { cx } from '../../app/hooks.js';
import { frameCount } from './frames.js';
import { InspectorDisclosure } from './InspectorDisclosure.jsx';
import { InspectorStack } from './InspectorStack.jsx';

const COLUMNS = { 1: 'ndb:grid-cols-1', 2: 'ndb:grid-cols-1 ndb:@2xl:grid-cols-2' };

/**
 * Source facts plus a collapsible application stack (inspector-source-panel.blade.php). Props: frames (array of
 * { file, line, function }; the stack disclosure renders only when non-empty), columns (1 | 2), emptyLabel, title,
 * actions + actionsProps (node at the heading's end), resetKey (closes the stack disclosure when it changes),
 * className, children (InspectorSourceFact rows).
 */
export function InspectorSourcePanel({
  frames = [],
  columns = 1,
  emptyLabel = 'No application stack was captured.',
  title = null,
  actions,
  actionsProps = {},
  resetKey,
  className,
  children,
  ...rest
}) {
  const columnClasses = COLUMNS[Number(columns)];
  if (!columnClasses) throw new Error(`Unsupported inspector source panel column count [${columns}].`);

  const hasTitle = title !== null && title !== undefined;
  const hasActions = actions !== undefined;
  const { className: actionsClass, ...actionsAttributes } = actionsProps;

  return (
    <section data-ndb-inspector-source-panel="" {...rest} className={cx('ndb:p-3 ndb:sm:p-4', className)}>
      {hasTitle || hasActions ? (
        <div
          className={cx('ndb:mb-3 ndb:flex ndb:items-center ndb:gap-3', {
            'ndb:justify-between': hasTitle && hasActions,
            'ndb:justify-end': !hasTitle && hasActions,
          })}
        >
          {hasTitle ? (
            <h4 className="ndb:text-sm ndb:font-semibold ndb:text-zinc-800 ndb:dark:text-zinc-100">
              {title}
            </h4>
          ) : null}
          {hasActions ? (
            <div {...actionsAttributes} className={cx('ndb:shrink-0', actionsClass)}>
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      <dl
        className={cx(
          'ndb:grid ndb:min-w-0 ndb:gap-x-6 ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800',
          columnClasses,
        )}
      >
        {children}
      </dl>

      {frames.length > 0 ? (
        <InspectorDisclosure label="Application stack" resetKey={resetKey} count={frameCount(frames)}>
          <InspectorStack
            frames={frames}
            emptyLabel={emptyLabel}
            showHeading={false}
            className="ndb:mt-0 ndb:sm:mt-0"
          />
        </InspectorDisclosure>
      ) : null}
    </section>
  );
}
