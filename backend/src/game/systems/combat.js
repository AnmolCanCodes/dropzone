import { GAME_CONFIG } from '@dropzone/shared/constants';
import { WEAPONS } from '../weapons/definitions.js';
import { segmentCircleHit } from '../physics/collision.js';

const { WORLD_WIDTH, WORLD_HEIGHT, PLAYER_RADIUS, BULLET_RADIUS } = GAME_CONFIG;

// Timers count down in floating point, so compare with a tiny tolerance instead of exactly 0
const EPSILON = 1e-9;

export function createWeaponState(weaponId) {
  return {
    weaponId,
    ammo: WEAPONS[weaponId].magazineSize,
    fireCooldown: 0,      // seconds until the next shot is allowed
    reloadRemaining: 0,   // seconds until the reload finishes (0 = not reloading)
  };
}

/**
 * Advances one player's weapon by dt seconds.
 * Returns a projectile description if the player fired this tick, otherwise null.
 */
export function updateWeapon(player, dt) {
  const weapon = player.weapon;
  const def = WEAPONS[weapon.weaponId];
  const { fire, reload } = player.input;

  weapon.fireCooldown = Math.max(0, weapon.fireCooldown - dt);

  // Reloading: no shooting until it completes
  if (weapon.reloadRemaining > 0) {
    weapon.reloadRemaining -= dt;
    if (weapon.reloadRemaining <= EPSILON) {
      weapon.reloadRemaining = 0;
      weapon.ammo = def.magazineSize;
    }
    return null;
  }

  // Start a reload: manual (R) with a non-full magazine, or automatic when empty
  if (weapon.ammo === 0 || (reload && weapon.ammo < def.magazineSize)) {
    weapon.reloadRemaining = def.reloadSeconds;
    return null;
  }

  if (fire && weapon.fireCooldown <= EPSILON) {
    weapon.ammo -= 1;
    weapon.fireCooldown = def.fireIntervalSeconds;

    return {
      ownerId: player.id,
      x: player.x,
      y: player.y,
      dirX: Math.cos(player.aimAngle),
      dirY: Math.sin(player.aimAngle),
      speed: def.bulletSpeed,
      damage: def.damage,
      remainingRange: def.range,
    };
  }

  return null;
}

/**
 * Moves one projectile and checks what it hit along the way.
 * Returns { done, victim }: done = remove the projectile, victim = player hit (or null).
 */
export function stepProjectile(projectile, dt, players) {
  const distance = projectile.speed * dt;
  const x0 = projectile.x;
  const y0 = projectile.y;
  const x1 = x0 + projectile.dirX * distance;
  const y1 = y0 + projectile.dirY * distance;

  let victim = null;
  let nearestT = Infinity;

  for (const player of players.values()) {
    if (!player.alive || player.id === projectile.ownerId) continue;

    const t = segmentCircleHit(x0, y0, x1, y1, player.x, player.y, PLAYER_RADIUS + BULLET_RADIUS);
    if (t !== null && t < nearestT) {
      nearestT = t;
      victim = player;
    }
  }

  if (victim) return { done: true, victim };

  projectile.x = x1;
  projectile.y = y1;
  projectile.remainingRange -= distance;

  const outOfWorld = x1 < 0 || x1 > WORLD_WIDTH || y1 < 0 || y1 > WORLD_HEIGHT;
  return { done: projectile.remainingRange <= 0 || outOfWorld, victim: null };
}