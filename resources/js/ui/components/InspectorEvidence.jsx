import { cx } from '../../app/hooks.js';
import { CodeBlock } from './CodeBlock.jsx';

/**
 * Labelled highlighted evidence block (inspector-evidence.blade.php). Props: label, aside (node at the heading's
 * end, e.g. an InspectorAction copy button), language (default 'json'), wrap (default true), value (code text),
 * valueProps (attributes for the <code>, e.g. data-ndb-query-explain-plan), className.
 */
export function InspectorEvidence({
  label = null,
  aside,
  language = 'json',
  wrap = true,
  value,
  valueProps = {},
  className,
  ...rest
}) {
  const hasLabel = label !== null && label !== undefined;

  return (
    <section data-ndb-inspector-evidence="" {...rest} className={cx('ndb:min-w-0', className)}>
      {hasLabel || aside !== undefined ? (
        <div className="ndb:mb-2 ndb:flex ndb:items-center ndb:justify-between ndb:gap-3">
          {hasLabel ? <h4 className="ndb:text-sm ndb:font-semibold">{label}</h4> : null}
          {aside !== undefined ? <div className="ndb:shrink-0">{aside}</div> : null}
        </div>
      ) : null}
      <CodeBlock language={language} wrap={wrap} source={value ?? ''} codeProps={valueProps} />
    </section>
  );
}
