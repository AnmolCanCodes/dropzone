import test from 'node:test';
import assert from 'node:assert/strict';
import { createZone, updateZone, isOutsideZone, ZONE_PHASES } from '../src/game/systems/zone.js';

const DT = 0.05;

test('every zone fits inside the previous one and the final radius is reached', () => {
  const zone = createZone();
  let previous = { x: zone.x, y: zone.y, radius: zone.radius };
  let phaseIndex = zone.phaseIndex;

  for (let i = 0; i < 20000 && !zone.finished; i++) {
    updateZone(zone, DT);

    if (zone.phaseIndex !== phaseIndex || zone.finished) {
      const centreShift = Math.hypot(zone.x - previous.x, zone.y - previous.y);
      assert.ok(centreShift + zone.radius <= previous.radius + 1e-6, 'new circle must fit in old one');
      previous = { x: zone.x, y: zone.y, radius: zone.radius };
      phaseIndex = zone.phaseIndex;
    }
  }

  assert.equal(zone.finished, true);
  assert.ok(Math.abs(zone.radius - ZONE_PHASES.at(-1).targetRadius) < 1e-9);
});

test('isOutsideZone uses the circle, not the bounding box', () => {
  const zone = { x: 100, y: 100, radius: 50 };
  assert.equal(isOutsideZone(zone, 100, 100), false);
  assert.equal(isOutsideZone(zone, 145, 100), false);
  assert.equal(isOutsideZone(zone, 140, 140), true); // inside the box, outside the circle
});