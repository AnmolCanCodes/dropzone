export const WEAPONS = Object.freeze({
  pistol: Object.freeze({
    name: 'Pistol',
    damage: 20,
    fireIntervalSeconds: 0.25,
    magazineSize: 12,
    reloadSeconds: 1.5,
    bulletSpeed: 900,
    range: 700,
  }),
  rifle: Object.freeze({
    name: 'Rifle',
    damage: 14,
    fireIntervalSeconds: 0.1, // 10 shots/second
    magazineSize: 30,
    reloadSeconds: 2.2,
    bulletSpeed: 1100,
    range: 900,
  }),
});

export const DEFAULT_WEAPON = 'pistol';