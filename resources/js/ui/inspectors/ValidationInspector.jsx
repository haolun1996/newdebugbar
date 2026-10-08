import { EmptyState } from '../components/EmptyState.jsx';
import { InspectorListControls } from '../components/InspectorListControls.jsx';
import { InspectorWorkspace } from '../components/InspectorWorkspace.jsx';
import { countLabel } from './count-label.js';
import { ValidationEntry } from './validation/ValidationEntry.jsx';

/** Renders validation failures with their messages, rules, and application source. */
export function ValidationInspector({ inspector }) {
  const items = Object.values(inspector.payload?.items ?? {});

  if (items.length === 0) {
    return <EmptyState label="No validation failures were captured. This does not prove validation ran." />;
  }

  return (
    <div className="ndb:flex ndb:min-h-0 ndb:flex-1 ndb:flex-col">
      <InspectorWorkspace
        mode="stream"
        frame="top"
        data-ndb-validation-workspace=""
        controls={
          <InspectorListControls
            showSearch={false}
            leading={
              <p className="ndb:text-xs ndb:font-semibold ndb:text-zinc-600 ndb:dark:text-zinc-300">
                {countLabel(items.length, 'validation attempt')}
              </p>
            }
          />
        }
        body={items.map((item, index) => (
          <ValidationEntry key={index} item={item} index={index} />
        ))}
        bodyProps={{
          'data-ndb-validation-list': '',
          className: 'ndb:divide-y ndb:divide-zinc-200/90 ndb:dark:divide-zinc-800',
        }}
      />
    </div>
  );
}
