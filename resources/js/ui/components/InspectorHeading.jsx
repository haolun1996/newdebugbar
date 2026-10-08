import { cx } from '../../app/hooks.js';

/**
 * Inspector title block (inspector-heading.blade.php). Props: heading, headingProps (attributes for the <h2>,
 * e.g. tabIndex/id), description, descriptionProps (attributes for the <p>), className.
 */
export function InspectorHeading({
  heading,
  headingProps = {},
  description,
  descriptionProps = {},
  className,
  ...rest
}) {
  const { className: headingClass, ...headingAttributes } = headingProps;
  const { className: descriptionClass, ...descriptionAttributes } = descriptionProps;

  return (
    <header
      data-ndb-inspector-header=""
      {...rest}
      className={cx('ndb:px-3 ndb:pt-3 ndb:sm:px-6 ndb:sm:pt-6', className)}
    >
      <h2
        {...headingAttributes}
        className={cx('ndb:text-base ndb:font-bold ndb:leading-5 ndb:focus:outline-none', headingClass)}
      >
        {heading}
      </h2>

      <p
        {...descriptionAttributes}
        className={cx(
          'ndb:mt-0.5 ndb:max-w-3xl ndb:text-xs ndb:leading-4 ndb:text-zinc-500 ndb:dark:text-zinc-400',
          descriptionClass,
        )}
      >
        {description}
      </p>
    </header>
  );
}
