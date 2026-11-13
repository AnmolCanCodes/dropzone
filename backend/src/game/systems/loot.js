import { GAME_CONFIG } from '@dropzone/shared/constants';
import { WEAPONS } from '../weapons/definitions.js';
import { createWeaponState } from './combat.js';
import { randomPointInCircle, round2 } from '../physics/geometry.js';
import { ISLAND, RULES } from '../rules.js';

const { PLAYER_MAX_HEALTH } = GAME_CONFIG;

export const LOOT_TYPE = Object.freeze({ MEDKIT: 'medkit', RIFLE: 'rifle' });

const PICKUP_RADIUS = 60;
const MEDKIT_HEAL = 40;
const LOOT_COUNTS = Object.freeze({ [LOOT_TYPE.MEDKIT]: 24, [LOOT_TYPE.RIFLE]: 10 });

/** nextId is a function that returns a fresh id each call. */
export function spawnLoot(nextId) {
  const items = [];
  for (const [type, count] of Object.entries(LOOT_COUNTS)) {
    for (let i = 0; i < count; i++) {
      const { x, y } = randomPointInCircle(ISLAND.x, ISLAND.y, ISLAND.radius - RULES.LOOT_INSET);
      items.push({ id: nextId(), type, x: round2(x), y: round2(y) });
    }
  }
  return items;
}

/** Pickup validation: would taking this item actually do something for this player? */
function canPickUp(player, item) {
  if (item.type === LOOT_TYPE.MEDKIT) {
    return player.health < PLAYER_MAX_HEALTH;
  }
  if (item.type === LOOT_TYPE.RIFLE) {
    return player.weapon.weaponId !== 'rifle' || player.weapon.ammo < WEAPONS.rifle.magazineSize;
  }
  return false;
}

/** Nearest item within reach that this player is allowed to take, or null. */
export function findPickupTarget(player, loot) {
  let best = null;
  let bestDistSq = PICKUP_RADIUS ** 2;

  for (const item of loot) {
    const distSq = (item.x - player.x) ** 2 + (item.y - player.y) ** 2;
    if (distSq <= bestDistSq && canPickUp(player, item)) {
      best = item;
      bestDistSq = distSq;
    }
  }
  return best;
}

export function applyPickup(player, item) {
  if (item.type === LOOT_TYPE.MEDKIT) {
    player.health = Math.min(PLAYER_MAX_HEALTH, player.health + MEDKIT_HEAL);
  } else if (item.type === LOOT_TYPE.RIFLE) {
    player.weapon = createWeaponState('rifle');
  }
}