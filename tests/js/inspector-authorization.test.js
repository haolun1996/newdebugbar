import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authorizationDecision,
  authorizationDecisions,
  authorizationFilters,
  prettyJson,
  reconcileAuthorizationSelection,
  shortType,
  visibleAuthorizationDecisions,
} from '../../resources/js/inspectors/authorization.js';

const policyDecision = {
  execution: 7,
  result: 'allowed',
  ability: 'revise-itinerary',
  result_message: 'The planner owns this trip.',
  result_code: 'trip_owner',
  handler: 'App\\Policies\\TripPolicy@reviseItinerary',
  handler_kind: 'policy',
  handler_name: 'App\\Policies\\TripPolicy@reviseItinerary',
  handler_source: { file: 'app/Policies/TripPolicy.php', line: 27 },
  user: { type: 'App\\Models\\User', identifier_name: 'id', identifier: 42, name: 'Mara Voss' },
  arguments: [
    {
      position: 1,
      kind: 'model',
      type: 'App\\Models\\Trip',
      identifier: 9,
      route_key_name: 'slug',
      route_key: 'kyoto-autumn',
      name: 'Kyoto in autumn',
    },
    { position: 2, kind: 'value', type: 'string', value: 'lodging' },
    { position: 3, kind: 'value', type: 'int', value: 3 },
  ],
  callsite: { file: 'app/Actions/Trips/RefreshTripWorkspace.php', line: 41 },
  stack: [{ file: 'app/Actions/Trips/RefreshTripWorkspace.php', line: 41, function: 'Gate::allows' }],
};

const guestDecision = {
  execution: 8,
  result: 'denied',
  ability: 'access-private-planning-notes',
  result_message: 'Guests cannot open private notes.',
  handler: 'callback',
  handler_kind: 'callback',
  handler_name: 'Gate callback',
  user: null,
  arguments: [],
  callsite: { file: 'app/Providers/AuthServiceProvider.php', line: 31 },
};

test('decisions are presented for scanning with structured evidence', () => {
  const [policy, guest] = authorizationDecisions({
    items: [policyDecision, guestDecision, 'not a decision'],
  });

  assert.equal(policy.execution, 7);
  assert.equal(policy.result, 'allowed');
  assert.equal(policy.result_label, 'Allowed');
  assert.equal(policy.user_label, 'Mara Voss');
  assert.equal(policy.user_type, 'App\\Models\\User');
  assert.equal(policy.user_identifier_name, 'id');
  assert.equal(policy.user_identifier, 42);
  assert.equal(policy.argument_summary, 'Kyoto in autumn and 2 more');
  assert.deepEqual(
    policy.arguments.map((argument) => argument.role_label),
    ['Resource', 'Additional context 1', 'Additional context 2'],
  );
  assert.deepEqual(
    policy.arguments.map((argument) => [argument.label, argument.identity_label]),
    [
      ['Kyoto in autumn', 'slug kyoto-autumn'],
      ['lodging', 'Value lodging'],
      ['3', 'Value 3'],
    ],
  );
  assert.equal(policy.handler_label, 'Matched policy method');
  assert.equal(policy.handler_available, true);
  assert.equal(policy.handler_source_label, 'app/Policies/TripPolicy.php:27');
  assert.equal(policy.callsite_label, 'app/Actions/Trips/RefreshTripWorkspace.php:41');
  assert.equal(policy.result_message, 'The planner owns this trip.');
  assert.equal(policy.result_code, 'trip_owner');
  assert.equal(policy.result_status, null);
  assert.equal(Object.hasOwn(policy, 'check_next'), false);
  assert.match(policy.search, /revise-itinerary allowed mara voss/);

  const evidence = JSON.parse(policy.copy_evidence);
  assert.deepEqual(Object.keys(evidence), [
    'result',
    'ability',
    'user',
    'arguments',
    'authorization_logic',
    'authorization_response',
    'stack',
  ]);
  assert.equal(evidence.user.name, 'Mara Voss');
  assert.deepEqual(evidence.authorization_logic, {
    kind: 'policy',
    name: 'App\\Policies\\TripPolicy@reviseItinerary',
    source: { file: 'app/Policies/TripPolicy.php', line: 27 },
  });
  assert.equal(Object.hasOwn(evidence, 'actor'), false);
  assert.equal(Object.hasOwn(evidence, 'checked_from'), false, 'the stack already shows the call site');
  assert.match(policy.copy_evidence, /^\{\n {4}"result": "allowed",/);
  assert.match(policy.copy_evidence, /"file": "app\/Policies\/TripPolicy.php"/);

  assert.equal(guest.result, 'denied');
  assert.equal(guest.result_label, 'Denied');
  assert.equal(guest.user_label, 'Guest');
  assert.equal(guest.user_type, null);
  assert.deepEqual(guest.arguments, []);
  assert.equal(guest.argument_summary, '—');
  assert.equal(guest.handler_available, false);
  assert.equal(guest.handler_label, 'Authorization logic');
  assert.equal(Object.hasOwn(guest, 'check_next'), false);
  assert.deepEqual(JSON.parse(guest.copy_evidence).checked_from, guestDecision.callsite);
});

test('named callbacks keep specific evidence without inventing optional evidence', () => {
  const decision = authorizationDecision(
    {
      execution: 9,
      result: 'allowed',
      ability: 'view-public-trip-outline',
      handler: 'callback',
      handler_kind: 'callback',
      handler_name: 'App\\Gates\\PublicTripGate@view',
      user: null,
      arguments: [],
    },
    0,
  );

  assert.equal(decision.user_label, 'Guest');
  assert.equal(decision.argument_summary, '—');
  assert.equal(decision.callsite_label, null);
  assert.equal(decision.handler_label, 'Matched Gate callback');
  assert.equal(decision.result_message, null);
  assert.equal(decision.result_code, null);
  assert.equal(decision.result_status, null);
  assert.equal(Object.hasOwn(decision, 'check_next'), false);
});

test('legacy and partial captures fall back to readable evidence', () => {
  const decision = authorizationDecision(
    {
      ability: '',
      result: 'maybe',
      handler: 'App\\Policies\\TripPolicy@view',
      user: { type: 'App\\Models\\User', identifier: 5 },
      argument_types: ['App\\Models\\Trip', '', 4],
      callsite: { copy: 'routes/web.php:12' },
      result_code: 403,
      result_status: '403',
      stack: [{ file: 'routes/web.php', line: 12 }, { line: 4 }, 'frame'],
    },
    2,
  );

  assert.equal(decision.execution, 3);
  assert.equal(decision.ability, 'Ability unavailable');
  assert.equal(decision.result, 'denied');
  assert.equal(decision.user_label, 'User 5');
  assert.equal(decision.handler_kind, 'policy');
  assert.equal(decision.handler_name, 'App\\Policies\\TripPolicy@view');
  assert.equal(decision.handler_label, 'Matched policy method');
  assert.deepEqual(decision.arguments, [
    {
      position: 1,
      role_label: 'Resource',
      kind: 'object',
      type: 'App\\Models\\Trip',
      label: 'Trip',
      identity_label: null,
    },
  ]);
  assert.equal(decision.argument_summary, 'Trip');
  assert.equal(decision.callsite_label, 'routes/web.php:12');
  assert.equal(decision.result_code, '403');
  assert.equal(decision.result_status, 403);
  assert.equal(decision.stack.length, 1);
  assert.deepEqual(JSON.parse(decision.copy_evidence).arguments, ['App\\Models\\Trip', '', 4]);

  const anonymous = authorizationDecision(
    {
      user: { type: 'App\\Models\\Admin' },
      handler_kind: 'callback',
      handler_source: { file: 'app/Providers/AuthServiceProvider.php' },
      arguments: {
        first: { type: 'App\\Models\\Trip', identifier: 2 },
        second: { value: { nested: true } },
        third: { value: false, position: 'x' },
        fourth: { value: null },
        fifth: { kind: 'enum' },
      },
      result_status: 'not numeric',
      result_code: true,
    },
    0,
  );

  assert.equal(anonymous.user_label, 'Admin');
  assert.equal(anonymous.handler_name, 'Gate callback');
  assert.equal(anonymous.handler_available, true);
  assert.equal(anonymous.handler_label, 'Matched Gate callback');
  assert.equal(anonymous.handler_source_label, 'app/Providers/AuthServiceProvider.php:?');
  assert.equal(anonymous.result_status, null);
  assert.equal(anonymous.result_code, '1');
  assert.deepEqual(
    anonymous.arguments.map((argument) => [
      argument.role_label,
      argument.kind,
      argument.label,
      argument.identity_label,
    ]),
    [
      ['Argument 1', 'value', 'Trip 2', 'Identifier 2'],
      ['Argument 2', 'value', '{"nested":true}', 'Value {"nested":true}'],
      ['Argument 1', 'value', 'false', 'Value false'],
      ['Argument 4', 'value', 'null', 'Value null'],
      ['Argument 5', 'enum', 'unknown', null],
    ],
  );
  assert.equal(anonymous.argument_summary, 'Trip 2 and 4 more');
  assert.deepEqual(authorizationDecisions(null), []);
  assert.deepEqual(authorizationDecisions({ items: { first: policyDecision } }).length, 1);
});

test('filters, search, and selection follow the visible decisions', () => {
  const decisions = authorizationDecisions({ items: [policyDecision, guestDecision] });

  assert.deepEqual(authorizationFilters(decisions), [
    { value: 'all', label: 'All', count: 2 },
    { value: 'denied', label: 'Denied', count: 1 },
    { value: 'allowed', label: 'Allowed', count: 1 },
  ]);
  assert.deepEqual(
    visibleAuthorizationDecisions(decisions, 'denied', '').map((decision) => decision.execution),
    [8],
  );
  assert.deepEqual(
    visibleAuthorizationDecisions(decisions, 'all', '  KYOTO ').map((decision) => decision.execution),
    [7],
  );
  assert.deepEqual(visibleAuthorizationDecisions(decisions, 'allowed', 'guest'), []);
  assert.equal(visibleAuthorizationDecisions(decisions, 'all', null).length, 2);

  const denied = visibleAuthorizationDecisions(decisions, 'denied', '');
  assert.deepEqual(reconcileAuthorizationSelection(denied, 8, true), { selected: 8, detailOpen: true });
  assert.deepEqual(reconcileAuthorizationSelection(denied, 7, true), { selected: 8, detailOpen: true });
  assert.deepEqual(reconcileAuthorizationSelection([], 7, true), { selected: null, detailOpen: false });
});

test('PHP helpers match class_basename and pretty JSON encoding', () => {
  assert.equal(shortType('App\\Models\\User'), 'User');
  assert.equal(shortType('User'), 'User');
  assert.equal(
    prettyJson({ path: '/trips', name: 'Kyōto', items: [] }),
    '{\n    "path": "/trips",\n    "name": "Kyōto",\n    "items": []\n}',
  );
  assert.equal(prettyJson(undefined), 'null');
});
