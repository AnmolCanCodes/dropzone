export function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Uniformly random point inside a circle (sqrt keeps points from clustering at the centre). */
export function randomPointInCircle(cx, cy, radius) {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}