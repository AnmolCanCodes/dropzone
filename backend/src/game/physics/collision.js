function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Does the segment (x0,y0)→(x1,y1) touch the circle?
 * Returns t in [0,1] (how far along the segment the closest point is), or null for a miss.
 * Testing the whole segment, not just the end point, stops fast bullets tunnelling through players.
 */
export function segmentCircleHit(x0, y0, x1, y1, cx, cy, radius) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lengthSq = dx * dx + dy * dy;

  const t = lengthSq === 0 ? 0 : clamp(((cx - x0) * dx + (cy - y0) * dy) / lengthSq, 0, 1);

  const closestX = x0 + dx * t;
  const closestY = y0 + dy * t;
  const distSq = (cx - closestX) ** 2 + (cy - closestY) ** 2;

  return distSq <= radius * radius ? t : null;
}