import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countPhrase,
  defaultEventSelection,
  defaultEventSource,
  eventListenerActivity,
  eventOrigin,
  eventSequence,
  eventSummaryText,
  filterEvents,
  sourceLabel,
} from '../../resources/js/inspectors/events.js';

const groups = [
  { id: 1, source: 'framework', search: 'illuminate\\routing', occurrence_count: 3 },
  { id: 2, source: 'application', search: 'app\\events\\tripbooked', occurrence_count: 1 },
  { id: 3, source: 'application', search: 'app\\events\\itineraryrecalculation', occurrence_count: 8 },
];

test('events default to application evidence and filter by source and search', () => {
  assert.equal(defaultEventSource(groups), 'application');
  assert.equal(defaultEventSource([groups[0]]), 'all');
  assert.equal(defaultEventSource(), 'all');
  assert.equal(defaultEventSelection(groups), 2);
  assert.equal(defaultEventSelection([groups[0]]), 1);
  assert.equal(defaultEventSelection([]), null);

  const ids = (options) => filterEvents(groups, options).visible.map((event) => event.id);
  assert.deepEqual(ids(), [1, 2, 3]);
  assert.deepEqual(ids({ source: 'application' }), [2, 3]);
  assert.equal(filterEvents(groups, { source: 'application' }).dispatches, 9);
  assert.deepEqual(ids({ source: 'framework' }), [1]);
  assert.deepEqual(ids({ source: 'invalid' }), [1, 2, 3]);
  assert.deepEqual(ids({ search: ' ItineraryRecalculation ' }), [3]);
  assert.deepEqual(filterEvents(groups, { source: 'framework', search: 'trip' }), {
    visible: [],
    dispatches: 0,
  });
  assert.equal(filterEvents([{ source: 'application' }]).dispatches, 0);
});

test('event summaries and labels read like the Blade inspector', () => {
  assert.equal(eventSummaryText(0, 0), 'No events');
  assert.equal(eventSummaryText(1, 1), '1 event');
  assert.equal(eventSummaryText(4, 12), '4 events, 12 dispatches');

  assert.equal(eventListenerActivity({ listener_count: 0 }), 'No listeners');
  assert.equal(
    eventListenerActivity({ listener_count: 3, completed_listener_count: 1200, queued_listener_count: 2 }),
    '1,200 completed, 2 queued',
  );
  assert.equal(eventListenerActivity({ listener_count: 1, queued_listener_count: 1 }), '1 queued');
  assert.equal(eventListenerActivity({ listener_count: 1, completed_listener_count: 1 }), '1 completed');

  assert.equal(eventOrigin({ source: 'framework', broadcast: true }), 'Framework');
  assert.equal(eventOrigin({ source: 'application' }), 'Application');
  assert.equal(eventOrigin({ source: 'application', broadcast: true }), 'Application broadcast');
  assert.equal(eventSequence({ first_sequence: 4, last_sequence: 4 }), '#4');
  assert.equal(eventSequence({ first_sequence: 4, last_sequence: 9 }), '#4–9');
  assert.equal(countPhrase(1, ' registration', ' registrations'), '1 registration');
  assert.equal(countPhrase(2, ' registration', ' registrations'), '2 registrations');
  assert.equal(sourceLabel({ file: 'app/Listeners/Notify.php', line: 12 }), 'app/Listeners/Notify.php:12');
  assert.equal(sourceLabel(null), '');
});
