import { GAME_CONFIG } from '@dropzone/shared/constants';

const { WORLD_WIDTH, WORLD_HEIGHT } = GAME_CONFIG;

export const RULES = Object.freeze({
  MIN_PLAYERS_TO_START: 2,
  COUNTDOWN_SECONDS: 5,
  RESULT_SECONDS: 8,
  SPAWN_INSET: 150, // keep spawns this far inside the island edge
  LOOT_INSET: 100,
});

// The playable island is the circle inscribed in the world. The first zone matches it.
export const ISLAND = Object.freeze({
  x: WORLD_WIDTH / 2,
  y: WORLD_HEIGHT / 2,
  radius: Math.min(WORLD_WIDTH, WORLD_HEIGHT) / 2,
});