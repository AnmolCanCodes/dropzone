export const WEAPONS = Object.freeze({
  pistol: Object.freeze({
    name: 'Pistol',
    damage: 20,
    fireIntervalSeconds: 0.25, // 4 shots/second
    magazineSize: 12,
    reloadSeconds: 1.5,
    bulletSpeed: 900,          // pixels per second
    range: 700,                // pixels before the bullet disappears
  }),
});

export const DEFAULT_WEAPON = 'pistol';