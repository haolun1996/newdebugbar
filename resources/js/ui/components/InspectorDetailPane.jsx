import { cx } from '../../app/hooks.js';
import { InspectorDetailBack } from './InspectorDetailBack.jsx';

/**
 * Right-hand detail pane of a split workspace (inspector-detail-pane.blade.php). Props: detailOpen (boolean; on
 * small screens the pane shows only while open), detailRef (ref or callback ref for the <section>, the old x-ref),
 * detailLabel (aria-label), backLabel + onClose (default back button), back (node replacing the default back
 * button), className, children, other <section> attributes (id, data-ndb-*).
 */
export function InspectorDetailPane({
  detailOpen,
  detailRef,
  detailLabel,
  backLabel,
  onClose,
  back,
  className,
  children,
  ...rest
}) {
  return (
    <section
      ref={detailRef}
      aria-live="polite"
      aria-label={detailLabel}
      tabIndex={0}
      {...rest}
      className={cx(
        'ndb-scrollbar ndb:@container ndb:min-h-[32rem] ndb:min-w-0 ndb:flex-col ndb:border-0 ndb:scroll-mt-20 ndb:text-sm ndb:focus-visible:outline-2 ndb:focus-visible:outline-indigo-500 ndb:lg:min-h-0 ndb:lg:overflow-y-auto',
        className,
        detailOpen ? 'ndb:flex' : 'ndb:hidden ndb:lg:flex',
      )}
    >
      {back !== undefined ? back : <InspectorDetailBack onClick={onClose} label={backLabel} />}

      {children}
    </section>
  );
}
