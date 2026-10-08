import assert from 'node:assert/strict';
import test from 'node:test';

import {
  exceptionCauses,
  exceptionSourceText,
  exceptionTabs,
  filled,
  profileActionLabel,
} from '../../resources/js/ui/inspectors/exceptions/exception-view.js';
import { countLabel, plural } from '../../resources/js/ui/inspectors/count-label.js';
import { fallbackItemLabel, prettyJson } from '../../resources/js/ui/inspectors/fallback-view.js';

test('names the current profile truthfully for the context action', () => {
  assert.equal(profileActionLabel('http'), 'Open request');
  assert.equal(profileActionLabel(undefined), 'Open request');
  assert.equal(profileActionLabel('queue'), 'Open worker');
  assert.equal(profileActionLabel('artisan'), 'Open command');
  assert.equal(profileActionLabel('test'), 'Open test run');
  assert.equal(profileActionLabel('runtime'), 'Open runtime');
});

test('aligns source line numbers with figure spaces and marks the failing line', () => {
  assert.equal(exceptionSourceText([]), null);
  assert.equal(exceptionSourceText(null), null);
  assert.equal(
    exceptionSourceText([
      { number: 9, focus: false, code: '$a = 1;' },
      { number: 10, focus: true, code: 'throw $e;' },
    ]),
    ' 9  $a = 1;\n10> throw $e;',
  );
});

test('keeps array causes only and offers a causes tab when any remain', () => {
  const causes = exceptionCauses({ causes: [{ class: 'LogicException' }, 'bad', null, ['list']] });

  assert.deepEqual(causes, [{ class: 'LogicException' }]);
  assert.deepEqual(exceptionCauses({}), []);
  assert.deepEqual(exceptionCauses(null), []);
  assert.deepEqual(
    exceptionTabs(causes).map(([key]) => key),
    ['source', 'stack', 'causes'],
  );
  assert.deepEqual(
    exceptionTabs([]).map(([key]) => key),
    ['source', 'stack'],
  );
  assert.equal(filled('  '), false);
  assert.equal(filled(null), false);
  assert.equal(filled(undefined), false);
  assert.equal(filled('Underlying failure.'), true);
  assert.equal(filled(0), true);
});

test('pluralizes counted nouns like Laravel', () => {
  assert.equal(plural('query', 1), 'query');
  assert.equal(plural('query', 2), 'queries');
  assert.equal(plural('entry', 0), 'entries');
  assert.equal(plural('day', 2), 'days');
  assert.equal(plural('validation attempt', 3), 'validation attempts');
  assert.equal(countLabel(1234, 'exception'), '1,234 exceptions');
  assert.equal(countLabel(1, 'frame'), '1 frame');
});

test('labels fallback items by their first identifying field', () => {
  assert.equal(fallbackItemLabel({ name: 'cache.hit', level: 'info' }, 'Things'), 'cache.hit');
  assert.equal(fallbackItemLabel({ model: null, event: 'Saved' }, 'Things'), 'Saved');
  assert.equal(fallbackItemLabel({ operation: { kind: 'get' } }, 'Things'), '{"kind":"get"}');
  assert.equal(fallbackItemLabel({}, 'Things'), 'Things');
  assert.equal(fallbackItemLabel(null, 'Things'), 'Things');
});

test('pretty prints JSON like PHP with unescaped slashes and escaped Unicode', () => {
  assert.equal(
    prettyJson({ path: '/trips', city: 'Kyōto' }),
    '{\n    "path": "/trips",\n    "city": "Ky\\u014dto"\n}',
  );
  assert.equal(prettyJson([]), '[]');
  assert.equal(prettyJson(undefined), 'null');
});
