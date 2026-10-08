import { useCallback, useLayoutEffect, useRef } from 'react';
import { cx } from '../../app/hooks.js';

/** Converts a text-only child (string, number, or an array of them) to the source text. */
function textOf(children) {
  if (children === null || children === undefined || typeof children === 'boolean') return '';
  if (Array.isArray(children)) return children.map(textOf).join('');
  if (typeof children === 'string' || typeof children === 'number') return String(children);

  throw new Error('Highlighted code accepts text only; pass the code as a string.');
}

/**
 * Syntax-highlighted `<code data-ndb-language>`. React never owns its children: the source is written as
 * textContent in a layout effect and then highlight.js decorates it through `window.newDebugBarHighlight`.
 * Use it for EVERY `data-ndb-language` element, because the shell highlights the whole bar after loads.
 * Props: language ('sql' | 'json' | 'php' | 'http'), source (string; text children are accepted too), className,
 * any other <code> attribute (ref is supported).
 */
export function HighlightedCode({ language, source, children, className, ref, ...rest }) {
  const element = useRef(null);
  const text = source === undefined ? textOf(children) : source === null ? '' : String(source);

  useLayoutEffect(() => {
    const code = element.current;
    if (!code) return;

    // Rewriting identical text would drop the highlight while the highlighter still treats it as current,
    // and a className change from React removes highlight.js classes: re-highlight in both cases.
    if (code.textContent !== text || !code.classList.contains('hljs')) {
      code.removeAttribute('data-highlighted');
      code.textContent = text;
    }

    window.newDebugBarHighlight?.(code.parentElement ?? code);
  }, [text, language, className]);

  const setRef = useCallback(
    (node) => {
      element.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  return <code data-ndb-language={language} {...rest} className={className} ref={setRef} />;
}

/**
 * Highlighted code panel (code-block.blade.php). Props: language, source (string; text children are accepted
 * too), wrap (default true; false keeps lines unwrapped), codeProps (attributes for the <code>, e.g.
 * data-ndb-query-explain-plan or hidden), className and other attributes for the <pre>.
 */
export function CodeBlock({ language, source, wrap = true, codeProps = {}, className, children, ...rest }) {
  return (
    <pre
      {...rest}
      className={cx(
        'ndb-code ndb-scrollbar ndb:m-0 ndb:min-w-0 ndb:overflow-x-auto ndb:rounded-lg ndb:bg-zinc-100 ndb:p-4 ndb:font-mono ndb:text-sm ndb:leading-6 ndb:text-zinc-700 ndb:dark:bg-zinc-950 ndb:dark:text-zinc-200',
        { 'ndb:whitespace-pre-wrap ndb:break-words': wrap, 'ndb:whitespace-pre': !wrap },
        className,
      )}
    >
      <HighlightedCode
        language={language}
        source={source === undefined ? textOf(children) : source}
        {...codeProps}
      />
    </pre>
  );
}
