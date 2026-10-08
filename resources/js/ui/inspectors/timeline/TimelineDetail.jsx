import { InspectorAction } from '../../components/InspectorAction.jsx';
import { InspectorDetailHeader } from '../../components/InspectorDetailHeader.jsx';
import { InspectorFact } from '../../components/InspectorFact.jsx';
import { InspectorFacts } from '../../components/InspectorFacts.jsx';
import { InspectorSourceFact } from '../../components/InspectorSourceFact.jsx';
import { InspectorSourceLink } from '../../components/InspectorSourceLink.jsx';

/** Timing and source evidence for the selected timeline activity. */
export function TimelineDetail({ item, onOpenInspector }) {
  return (
    <div data-ndb-timeline-detail-content="" className="ndb:flex ndb:flex-col">
      <InspectorDetailHeader
        layout="wrap"
        title={
          <div className="ndb:min-w-0">
            <p className="ndb:text-xs ndb:font-semibold ndb:uppercase ndb:tracking-wider ndb:text-zinc-400">
              {item.inspectorLabel}
            </p>
            <h3
              data-ndb-timeline-detail-label=""
              className="ndb:mt-0.5 ndb:break-words ndb:text-base ndb:font-bold ndb:leading-6"
            >
              {item.label}
            </h3>
          </div>
        }
        aside={
          <InspectorAction icon="external-link" data-ndb-timeline-open-inspector="" onClick={onOpenInspector}>
            Open inspector
          </InspectorAction>
        }
      />

      <div className="ndb:p-3 ndb:sm:p-4">
        <InspectorFacts columns={4}>
          <InspectorFact label="At" valueProps={{ className: 'ndb:font-semibold ndb:tabular-nums' }}>
            {item.atLabel}
          </InspectorFact>
          <InspectorFact label="Type" valueProps={{ className: 'ndb:font-semibold' }}>
            {item.kindLabel}
          </InspectorFact>
          <InspectorFact label="Started" valueProps={{ className: 'ndb:font-semibold ndb:tabular-nums' }}>
            {item.startLabel ?? 'Not a duration'}
          </InspectorFact>
          <InspectorFact label="Duration" valueProps={{ className: 'ndb:font-semibold ndb:tabular-nums' }}>
            {item.durationLabel ?? 'Point event'}
          </InspectorFact>
        </InspectorFacts>

        <InspectorSourceFact label="Source" className="ndb:mt-3 ndb:sm:mt-4">
          {item.source ? (
            <InspectorSourceLink copy={item.source} title={item.source}>
              {item.source}
            </InspectorSourceLink>
          ) : (
            <span>Not captured for this activity.</span>
          )}
        </InspectorSourceFact>
      </div>
    </div>
  );
}
