import assert from 'node:assert/strict';
import test from 'node:test';

import { anchorPosition } from '../../resources/js/inspectors/livewire/anchor.js';
import { createTraceHelp } from '../../resources/js/inspectors/livewire/trace-help.js';

const trigger = (focused = false) => ({ matches: (selector) => selector === ':focus-visible' && focused });

test('keeps one phase explanation open across hover, keyboard focus, and touch', async () => {
  const help = createTraceHelp();
  const first = trigger();

  help.showPhaseHelp(0, first);
  assert.equal(help.phaseHelpIndex, 0);
  assert.equal(help.phaseHelpTrigger, first);
  assert.equal(help.phaseHelpPinned, false);

  // Leaving the trigger closes the explanation after a short grace period unless the pointer reaches it.
  help.leavePhaseHelp();
  help.holdPhaseHelp();
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(help.phaseHelpIndex, 0);

  help.leavePhaseHelp();
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(help.phaseHelpIndex, null);

  // A click pins the explanation; a second click on the same step closes it.
  help.togglePhaseHelp(1, first);
  assert.equal(help.phaseHelpPinned, true);
  help.leavePhaseHelp();
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(help.phaseHelpIndex, 1);
  help.togglePhaseHelp(1, first);
  assert.equal(help.phaseHelpIndex, null);
  assert.equal(help.phaseHelpTrigger, null);

  // Moving to another step unpins the previous one, and keyboard focus keeps it open.
  help.togglePhaseHelp(1, first);
  help.showPhaseHelp(2, trigger(true));
  assert.equal(help.phaseHelpPinned, false);
  help.leavePhaseHelp();
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(help.phaseHelpIndex, 2);

  help.leavePhaseHelp();
  help.destroy();
  help.closePhaseHelp();
  assert.equal(help.phaseHelpIndex, null);
});

test('anchors a popover below its trigger, flips above, and keeps it inside the viewport', () => {
  const viewport = { width: 400, height: 800 };
  const reference = { left: 100, right: 140, top: 200, bottom: 230 };

  assert.deepEqual(anchorPosition(reference, { width: 200, height: 100 }, viewport), { x: 100, y: 230 });
  assert.deepEqual(anchorPosition(reference, { width: 200, height: 100 }, viewport, 'bottom-end'), {
    x: 5,
    y: 230,
  });
  assert.deepEqual(
    anchorPosition({ ...reference, left: 300, right: 340 }, { width: 200, height: 100 }, viewport),
    {
      x: 195,
      y: 230,
    },
  );

  const low = { left: 100, right: 140, top: 720, bottom: 750 };
  assert.deepEqual(anchorPosition(low, { width: 200, height: 100 }, viewport), { x: 100, y: 620 });

  // When neither side fits, the side with less overflow wins.
  const tall = { width: 200, height: 790 };
  assert.equal(anchorPosition({ ...reference, top: 300, bottom: 330 }, tall, viewport).y, 330);
  assert.equal(anchorPosition(low, tall, viewport).y, -70);
});
