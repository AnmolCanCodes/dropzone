import { ISLAND } from '../rules.js';
import { randomPointInCircle, round2 } from '../physics/geometry.js';

const EPSILON = 1e-9;

// Each phase: wait, then shrink to the target radius. Damage applies outside the *current* circle.
export const ZONE_PHASES = Object.freeze([
  { holdSeconds: 20, shrinkSeconds: 20, targetRadius: 1000, damagePerSecond: 2 },
  { holdSeconds: 15, shrinkSeconds: 15, targetRadius: 600, damagePerSecond: 4 },
  { holdSeconds: 10, shrinkSeconds: 15, targetRadius: 300, damagePerSecond: 8 },
  { holdSeconds: 10, shrinkSeconds: 15, targetRadius: 80, damagePerSecond: 15 },
]);

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function startPhase(zone, index) {
  const phase = ZONE_PHASES[index];
  // The next circle must fit inside the current one, so its centre can move at most (R - r)
  const target = randomPointInCircle(zone.x, zone.y, Math.max(0, zone.radius - phase.targetRadius));

  zone.phaseIndex = index;
  zone.stage = 'hold';
  zone.timer = phase.holdSeconds;
  zone.from = { x: zone.x, y: zone.y, radius: zone.radius };
  zone.to = { x: target.x, y: target.y, radius: phase.targetRadius };
}

export function createZone() {
  const zone = { x: ISLAND.x, y: ISLAND.y, radius: ISLAND.radius, finished: false };
  startPhase(zone, 0);
  return zone;
}

export function updateZone(zone, dt) {
  if (zone.finished) return;

  const phase = ZONE_PHASES[zone.phaseIndex];
  zone.timer -= dt;

  if (zone.stage === 'hold') {
    if (zone.timer <= EPSILON) {
      zone.stage = 'shrink';
      zone.timer = phase.shrinkSeconds;
    }
    return;
  }

  const progress = 1 - Math.max(0, zone.timer) / phase.shrinkSeconds;
  zone.x = lerp(zone.from.x, zone.to.x, progress);
  zone.y = lerp(zone.from.y, zone.to.y, progress);
  zone.radius = lerp(zone.from.radius, zone.to.radius, progress);

  if (zone.timer <= EPSILON) {
    zone.x = zone.to.x;
    zone.y = zone.to.y;
    zone.radius = zone.to.radius;

    if (zone.phaseIndex + 1 < ZONE_PHASES.length) startPhase(zone, zone.phaseIndex + 1);
    else zone.finished = true;
  }
}

export function isOutsideZone(zone, x, y) {
  return (x - zone.x) ** 2 + (y - zone.y) ** 2 > zone.radius ** 2;
}

export function getZoneDamagePerSecond(zone) {
  return ZONE_PHASES[zone.phaseIndex].damagePerSecond;
}

export function getZoneSnapshot(zone) {
  return {
    x: round2(zone.x),
    y: round2(zone.y),
    radius: round2(zone.radius),
    targetX: round2(zone.to.x),
    targetY: round2(zone.to.y),
    targetRadius: round2(zone.to.radius),
    stage: zone.stage,
    timer: Math.ceil(Math.max(0, zone.timer)),
    phase: zone.phaseIndex + 1,
    phases: ZONE_PHASES.length,
    damagePerSecond: getZoneDamagePerSecond(zone),
    finished: zone.finished,
  };
}