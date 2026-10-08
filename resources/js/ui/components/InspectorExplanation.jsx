import { cx } from '../../app/hooks.js';

/**
 * Small explanation header for a table or evidence group (inspector-explanation.blade.php). Props: title,
 * description, heading + headingProps (node wrapped in a <span> replacing title), body + bodyProps (node wrapped
 * in a <span> replacing description), className.
 */
export function InspectorExplanation({
  title = null,
  description = null,
  heading,
  headingProps = {},
  body,
  bodyProps = {},
  className,
  ...rest
}) {
  return (
    <header {...rest} className={cx('ndb:min-w-0', className)}>
      <h4 className="ndb:text-xs ndb:font-bold">
        {heading !== undefined ? <span {...headingProps}>{heading}</span> : title}
      </h4>
      <p className="ndb:mt-0.5 ndb:max-w-3xl ndb:text-xs ndb:leading-5 ndb:text-zinc-500 ndb:dark:text-zinc-400">
        {body !== undefined ? <span {...bodyProps}>{body}</span> : description}
      </p>
    </header>
  );
}
